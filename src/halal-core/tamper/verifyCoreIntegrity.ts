import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function verifyCoreIntegrity(appRoot: string): boolean {
  // Check that core files are present in the framework source tree
  const criticalFiles = [
    "index",
    "enforce",
    "config",
    "policy",
    "rules/defaultBlockedRules",
    "rules/coreCategories",
    "report/signReport"
  ];

  // We find the framework dir by locating halal-core
  const pathname = decodeURIComponent(new URL(import.meta.url).pathname);
  const cleanPath = pathname.startsWith("/") && pathname[2] === ":" ? pathname.substring(1) : pathname;
  const normalizedDir = path.dirname(cleanPath);

  for (const file of criticalFiles) {
    const tsPath = path.join(normalizedDir, "..", `${file}.ts`);
    const jsPath = path.join(normalizedDir, "..", `${file}.js`);
    if (!existsSync(tsPath) && !existsSync(jsPath)) {
      console.error(`[resux-halal-core] Critical framework security file missing: ${file}`);
      return false;
    }
  }

  return true;
}
