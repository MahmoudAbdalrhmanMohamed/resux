import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(file, before, after) {
  const source = await readFile(file, "utf8");
  const first = source.indexOf(before);
  if (first < 0) {
    throw new Error(`Expected patch target was not found in ${file}`);
  }
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target was not unique in ${file}`);
  }
  await writeFile(file, source.slice(0, first) + after + source.slice(first + before.length), "utf8");
}

await replaceOnce(
  "src/deploy/vercel.ts",
  `function resolveResuxPackageRequire(\n  appRequire: ReturnType<typeof createRequire>,\n): ReturnType<typeof createRequire> | null {\n  for (const packageName of ["resuxjs", "resux"]) {\n    try {\n      const packageJsonPath = appRequire.resolve(\`${"${packageName}"}/package.json\`);\n      return createRequire(packageJsonPath);\n    } catch {\n      // Keep trying known package names.\n    }\n  }\n  return null;\n}`,
  `function resolveResuxPackageRequire(\n  appRequire: ReturnType<typeof createRequire>,\n): ReturnType<typeof createRequire> | null {\n  for (const packageName of ["resuxjs", "resux"]) {\n    try {\n      const packageEntryPath = appRequire.resolve(packageName);\n      return createRequire(packageEntryPath);\n    } catch {\n      // Keep trying known package names.\n    }\n  }\n  return null;\n}`,
);

await replaceOnce(
  "src/deploy/vercel.ts",
  `async function resolveDependencyPackageJsonPath(\n  dependency: string,\n  resolver: ReturnType<typeof createRequire>,\n  resolutionErrors?: string[],\n): Promise<string | null> {\n  try {\n    return resolver.resolve(\`${"${dependency}"}/package.json\`);\n  } catch (packageJsonError) {\n    try {\n      const entryPath = resolver.resolve(dependency);\n      const packageJsonPath = await findPackageJsonFromEntry(dependency, entryPath);\n      if (packageJsonPath) {\n        return packageJsonPath;\n      }\n      resolutionErrors?.push(\n        \`${"${formatResolutionError(packageJsonError)}"} | Resolved "${"${dependency}"}" to ${"${entryPath}"}, but its package root could not be located.\`,\n      );\n    } catch (entryError) {\n      resolutionErrors?.push(\n        \`${"${formatResolutionError(packageJsonError)}"} | ${"${formatResolutionError(entryError)}"}\`,\n      );\n    }\n    return null;\n  }\n}`,
  `async function resolveDependencyPackageJsonPath(\n  dependency: string,\n  resolver: ReturnType<typeof createRequire>,\n  resolutionErrors?: string[],\n): Promise<string | null> {\n  let entryResolutionError: unknown = null;\n  try {\n    const entryPath = resolver.resolve(dependency);\n    const packageJsonPath = await findPackageJsonFromEntry(dependency, entryPath);\n    if (packageJsonPath) {\n      return packageJsonPath;\n    }\n    entryResolutionError = new Error(\n      \`Resolved "${"${dependency}"}" to ${"${entryPath}"}, but its package root could not be located.\`,\n    );\n  } catch (error) {\n    entryResolutionError = error;\n  }\n\n  // Legacy packages may expose package.json directly but have no resolvable root entry.\n  // Keep this as a fallback only: modern packages such as sharp intentionally do not\n  // export ./package.json and should resolve through their public entry point instead.\n  try {\n    return resolver.resolve(\`${"${dependency}"}/package.json\`);\n  } catch (packageJsonError) {\n    resolutionErrors?.push(\n      \`${"${formatResolutionError(entryResolutionError)}"} | ${"${formatResolutionError(packageJsonError)}"}\`,\n    );\n    return null;\n  }\n}`,
);

await replaceOnce(
  "tests/deploy.test.ts",
  `    JSON.stringify({\n      name: "sharp",\n      version: "1.0.0",\n      dependencies: {\n        "dep-a": "1.0.0",\n      },\n      optionalDependencies: {\n        "@img/sharp-linux-x64": "1.0.0",\n      },\n    }, null, 2),\n    "utf8",\n  );\n\n  const depARoot = path.join(root, "node_modules", "dep-a");`,
  `    JSON.stringify({\n      name: "sharp",\n      version: "1.0.0",\n      type: "commonjs",\n      exports: {\n        ".": {\n          require: "./dist/index.cjs",\n          import: "./dist/index.mjs",\n        },\n      },\n      dependencies: {\n        "dep-a": "1.0.0",\n      },\n      optionalDependencies: {\n        "@img/sharp-linux-x64": "1.0.0",\n      },\n    }, null, 2),\n    "utf8",\n  );\n  await mkdir(path.join(sharpRoot, "dist"), { recursive: true });\n  await writeFile(path.join(sharpRoot, "dist", "index.cjs"), "module.exports = {};\\n", "utf8");\n  await writeFile(path.join(sharpRoot, "dist", "index.mjs"), "export default {};\\n", "utf8");\n\n  const depARoot = path.join(root, "node_modules", "dep-a");`,
);

await replaceOnce(
  "tests/deploy.test.ts",
  `  it("copies sharp runtime packages into each vercel function output", async () => {`,
  `  it("copies sharp runtime packages when package.json is hidden by exports", async () => {`,
);
