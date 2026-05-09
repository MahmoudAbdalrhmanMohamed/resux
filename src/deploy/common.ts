import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ResuxDeployConfig, ResuxDeployTarget } from "./types.js";

interface AssetCopyTarget {
  root: string;
  target: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonRecord(file: string): Promise<Record<string, unknown> | null> {
  const raw = await readFile(file, "utf8").catch(() => null);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

export function normalizeDeployTarget(value: unknown): ResuxDeployTarget | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "auto"
    || normalized === "node"
    || normalized === "vercel"
    || normalized === "netlify"
    || normalized === "cloudflare"
    || normalized === "static"
  ) {
    return normalized;
  }

  return null;
}

function parseDeployConfig(value: unknown): ResuxDeployConfig {
  if (!isRecord(value)) {
    return {};
  }

  const target = normalizeDeployTarget(value.target);
  const nitroPresetCandidate = typeof value.nitroPreset === "string"
    ? value.nitroPreset.trim()
    : typeof value.preset === "string"
      ? value.preset.trim()
      : "";

  return {
    ...(target ? { target } : {}),
    ...(nitroPresetCandidate ? { nitroPreset: nitroPresetCandidate } : {}),
  };
}

export async function loadResuxDeployConfig(
  appRoot: string,
  outDir: string,
): Promise<ResuxDeployConfig> {
  const compiledConfigFile = path.join(outDir, "server", "config.mjs");
  if (await pathExists(compiledConfigFile)) {
    const configModule = await import(
      `${pathToFileURL(compiledConfigFile).href}?t=${Date.now()}`
    ).catch(() => null);
    const resolved = parseDeployConfig((configModule as { default?: unknown } | null)?.default);
    if (resolved.target || resolved.nitroPreset) {
      return resolved;
    }
  }

  const sourceConfigFiles = [
    path.join(appRoot, "resux.config.ts"),
    path.join(appRoot, "resux.config.mjs"),
    path.join(appRoot, "resux.config.js"),
  ];
  for (const configFile of sourceConfigFiles) {
    if (!(await pathExists(configFile))) {
      continue;
    }

    const source = await readFile(configFile, "utf8").catch(() => "");
    const targetMatch = source.match(
      /\bdeploy\s*:\s*\{[\s\S]*?\btarget\s*:\s*["'](auto|node|vercel|netlify|cloudflare|static)["']/i,
    );
    const presetMatch = source.match(
      /\bdeploy\s*:\s*\{[\s\S]*?\b(?:nitroPreset|preset)\s*:\s*["']([^"']+)["']/i,
    );
    if (!targetMatch && !presetMatch) {
      continue;
    }

    const target = normalizeDeployTarget(targetMatch?.[1]);
    const nitroPreset = presetMatch?.[1]?.trim();
    return {
      ...(target ? { target } : {}),
      ...(nitroPreset ? { nitroPreset } : {}),
    };
  }

  return {};
}

export function normalizeProviderPreset(provider: string): string {
  switch (provider) {
    case "aws_amplify":
      return "aws-amplify";
    case "azure_static":
      return "azure";
    case "cloudflare_pages":
      return "cloudflare-pages";
    case "netlify":
      return "netlify";
    case "render":
      return "render-com";
    case "stormkit":
      return "stormkit";
    case "vercel":
      return "vercel";
    case "cleavr":
      return "cleavr";
    case "zeabur":
      return "zeabur";
    default:
      return provider;
  }
}

export function detectDeployProviderFromEnv(env: NodeJS.ProcessEnv): string | null {
  if (env.NOW_BUILDER || env.VERCEL || env.VERCEL_ENV) {
    return "vercel";
  }
  if (env.NETLIFY && !env.NETLIFY_LOCAL) {
    return "netlify";
  }
  if (env.CF_PAGES || env.CLOUDFLARE_PAGES) {
    return "cloudflare_pages";
  }
  if (env.INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN || env.AZURE_STATIC) {
    return "azure_static";
  }
  if (env.AWS_AMPLIFY || env.AWS_APP_ID) {
    return "aws_amplify";
  }
  if (env.STORMKIT) {
    return "stormkit";
  }
  if (env.RENDER) {
    return "render";
  }
  if (env.CLEAVR) {
    return "cleavr";
  }
  if (env.ZEABUR) {
    return "zeabur";
  }
  return null;
}

export async function ensureResuxClientAssets(
  appRoot: string,
  targets: AssetCopyTarget[],
): Promise<void> {
  const source = path.join(appRoot, ".resux", "client");
  if (!(await pathExists(source))) {
    return;
  }

  for (const { root, target } of targets) {
    if (!(await pathExists(root))) {
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, {
      recursive: true,
      force: true,
    });
  }
}

export async function ensureResuxServerPayload(
  appRoot: string,
  targets: string[],
): Promise<void> {
  const source = path.join(appRoot, ".resux", "server");
  if (!(await pathExists(source))) {
    return;
  }

  for (const target of targets) {
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, {
      recursive: true,
      force: true,
    });
  }
}

