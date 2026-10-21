import { fetchIconifyIcon } from "./api-fetcher.js";
import { loadLocalSvgIcon, loadLocalSvgIconSync } from "./local-svg.js";
import { parseIconName } from "./normalize.js";
import { loadOfflineIcon } from "./offline-loader.js";
import { getStaticIcon, iconAliases } from "./registry.js";
import type { IconData, ResuxIconsConfig } from "./types.js";

export function resolveIconSync(
  rawName: string,
  config?: ResuxIconsConfig
): IconData | null {
  const direct = getStaticIcon(rawName);
  if (direct) return direct;

  const aliases = { ...iconAliases, ...config?.aliases };
  const parsed = parseIconName(rawName, aliases, config?.collections);
  if (!parsed) return null;

  const { prefix, name } = parsed;
  const normalizedKey = `${prefix}:${name}`;

  // 1. Local custom SVG
  if (prefix === "custom" || prefix === "local") {
    const local = loadLocalSvgIconSync(name, config?.customCollectionsDir);
    if (local) return local;
  }

  // 2. Static fallback registry
  const staticData = getStaticIcon(normalizedKey) ?? getStaticIcon(rawName);
  if (staticData) return staticData;

  // 3. Offline @iconify-json bundle
  const offline = loadOfflineIcon(prefix, name);
  if (offline) return offline;

  return null;
}

export async function resolveIconAsync(
  rawName: string,
  config?: ResuxIconsConfig
): Promise<IconData | null> {
  const syncResult = resolveIconSync(rawName, config);
  if (syncResult) return syncResult;

  const parsed = parseIconName(rawName, config?.aliases, config?.collections);
  if (!parsed) return null;

  const { prefix, name } = parsed;

  // 1. Try local async if custom
  if (prefix === "custom" || prefix === "local") {
    const local = await loadLocalSvgIcon(name, config?.customCollectionsDir);
    if (local) return local;
  }

  // 2. Fall back to remote Iconify API fetcher
  return fetchIconifyIcon(`${prefix}:${name}`, config?.apiProvider);
}
