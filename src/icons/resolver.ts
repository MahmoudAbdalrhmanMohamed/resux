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
  const aliases = { ...iconAliases, ...config?.aliases };
  const parsed = parseIconName(rawName, aliases, config?.collections);

  if (parsed) {
    const { prefix, name } = parsed;
    const normalizedKey = `${prefix}:${name}`;

    // 1. Local custom SVG
    if (prefix === "custom" || prefix === "local") {
      const local = loadLocalSvgIconSync(name, config?.customCollectionsDir);
      if (local) return local;
    }

    // 2. Offline @iconify-json bundle (installed collection takes precedence over static fallback)
    const offline = loadOfflineIcon(prefix, name);
    if (offline) return offline;

    // 3. Static fallback registry
    const staticData = getStaticIcon(normalizedKey) ?? getStaticIcon(rawName);
    if (staticData) return staticData;
  }

  // 4. Raw static registry check (for direct names like "hamburger")
  return getStaticIcon(rawName) ?? null;
}

export async function resolveIconAsync(
  rawName: string,
  config?: ResuxIconsConfig
): Promise<IconData | null> {
  const syncResult = resolveIconSync(rawName, config);
  if (syncResult) return syncResult;

  const aliases = { ...iconAliases, ...config?.aliases };
  const parsed = parseIconName(rawName, aliases, config?.collections);
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
