import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export function scanPages(appRoot: string): string[] {
  const pages: string[] = [];
  const dirs = [path.join(appRoot, "pages"), path.join(appRoot, "layouts")];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir);
        pages.push(...files.map(f => f.toLowerCase()));
      } catch {
        // Ignore
      }
    }
  }

  return pages;
}
