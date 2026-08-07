import { readFile, writeFile } from "node:fs/promises";

const file = "src/deploy/vercel.ts";
const source = await readFile(file, "utf8");
const before = `function resolveResuxPackageRequire(\n  appRequire: ReturnType<typeof createRequire>,\n): ReturnType<typeof createRequire> | null {\n  for (const packageName of ["resuxjs", "resux"]) {\n    try {\n      const packageEntryPath = appRequire.resolve(packageName);\n      return createRequire(packageEntryPath);\n    } catch {\n      // Keep trying known package names.\n    }\n  }\n  return null;\n}`;
const after = `function resolveResuxPackageRequire(\n  appRequire: ReturnType<typeof createRequire>,\n): ReturnType<typeof createRequire> | null {\n  for (const packageName of ["resuxjs", "resux"]) {\n    try {\n      const packageEntryPath = appRequire.resolve(packageName);\n      return createRequire(packageEntryPath);\n    } catch {\n      try {\n        const packageJsonPath = appRequire.resolve(\`${"${packageName}"}/package.json\`);\n        return createRequire(packageJsonPath);\n      } catch {\n        // Keep trying known package names.\n      }\n    }\n  }\n  return null;\n}`;

if (source.split(before).length !== 2) {
  throw new Error("Expected exactly one resolveResuxPackageRequire target");
}
await writeFile(file, source.replace(before, after), "utf8");
