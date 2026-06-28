import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const IGNORE_DIRS = [
  "node_modules",
  ".resux",
  ".nitro",
  ".output",
  "dist",
  "build",
  ".git",
  ".github",
  "public",
  "assets"
];

const SCAN_EXTENSIONS = [
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".vue",
  ".html",
  ".json",
  ".md",
  ".txt"
];

export function scanContentFiles(
  dir: string,
  appRoot: string,
  ignoredPaths: Set<string> = new Set()
): Array<{ file: string; text: string }> {
  const results: Array<{ file: string; text: string }> = [];

  if (!existsSync(dir)) {
    return results;
  }

  function traverse(currentDir: string) {
    let files: string[] = [];
    try {
      files = readdirSync(currentDir);
    } catch {
      return;
    }

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const relativePath = path.relative(appRoot, fullPath);

      if (ignoredPaths.has(relativePath) || IGNORE_DIRS.includes(file)) {
        continue;
      }

      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        traverse(fullPath);
      } else if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (SCAN_EXTENSIONS.includes(ext) && file !== "package-lock.json") {
          try {
            // Read first 100KB of files to prevent memory blowups on huge files
            const content = readFileSync(fullPath, "utf8").slice(0, 100000);
            results.push({
              file: relativePath.replace(/\\/g, "/"),
              text: content
            });
          } catch {
            // Ignore unreadable files
          }
        }
      }
    }
  }

  traverse(dir);
  return results;
}
