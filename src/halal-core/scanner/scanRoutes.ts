import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export function scanRoutes(appRoot: string): string[] {
  const routes: string[] = [];
  const pagesDir = path.join(appRoot, "pages");

  if (!existsSync(pagesDir)) {
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
        const relative = path.relative(pagesDir, fullPath).replace(/\\/g, "/");
        // Convert page file path to route name
        const routeName = relative
          .replace(/\.(vue|ts|js|jsx|tsx)$/, "")
          .replace(/\/index$/, "")
          .replace(/^index$/, "/");
        routes.push(routeName);
      }
    }
  }

  traverse(pagesDir);
  return routes;
}
