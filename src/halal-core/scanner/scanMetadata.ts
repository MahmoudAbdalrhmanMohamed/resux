import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface ScanMetadataResult {
  title?: string;
  description?: string;
  meta?: Record<string, string>;
}

export function scanMetadata(appRoot: string): ScanMetadataResult {
  const result: ScanMetadataResult = { meta: {} };

  // Check common files for SEO metadata
  const possibleFiles = [
    path.join(appRoot, "app.config.ts"),
    path.join(appRoot, "app.config.js"),
    path.join(appRoot, "resux.config.ts"),
    path.join(appRoot, "resux.config.js"),
  ];

  for (const file of possibleFiles) {
    if (existsSync(file)) {
      try {
        const content = readFileSync(file, "utf8");
        // Simple regex search for titles/descriptions
        const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
        if (titleMatch && titleMatch[1]) {
          result.title = titleMatch[1];
        }
        const descMatch = content.match(/description:\s*["']([^"']+)["']/);
        if (descMatch && descMatch[1]) {
          result.description = descMatch[1];
        }
      } catch {
        // Ignore errors
      }
    }
  }

  return result;
}
