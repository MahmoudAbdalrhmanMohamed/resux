import type { ResuxConfigInput } from "../runtime/index.js";

export interface ResuxResolvedConfig extends ResuxConfigInput {
  builder: string;
  serverBuilder: string;
  buildDir: string;
  compatibilityDate: string;
}

const DEFAULT_COMPATIBILITY_DATE = "2026-05-20";

export function resolveResuxConfig(input: Record<string, unknown>): ResuxResolvedConfig {
  const base = { ...input } as ResuxResolvedConfig;
  return {
    ...base,
    builder: readString(base.builder, "vite"),
    serverBuilder: readString(base.serverBuilder, "nitro"),
    buildDir: readString(base.buildDir, ".resux"),
    compatibilityDate: readCompatibilityDate(base.compatibilityDate)
  };
}

function readCompatibilityDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return DEFAULT_COMPATIBILITY_DATE;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
