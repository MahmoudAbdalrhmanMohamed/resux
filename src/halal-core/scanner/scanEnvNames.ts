import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export function scanEnvNames(appRoot: string): string[] {
  const envNames = new Set<string>();

  try {
    const files = readdirSync(appRoot).filter(f => f.startsWith(".env"));
    for (const file of files) {
      const fullPath = path.join(appRoot, file);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf8");
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const parts = trimmed.split("=");
            const name = parts[0]?.trim();
            if (name) {
              envNames.add(name);
            }
          }
        }
      }
    }
  } catch {
    // Ignore folder read errors
  }

  return Array.from(envNames);
}
