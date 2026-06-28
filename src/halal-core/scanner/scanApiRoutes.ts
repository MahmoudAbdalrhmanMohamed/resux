import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export function scanApiRoutes(appRoot: string): string[] {
  const routes: string[] = [];
  const serverDir = path.join(appRoot, "server");

  if (!existsSync(serverDir)) {
    return routes;
  }

  function traverse(dir: string) {
    let files: string[] = [];
    try {
      files = readdirSync(dir);
    } catch {
      return;
    }

    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        traverse(fullPath);
      } else if (stats.isFile()) {
        const relative = path.relative(serverDir, fullPath).replace(/\\/g, "/");
        if (relative.startsWith("api/") || relative.startsWith("routes/")) {
          routes.push(relative.replace(/\.(ts|js|mjs|cjs)$/, ""));
        }
      }
    }
  }

  traverse(serverDir);
  return routes;
}
