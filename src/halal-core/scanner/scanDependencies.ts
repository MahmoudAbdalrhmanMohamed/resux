import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function scanDependencies(appRoot: string): Record<string, string> {
  const pkgPath = path.join(appRoot, "package.json");
  if (!existsSync(pkgPath)) {
    return {};
  }
  
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };
  } catch {
    return {};
  }
}
