import type { IconMode } from "./types.js";

export const DEFAULT_ICON_API_PROVIDER = "https://api.iconify.design";
export const DEFAULT_ICON_SIZE = "1.25rem";
export const DEFAULT_ICON_MODE: IconMode = "svg";
export const DEFAULT_ICON_COMPONENT = "Icon";
export const DEFAULT_CUSTOM_COLLECTIONS_DIR = "assets/icons";

export const ICON_FETCH_TIMEOUT_MS = 10_000;
export const ICON_FETCH_MAX_BYTES = 256 * 1024;
export const ICON_FETCH_CACHE_MAX_ENTRIES = 256;
export const ICON_FETCH_MAX_IN_FLIGHT = 32;
export const ICON_FETCH_QUEUE_MAX_ENTRIES = 512;

export const DEFAULT_FALLBACK_SVG_PATH =
  "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16z";
export const DEFAULT_FALLBACK_VIEWBOX = "0 0 24 24";
