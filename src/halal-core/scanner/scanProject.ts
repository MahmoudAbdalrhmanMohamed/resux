import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { scanRoutes } from "./scanRoutes.js";
import { scanPages } from "./scanPages.js";
import { scanComponents } from "./scanComponents.js";
import { scanApiRoutes } from "./scanApiRoutes.js";
import { scanMetadata } from "./scanMetadata.js";
import { scanEnvNames } from "./scanEnvNames.js";
import { scanDependencies } from "./scanDependencies.js";
import { scanTranslations } from "./scanTranslations.js";
import { scanContentFiles } from "./scanContent.js";
import { scanDomains } from "./scanDomains.js";

export function getGitignoredPaths(appRoot: string): Set<string> {
  const ignored = new Set<string>();
  const gitignorePath = path.join(appRoot, ".gitignore");
  
  if (existsSync(gitignorePath)) {
    try {
      const content = readFileSync(gitignorePath, "utf8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Preserve a leading slash so root-anchored gitignore rules stay anchored.
          const cleaned = trimmed.replace(/\/$/, "");
          if (cleaned) {
            ignored.add(cleaned);
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  return ignored;
}

export function scanProject(appRoot: string) {
  const ignored = getGitignoredPaths(appRoot);
  
  const routes = scanRoutes(appRoot);
  const pages = scanPages(appRoot);
  const components = scanComponents(appRoot);
  const apiRoutes = scanApiRoutes(appRoot);
  const metadata = scanMetadata(appRoot);
  const envNames = scanEnvNames(appRoot);
  const dependencies = scanDependencies(appRoot);
  const i18nWords = scanTranslations(appRoot);
  
  const contentTexts = scanContentFiles(appRoot, appRoot, ignored);
  const endpoints = scanDomains(contentTexts);
  
  return {
    routes,
    pages,
    components,
    apiRoutes,
    metadata,
    envNames,
    dependencies,
    i18nWords,
    contentTexts,
    endpoints
  };
}