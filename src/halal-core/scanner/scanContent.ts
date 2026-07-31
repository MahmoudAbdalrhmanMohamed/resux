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

const MAX_SCANNED_FILE_BYTES = 100_000;

export function scanContentFiles(
  dir: string,
  appRoot: string,
  ignoredPaths: Set<string> = new Set(),
): Array<{ file: string; text: string }> {
  const results: Array<{ file: string; text: string }> = [];

  if (!existsSync(dir) || !existsSync(appRoot)) {
    return results;
  }

  let realRoot: string;
  let realStart: string;
  try {
    realRoot = realpathSync(appRoot);
    realStart = realpathSync(dir);
  } catch {
    return results;
  }

  if (!isPathInside(realRoot, realStart)) {
    return results;
  }

  const normalizedIgnoredPaths = [...ignoredPaths]
    .map(normalizeRelativePath)
    .filter((entry) => entry && !hasGlobSyntax(entry));
  const visitedDirectories = new Set<string>();

  function traverse(currentDir: string): void {
    let realDirectory: string;
    try {
      realDirectory = realpathSync(currentDir);
    } catch {
      return;
    }
    if (!isPathInside(realRoot, realDirectory) || visitedDirectories.has(realDirectory)) {
      return;
    }
    visitedDirectories.add(realDirectory);

    let files: string[];
    try {
      files = readdirSync(realDirectory);
    } catch {
      return;
    }

    for (const file of files) {
      const fullPath = path.join(realDirectory, file);
      const relativePath = normalizeRelativePath(path.relative(realRoot, fullPath));

      if (
        IGNORE_DIRS.has(file)
        || isIgnoredPath(relativePath, normalizedIgnoredPaths)
      ) {
        continue;
      }

      let stats;
      try {
        stats = lstatSync(fullPath);
      } catch {
        continue;
      }

      // Never follow links during safety scanning. This prevents escaping the app
      // root and avoids recursive link cycles.
      if (stats.isSymbolicLink()) {
        continue;
      }
      if (stats.isDirectory()) {
        traverse(fullPath);
        continue;
      }
      if (!stats.isFile()) {
        continue;
      }

      const extension = path.extname(file).toLowerCase();
      if (!SCAN_EXTENSIONS.has(extension) || file === "package-lock.json") {
        continue;
      }

      const text = readFilePrefix(fullPath, MAX_SCANNED_FILE_BYTES);
      if (text !== null) {
        results.push({ file: relativePath, text });
      }
    }
  }

  traverse(realStart);
  return results;
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
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+|\/+$/g, "");
}

function isIgnoredPath(relativePath: string, ignoredPaths: string[]): boolean {
  return ignoredPaths.some((ignored) =>
    relativePath === ignored || relativePath.startsWith(`${ignored}/`)
  );
}

function hasGlobSyntax(value: string): boolean {
  return /[*?\[\]{}!]/.test(value);
}
