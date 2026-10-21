import { createRequire } from "node:module";
import { parseSvgText } from "./parser.js";
import type { IconData } from "./types.js";

export interface IconifyJsonIcon {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export interface IconifyJsonCollection {
  prefix: string;
  icons: Record<string, IconifyJsonIcon>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
}

const offlineCollectionCache = new Map<string, IconifyJsonCollection | null>();
const offlineIconCache = new Map<string, IconData | null>();
const MAX_OFFLINE_ICON_CACHE = 1000;
function setBoundedIconCache(key: string, value: IconData | null) {
  if (offlineIconCache.size >= MAX_OFFLINE_ICON_CACHE) {
    const first = offlineIconCache.keys().next().value;
    if (first) offlineIconCache.delete(first);
  }
  offlineIconCache.set(key, value);
}

export function registerOfflineCollection(prefix: string, data: IconifyJsonCollection): void {
  const normPrefix = prefix.toLowerCase();
  offlineCollectionCache.set(normPrefix, data);
  const prefixMatch = `${normPrefix}:`;
  for (const key of offlineIconCache.keys()) {
    if (key.startsWith(prefixMatch)) {
      offlineIconCache.delete(key);
    }
  }
}

export function clearOfflineCollectionCache(): void {
  offlineCollectionCache.clear();
  offlineIconCache.clear();
}

function resolveCollectionFromPackage(prefix: string): IconifyJsonCollection | null {
  const normalizedPrefix = prefix.toLowerCase();
  if (offlineCollectionCache.has(normalizedPrefix)) {
    return offlineCollectionCache.get(normalizedPrefix) ?? null;
  }

  // Only attempt dynamic require in Node environment
  if (typeof process === "undefined" || !process.versions?.node) {
    offlineCollectionCache.set(normalizedPrefix, null);
    return null;
  }

  try {
    const req = createRequire(process.cwd() + "/package.json");
    let jsonPath: string | null = null;
    try {
      jsonPath = req.resolve(`@iconify-json/${normalizedPrefix}/icons.json`);
    } catch {
      try {
        jsonPath = req.resolve(`@iconify/json/json/${normalizedPrefix}.json`);
      } catch {
        jsonPath = null;
      }
    }

    if (jsonPath) {
      const collection = req(jsonPath) as IconifyJsonCollection;
      offlineCollectionCache.set(normalizedPrefix, collection);
      return collection;
    }
  } catch {
    // Package not found or failed to load
  }

  offlineCollectionCache.set(normalizedPrefix, null);
  return null;
}

export function loadOfflineIcon(prefix: string, name: string): IconData | null {
  const normalizedPrefix = prefix.toLowerCase();
  const normalizedName = name.toLowerCase();
  const cacheKey = `${normalizedPrefix}:${normalizedName}`;

  if (offlineIconCache.has(cacheKey)) {
    return offlineIconCache.get(cacheKey) ?? null;
  }

  const collection = resolveCollectionFromPackage(normalizedPrefix);
  if (!collection) {
    setBoundedIconCache(cacheKey, null);
    return null;
  }

  let iconEntry = collection.icons?.[normalizedName];
  if (!iconEntry && collection.aliases?.[normalizedName]) {
    const parentName = collection.aliases[normalizedName].parent;
    iconEntry = collection.icons?.[parentName];
  }

  if (!iconEntry || !iconEntry.body) {
    offlineIconCache.set(cacheKey, null);
    return null;
  }

  const left = iconEntry.left ?? 0;
  const top = iconEntry.top ?? 0;
  const width = iconEntry.width ?? collection.width ?? 24;
  const height = iconEntry.height ?? collection.height ?? 24;
  const viewBox = `${left} ${top} ${width} ${height}`;

  const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${iconEntry.body}</svg>`;
  const parsed = parseSvgText(wrappedSvg);

  const iconData: IconData = {
    viewBox,
    width,
    height,
    body: iconEntry.body,
    path: parsed?.path,
    paths: parsed?.paths,
    fill: parsed?.fill,
    stroke: parsed?.stroke,
    strokeWidth: parsed?.strokeWidth,
  };

  setBoundedIconCache(cacheKey, iconData);
  return iconData;
}
