import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CUSTOM_COLLECTIONS_DIR } from "./constants.js";
import { parseSvgText } from "./parser.js";
import type { IconData } from "./types.js";

const localSvgCache = new Map<string, IconData>();

function resolveSafeIconPath(name: string, dir: string, rootDir: string = process.cwd()): string | null {
  if (!name || typeof name !== "string") return null;
  // Reject absolute paths, Windows drive letters, null bytes, or URL schemes
  if (path.isAbsolute(name) || /^[a-zA-Z]:|[\\/]{2}/.test(name) || name.includes("\0")) {
    return null;
  }
  const cleanName = path.normalize(name).replace(/^[\\/]+/, "");
  if (cleanName.startsWith("..") || cleanName.split(/[\\/]/).includes("..")) {
    return null;
  }
  const baseDirectory = path.resolve(rootDir, dir);
  const targetPath = path.resolve(baseDirectory, cleanName.endsWith(".svg") ? cleanName : `${cleanName}.svg`);

  const rel = path.relative(baseDirectory, targetPath);
  if (rel.startsWith("..") || path.isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) {
    return null;
  }
  return targetPath;
}

function cacheAndReturnParsedSvg(cacheKey: string, content: string): IconData | null {
  const data = parseSvgText(content);
  if (data) {
    localSvgCache.set(cacheKey, data);
  }
  return data;
}

export function loadLocalSvgIconSync(
  name: string,
  dir: string = DEFAULT_CUSTOM_COLLECTIONS_DIR,
  rootDir: string = process.cwd()
): IconData | null {
  const cacheKey = `${dir}:${name}`;
  const cached = localSvgCache.get(cacheKey);
  if (cached) return cached;

  const targetPath = resolveSafeIconPath(name, dir, rootDir);
  if (!targetPath || !existsSync(targetPath)) return null;

  try {
    const content = readFileSync(targetPath, "utf-8");
    return cacheAndReturnParsedSvg(cacheKey, content);
  } catch {
    return null;
  }
}

export async function loadLocalSvgIcon(
  name: string,
  dir: string = DEFAULT_CUSTOM_COLLECTIONS_DIR,
  rootDir: string = process.cwd()
): Promise<IconData | null> {
  const cacheKey = `${dir}:${name}`;
  const cached = localSvgCache.get(cacheKey);
  if (cached) return cached;

  const targetPath = resolveSafeIconPath(name, dir, rootDir);
  if (!targetPath) return null;

  try {
    const content = await readFile(targetPath, "utf-8");
    return cacheAndReturnParsedSvg(cacheKey, content);
  } catch {
    return null;
  }
}

export function clearLocalSvgCache(): void {
  localSvgCache.clear();
}
