import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".resux",
  ".nitro",
  ".output",
  "dist",
  "build",
  ".git",
  ".github",
  "public",
  "assets",
]);

const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".vue",
  ".html",
  ".json",
  ".md",
  ".txt",
]);

const GLOB_TOKENS = ["*", "?", "[", "]", "{", "}", "!"];
const MAX_SCANNED_FILE_BYTES = 100_000;

interface ScanResult {
  file: string;
  text: string;
}

interface ScanContext {
  realRoot: string;
  ignoredPaths: string[];
  visitedDirectories: Set<string>;
  results: ScanResult[];
}

export function scanContentFiles(
  dir: string,
  appRoot: string,
  ignoredPaths: Set<string> = new Set(),
): ScanResult[] {
  const results: ScanResult[] = [];
  const roots = resolveScanRoots(dir, appRoot);
  if (!roots) {
    return results;
  }

  const context: ScanContext = {
    realRoot: roots.realRoot,
    ignoredPaths: [...ignoredPaths]
      .map(normalizeRelativePath)
      .filter((entry) => entry && !hasGlobSyntax(entry)),
    visitedDirectories: new Set<string>(),
    results,
  };

  traverseDirectory(roots.realStart, context);
  return results;
}

function resolveScanRoots(
  dir: string,
  appRoot: string,
): { realRoot: string; realStart: string } | null {
  if (!existsSync(dir) || !existsSync(appRoot)) {
    return null;
  }

  try {
    const realRoot = realpathSync(appRoot);
    const realStart = realpathSync(dir);
    return isPathInside(realRoot, realStart) ? { realRoot, realStart } : null;
  } catch {
    return null;
  }
}

function traverseDirectory(currentDir: string, context: ScanContext): void {
  const realDirectory = resolveDirectory(currentDir, context);
  if (!realDirectory) {
    return;
  }

  const files = readDirectory(realDirectory);
  if (!files) {
    return;
  }

  for (const file of files) {
    scanEntry(realDirectory, file, context);
  }
}

function resolveDirectory(currentDir: string, context: ScanContext): string | null {
  let realDirectory: string;
  try {
    realDirectory = realpathSync(currentDir);
  } catch {
    return null;
  }

  if (!isPathInside(context.realRoot, realDirectory)
    || context.visitedDirectories.has(realDirectory)) {
    return null;
  }

  context.visitedDirectories.add(realDirectory);
  return realDirectory;
}

function readDirectory(directory: string): string[] | null {
  try {
    return readdirSync(directory);
  } catch {
    return null;
  }
}

function scanEntry(realDirectory: string, file: string, context: ScanContext): void {
  const fullPath = path.join(realDirectory, file);
  const relativePath = normalizeRelativePath(path.relative(context.realRoot, fullPath));
  if (shouldIgnoreEntry(file, relativePath, context.ignoredPaths)) {
    return;
  }

  const stats = readStats(fullPath);
  if (!stats || stats.isSymbolicLink()) {
    return;
  }
  if (stats.isDirectory()) {
    traverseDirectory(fullPath, context);
    return;
  }
  if (!isScannableFile(stats, file)) {
    return;
  }

  const text = readFilePrefix(fullPath, MAX_SCANNED_FILE_BYTES);
  if (text !== null) {
    context.results.push({ file: relativePath, text });
  }
}

function readStats(file: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(file);
  } catch {
    return null;
  }
}

function shouldIgnoreEntry(file: string, relativePath: string, ignoredPaths: string[]): boolean {
  return IGNORE_DIRS.has(file) || isIgnoredPath(relativePath, ignoredPaths);
}

function isScannableFile(stats: ReturnType<typeof lstatSync>, file: string): boolean {
  return stats.isFile()
    && file !== "package-lock.json"
    && SCAN_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function readFilePrefix(file: string, maxBytes: number): string | null {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(file, "r");
    const buffer = Buffer.allocUnsafe(maxBytes);
    const bytesRead = readSync(descriptor, buffer, 0, maxBytes, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Ignore close failures after an unreadable file.
      }
    }
  }
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeRelativePath(value: string): string {
  let normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  let start = 0;
  while (start < normalized.length && normalized.charCodeAt(start) === 47) {
    start += 1;
  }
  let end = normalized.length;
  while (end > start && normalized.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return normalized.slice(start, end);
}

function isIgnoredPath(relativePath: string, ignoredPaths: string[]): boolean {
  return ignoredPaths.some((ignored) =>
    relativePath === ignored || relativePath.startsWith(`${ignored}/`)
  );
}

function hasGlobSyntax(value: string): boolean {
  return GLOB_TOKENS.some((token) => value.includes(token));
}
