import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function scanTranslations(appRoot: string): string[] {
  const words: string[] = [];
  const i18nDir = path.join(appRoot, "i18n");

  if (existsSync(i18nDir)) {
    try {
      const files = readdirSync(i18nDir).filter(f => f.endsWith(".json"));
      for (const file of files) {
        const content = readFileSync(path.join(i18nDir, file), "utf8");
        // Simple search for raw translation strings
        const json = JSON.parse(content);
        const extractStrings = (obj: any) => {
          if (typeof obj === "string") {
            words.push(obj);
          } else if (typeof obj === "object" && obj !== null) {
            for (const key of Object.keys(obj)) {
              extractStrings(obj[key]);
            }
          }
        };
        extractStrings(json);
      }
    } catch {
      // Ignore
    }
  }

  return words;
}
