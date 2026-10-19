import {
  DEFAULT_ICON_API_PROVIDER,
  ICON_FETCH_MAX_BYTES,
  ICON_FETCH_TIMEOUT_MS,
} from "./constants.js";
import { defaultIconCache, type IconCacheManager } from "./cache.js";
import { normalizeIconApiProvider, parseIconName } from "./normalize.js";
import { parseSvgText } from "./parser.js";
import type { IconData } from "./types.js";

async function readBoundedIconSvg(response: Response): Promise<string | null> {
  const rawLength = response.headers?.get?.("content-length");
  if (rawLength) {
    const contentLength = Number(rawLength);
    if (Number.isFinite(contentLength) && contentLength > ICON_FETCH_MAX_BYTES) {
      return null;
    }
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= ICON_FETCH_MAX_BYTES ? text : null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > ICON_FETCH_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export function fetchIconifyIcon(
  rawName: string,
  apiProvider: string = DEFAULT_ICON_API_PROVIDER,
  cache: IconCacheManager = defaultIconCache
): Promise<IconData | null> {
  const parsed = parseIconName(rawName);
  if (!parsed) return Promise.resolve(null);

  const provider = normalizeIconApiProvider(apiProvider);
  const normalizedKey = `${parsed.prefix}:${parsed.name}`;
  const cacheKey = `${provider}::${normalizedKey}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = cache.getPending(cacheKey);
  if (pending) {
    return pending;
  }

  const url = `${provider}/${encodeURIComponent(parsed.prefix)}/${encodeURIComponent(parsed.name)}.svg`;

  const fetchPromise = cache.runWithSlot(async () => {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), ICON_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
      if (!response.ok) return null;
      const svgText = await readBoundedIconSvg(response);
      if (!svgText) return null;
      const data = parseSvgText(svgText);
      if (data) {
        cache.set(cacheKey, data);
      }
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }).finally(() => {
    cache.deletePending(cacheKey);
  });

  cache.setPending(cacheKey, fetchPromise);
  return fetchPromise;
}
