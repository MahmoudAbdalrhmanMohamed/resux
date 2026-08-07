import { readFile, rm, writeFile } from "node:fs/promises";

function replaceOnce(source, search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`Expected one patch target for ${label}, found ${count}.`);
  }
  return source.replace(search, replacement);
}

let createSource = await readFile("src/create.ts", "utf8");
createSource = replaceOnce(
  createSource,
  `import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";`,
  `import { lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";`,
  "create lstat import",
);
createSource = replaceOnce(
  createSource,
  `async function prepareTarget(root: string, force: boolean): Promise<void> {\n  await mkdir(root, { recursive: true });`,
  `async function prepareTarget(root: string, force: boolean): Promise<void> {\n  const existing = await lstat(root).catch(() => null);\n  if (existing?.isSymbolicLink()) {\n    throw new Error(\`Refusing to create a Resux project through symbolic link "\${root}". Choose a real directory instead.\`);\n  }\n\n  await mkdir(root, { recursive: true });`,
  "create symlink protection",
);
await writeFile("src/create.ts", createSource, "utf8");

let runtimeSource = await readFile("src/runtime/index.ts", "utf8");
runtimeSource = replaceOnce(
  runtimeSource,
  `        .catch((error) => {\n          throw new Error(\n            \`Failed to load CSS entry "\${href}" for package "\${packageName}": \${error instanceof Error ? error.message : String(error)}\`\n          );\n        }),`,
  `        .catch((error) => {\n          resuxInjectedPackageCss.delete(href);\n          throw new Error(\n            \`Failed to load CSS entry "\${href}" for package "\${packageName}": \${error instanceof Error ? error.message : String(error)}\`\n          );\n        }),`,
  "package css retry cleanup",
);
runtimeSource = replaceOnce(
  runtimeSource,
  `  resuxLazyPackageCache.set(key, loader as Promise<unknown>);\n  return loader;`,
  `  resuxLazyPackageCache.set(key, loader as Promise<unknown>);\n  void loader.catch(() => {\n    if (resuxLazyPackageCache.get(key) === loader) {\n      resuxLazyPackageCache.delete(key);\n    }\n  });\n  return loader;`,
  "lazy package retry cleanup",
);
await writeFile("src/runtime/index.ts", runtimeSource, "utf8");

await rm("scripts/apply-framework-audit-patches.mjs", { force: true });
await rm(".github/workflows/framework-audit-patch.yml", { force: true });
