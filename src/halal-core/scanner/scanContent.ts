import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import type { Stats } from "node:fs";
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

const MAX_SCANNED_FILE_BYTES = 100_000;
const UNSUPPORTED_GLOB_TOKENS = ["[", "]", "{", "}"];

export interface ScanResult {
  file: string;
  text: string;
}

interface IgnoreRule {
  pattern: string;
  negated: boolean;
  anchored: boolean;
  hasSlash: boolean;
  hasGlob: boolean;
}

interface ScanContext {
  realRoot: string;
  ignoreRules: IgnoreRule[];
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
    ignoreRules: createIgnoreRules(ignoredPaths),
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
    return readdirSync(directory).sort(compareCodeUnits);
  } catch {
    return null;
  }
}

function scanEntry(realDirectory: string, file: string, context: ScanContext): void {
  const fullPath = path.join(realDirectory, file);
  const relativePath = normalizeRelativePath(path.relative(context.realRoot, fullPath));
  const stats = readStats(fullPath);
  if (!stats || stats.isSymbolicLink()) {
    return;
  }
  if (shouldIgnoreEntry(file, relativePath, context.ignoreRules, stats.isDirectory())) {
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

function readStats(file: string): Stats | null {
  try {
    return lstatSync(file);
  } catch {
    return null;
  }
}

function shouldIgnoreEntry(
  file: string,
  relativePath: string,
  ignoreRules: IgnoreRule[],
  isDirectory: boolean,
): boolean {
  if (IGNORE_DIRS.has(file)) {
    return true;
  }

  if (!isIgnoredPath(relativePath, ignoreRules)) {
    return false;
  }

  // A later negated rule may re-include a descendant. Continue traversing
  // ignored user directories in that case, while still filtering each entry.
  return !isDirectory || !ignoreRules.some((rule) => rule.negated);
}

function isScannableFile(stats: Stats, file: string): boolean {
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

function createIgnoreRules(ignoredPaths: Iterable<string>): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const rawEntry of ignoredPaths) {
    const trimmed = String(rawEntry || "").trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const negated = trimmed.startsWith("!");
    const rawPattern = negated ? trimmed.slice(1) : trimmed;
    const anchored = rawPattern.startsWith("/");
    const normalized = normalizeRelativePath(rawPattern);
    if (!normalized) {
      continue;
    }

    const unsupportedToken = UNSUPPORTED_GLOB_TOKENS.find((token) => normalized.includes(token));
    if (unsupportedToken) {
      console.warn(
        `[resux-halal-core] Ignore pattern "${rawEntry}" uses unsupported glob token "${unsupportedToken}" and will be matched literally.`,
      );
    }

    rules.push({
      pattern: normalized,
      negated,
      anchored,
      hasSlash: normalized.includes("/"),
      hasGlob: !unsupportedToken && (normalized.includes("*") || normalized.includes("?")),
    });
  }
  return rules;
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

function isIgnoredPath(relativePath: string, rules: IgnoreRule[]): boolean {
  let ignored = false;
  for (const rule of rules) {
    if (matchesIgnoreRule(relativePath, rule)) {
      ignored = !rule.negated;
    }
  }
  return ignored;
}

function matchesIgnoreRule(relativePath: string, rule: IgnoreRule): boolean {
  const pathSegments = relativePath.split("/").filter(Boolean);
  if (!rule.hasGlob) {
    if (rule.anchored || rule.hasSlash) {
      return relativePath === rule.pattern || relativePath.startsWith(`${rule.pattern}/`);
    }
    return pathSegments.includes(rule.pattern);
  }

  if (!rule.hasSlash) {
    if (rule.anchored) {
      return pathSegments.length > 0 && matchGlobSegment(pathSegments[0], rule.pattern);
    }
    return pathSegments.some((segment) => matchGlobSegment(segment, rule.pattern));
  }

  const patternSegments = rule.pattern.split("/").filter(Boolean);
  for (let length = 1; length <= pathSegments.length; length += 1) {
    if (matchGlobSegments(pathSegments.slice(0, length), patternSegments)) {
      return true;
    }
  }
  return false;
}

function matchGlobSegments(pathSegments: string[], patternSegments: string[]): boolean {
  const memo = new Map<string, boolean>();
  const visit = (pathIndex: number, patternIndex: number): boolean => {
    const key = `${pathIndex}:${patternIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let matched: boolean;
    if (patternIndex === patternSegments.length) {
      matched = pathIndex === pathSegments.length;
    } else if (patternSegments[patternIndex] === "**") {
      matched = visit(pathIndex, patternIndex + 1)
        || (pathIndex < pathSegments.length && visit(pathIndex + 1, patternIndex));
    } else {
      matched = pathIndex < pathSegments.length
        && matchGlobSegment(pathSegments[pathIndex], patternSegments[patternIndex])
        && visit(pathIndex + 1, patternIndex + 1);
    }

    memo.set(key, matched);
    return matched;
  };

  return visit(0, 0);
}

function matchGlobSegment(value: string, pattern: string): boolean {
  let valueIndex = 0;
  let patternIndex = 0;
  let starIndex = -1;
  let retryValueIndex = 0;

  while (valueIndex < value.length) {
    const token = pattern[patternIndex];
    if (token === "?" || token === value[valueIndex]) {
      valueIndex += 1;
      patternIndex += 1;
    } else if (token === "*") {
      starIndex = patternIndex;
      retryValueIndex = valueIndex;
      patternIndex += 1;
    } else if (starIndex >= 0) {
      patternIndex = starIndex + 1;
      retryValueIndex += 1;
      valueIndex = retryValueIndex;
    } else {
      return false;
    }
  }

  while (pattern[patternIndex] === "*") {
    patternIndex += 1;
  }
  return patternIndex === pattern.length;
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
