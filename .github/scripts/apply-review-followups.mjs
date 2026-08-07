import { readFile, writeFile } from "node:fs/promises";

async function replaceChecked(file, pattern, replacement, expected = 1) {
  const source = await readFile(file, "utf8");
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== expected) {
    throw new Error(`${file}: expected ${expected} matches for ${pattern}, found ${matches.length}`);
  }
  const next = source.replace(pattern, replacement);
  await writeFile(file, next, "utf8");
}

await replaceChecked(
  "src/compiler/index.ts",
  /          let webPath = importPath;\n          if \(absolutePath\.startsWith\(projectRoot\)\) \{\n            const relativeToRoot = path\.relative\(projectRoot, absolutePath\);\n            webPath = "\/" \+ relativeToRoot\.replace\(\/\\\\\/g, "\/"\);\n          \}/,
  `          let webPath = importPath;\n          const relativeToRoot = path.relative(projectRoot, absolutePath);\n          const isInsideProject = relativeToRoot === ""\n            || (relativeToRoot !== ".."\n              && !relativeToRoot.startsWith(\`..\${path.sep}\`)\n              && !path.isAbsolute(relativeToRoot));\n          if (isInsideProject) {\n            webPath = "/" + relativeToRoot.replace(/\\\\/g, "/");\n          }`,
);

await replaceChecked(
  "src/create.ts",
  /async function prepareTarget\(root: string, force: boolean\): Promise<void> \{[\s\S]*?\n\}\n\nasync function copyTemplate/,
  `async function assertCreatePathHasNoSymlinkComponents(target: string): Promise<void> {\n  const absoluteTarget = path.resolve(target);\n  const filesystemRoot = path.parse(absoluteTarget).root;\n  const relativeTarget = path.relative(filesystemRoot, absoluteTarget);\n  const segments = relativeTarget.split(path.sep).filter(Boolean);\n  let current = filesystemRoot;\n\n  for (const segment of segments) {\n    current = path.join(current, segment);\n    const info = await lstat(current).catch((error: NodeJS.ErrnoException) => {\n      if (error.code === "ENOENT") {\n        return null;\n      }\n      throw error;\n    });\n    if (!info) {\n      break;\n    }\n    if (info.isSymbolicLink()) {\n      throw new Error(\`Refusing to create a Resux project through symbolic link component "\${current}". Choose a real directory instead.\`);\n    }\n  }\n}\n\nasync function prepareTarget(root: string, force: boolean): Promise<void> {\n  await assertCreatePathHasNoSymlinkComponents(root);\n  await mkdir(root, { recursive: true });\n  await assertCreatePathHasNoSymlinkComponents(root);\n\n  const rootIdentity = await lstat(root);\n  if (!rootIdentity.isDirectory()) {\n    throw new Error(\`Target "\${root}" is not a directory.\`);\n  }\n\n  const entries = await readdir(root);\n\n  if (entries.length === 0) {\n    return;\n  }\n\n  if (!force) {\n    throw new Error(\`Target directory "\${root}" is not empty. Choose another name or pass --force.\`);\n  }\n\n  for (const entry of entries) {\n    await assertCreatePathHasNoSymlinkComponents(root);\n    const currentIdentity = await lstat(root);\n    if (currentIdentity.dev !== rootIdentity.dev || currentIdentity.ino !== rootIdentity.ino) {\n      throw new Error(\`Refusing to continue because target directory "\${root}" changed during --force cleanup.\`);\n    }\n    await rm(path.join(root, entry), { recursive: true, force: true });\n  }\n}\n\nasync function copyTemplate`,
);

await replaceChecked(
  "src/runtime/index.ts",
  /  resuxLazyPackageCache\.set\(key, loader\);\n  return loader;/,
  `  resuxLazyPackageCache.set(key, loader);\n  void loader.catch(() => {\n    if (resuxLazyPackageCache.get(key) === loader) {\n      resuxLazyPackageCache.delete(key);\n    }\n  });\n  return loader;`,
);

await replaceChecked(
  "src/runtime/index.ts",
  /  if \(body instanceof ArrayBuffer\) \{\n    return \["array-buffer", \.\.\.new Uint8Array\(body\)\];\n  \}\n  if \(ArrayBuffer\.isView\(body\)\) \{\n    return \["array-buffer-view", \.\.\.new Uint8Array\(body\.buffer, body\.byteOffset, body\.byteLength\)\];\n  \}/g,
  `  if (body instanceof ArrayBuffer) {\n    const bytes = new Uint8Array(body);\n    return ["array-buffer", bytes.byteLength, hashFetchBytes(bytes)];\n  }\n  if (ArrayBuffer.isView(body)) {\n    const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);\n    return ["array-buffer-view", bytes.byteLength, hashFetchBytes(bytes)];\n  }`,
  2,
);

await replaceChecked(
  "src/runtime/index.ts",
  /function hashFetchIdentity\(value: string\): string \{/,
  `function hashFetchBytes(bytes: Uint8Array): string {\n  let first = 2166136261;\n  let second = 2246822519;\n  for (const byte of bytes) {\n    first = Math.imul(first ^ byte, 16777619);\n    second = Math.imul(second ^ byte, 3266489917);\n  }\n  return (first >>> 0).toString(16).padStart(8, "0")\n    + (second >>> 0).toString(16).padStart(8, "0");\n}\n\nfunction hashFetchIdentity(value: string): string {`,
);

await replaceChecked(
  "src/runtime/index.ts",
  /function hashFetchIdentity\(value\) \{/,
  `function hashFetchBytes(bytes) {\n  let first = 2166136261;\n  let second = 2246822519;\n  for (const byte of bytes) {\n    first = Math.imul(first ^ byte, 16777619);\n    second = Math.imul(second ^ byte, 3266489917);\n  }\n  return (first >>> 0).toString(16).padStart(8, "0")\n    + (second >>> 0).toString(16).padStart(8, "0");\n}\n\nfunction hashFetchIdentity(value) {`,
);

await replaceChecked(
  "src/runtime/index.ts",
  /  \(globalThis as any\)\.\$t = \(key: string, params\?: Record<string, unknown>\): string => \{[\s\S]*?  \(globalThis as any\)\.\$tm = \(key: string\): unknown => \{[\s\S]*?\n  \};\n\n  return ctx;/,
  `  const runtimeGlobals = globalThis as any;\n  if (runtimeGlobals.__RESUX_SERVER_I18N_GLOBALS__ !== true) {\n    runtimeGlobals.$t = (key: string, params?: Record<string, unknown>): string => {\n      try {\n        const app = useResuxApp();\n        const normalizedI18n = normalizeI18nRuntimeConfig(app.$config.public?.i18n);\n        if (!normalizedI18n) return key;\n        const locale = resolveI18nRoute(app.route.path, normalizedI18n).locale.code;\n        return translateText(normalizedI18n, locale, key, params as any);\n      } catch {\n        return key;\n      }\n    };\n    runtimeGlobals.$tm = (key: string): unknown => {\n      try {\n        const app = useResuxApp();\n        const normalizedI18n = normalizeI18nRuntimeConfig(app.$config.public?.i18n);\n        if (!normalizedI18n) return key;\n        const locale = resolveI18nRoute(app.route.path, normalizedI18n).locale.code;\n        return translateRaw(normalizedI18n, locale, key);\n      } catch {\n        return key;\n      }\n    };\n    runtimeGlobals.__RESUX_SERVER_I18N_GLOBALS__ = true;\n  }\n\n  return ctx;`,
);

await replaceChecked(
  "src/runtime/index.ts",
  /      if \(success && __rxHasChanged\(value, oldValue\)\) \{/,
  `      if (success && (!hadKey || __rxHasChanged(value, oldValue))) {`,
);
