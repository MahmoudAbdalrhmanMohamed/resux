import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export function scanComponents(appRoot: string): string[] {
  const components: string[] = [];
  const compDir = path.join(appRoot, "components");

  if (existsSync(compDir)) {
    try {
      const files = readdirSync(compDir);
      components.push(...files.map(f => f.toLowerCase()));
    } catch {
      // Ignore
    }
  }

  return components;
}
