import type { ResuxConfigInput } from "../runtime/index.js";

export interface ResuxResolvedConfig extends ResuxConfigInput {
  builder: string;
  serverBuilder: string;
  buildDir: string;
  compatibilityDate: string;
}

export const DEFAULT_RESUX_BUILD_DIR = ".resux";
export const RESUX_CLIENT_ASSET_DIR = "__resux";

const DEFAULT_COMPATIBILITY_DATE = "2026-05-20";
const NUXT_BUILD_DIR_SEGMENT = /(^|[\\/])\.nuxt(?=([\\/]|$))/g;
const NUXT_CLIENT_ASSET_SEGMENT = /(^|[\\/])_nuxt(?=([\\/]|$))/g;

/**
 * Keeps framework-owned generated paths branded as Resux.
 *
 * This also protects projects migrated from Nuxt configuration from producing
 * paths such as `.nuxt/dist/client/_nuxt/client-enhancements.mjs`.
 */
export function normalizeResuxGeneratedPath(value: string): string {
  return value
    .replace(NUXT_BUILD_DIR_SEGMENT, `$1${DEFAULT_RESUX_BUILD_DIR}`)
    .replace(NUXT_CLIENT_ASSET_SEGMENT, `$1${RESUX_CLIENT_ASSET_DIR}`);
}

/**
 * Resolves user configuration into the complete framework configuration with
 * safe defaults for builders, generated paths, and compatibility behavior.
 */
export function resolveResuxConfig(input: Record<string, unknown>): ResuxResolvedConfig {
  const base = { ...input } as ResuxResolvedConfig;
  return {
    ...base,
    builder: readString(base.builder, "vite"),
    serverBuilder: readString(base.serverBuilder, "nitro"),
    buildDir: normalizeResuxGeneratedPath(readString(base.buildDir, DEFAULT_RESUX_BUILD_DIR)),
    compatibilityDate: readCompatibilityDate(base.compatibilityDate)
  };
}

/**
 * Returns a valid YYYY-MM-DD compatibility date or the framework default when
 * the input is missing, malformed, or not a real calendar date.
 */
function readCompatibilityDate(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_COMPATIBILITY_DATE;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return DEFAULT_COMPATIBILITY_DATE;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return DEFAULT_COMPATIBILITY_DATE;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth ? value : DEFAULT_COMPATIBILITY_DATE;
}

/**
 * Reads a non-empty string value and otherwise returns the supplied fallback.
 */
function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
