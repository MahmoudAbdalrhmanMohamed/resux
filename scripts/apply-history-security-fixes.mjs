import { readFile, writeFile } from "node:fs/promises";

async function patchFile(path, transforms) {
  let source = await readFile(path, "utf8");
  for (const [label, before, after] of transforms) {
    const first = source.indexOf(before);
    if (first < 0) {
      throw new Error(`Could not find ${label} in ${path}`);
    }
    if (source.indexOf(before, first + before.length) >= 0) {
      throw new Error(`Expected one ${label} in ${path}`);
    }
    source = source.slice(0, first) + after + source.slice(first + before.length);
  }
  await writeFile(path, source, "utf8");
}

await patchFile("src/core/module-container.ts", [[
  "runtime config deep merge",
  `function deepMergeObjects(base: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(next)) {
    const current = output[key];
    output[key] = isObject(current) && isObject(value)
      ? deepMergeObjects(current, value)
      : value;
  }
  return output;
}
`,
  `const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function deepMergeObjects(base: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(next)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) {
      throw new Error(\`Runtime config contains unsafe key "\${key}".\`);
    }
    const current = Object.prototype.hasOwnProperty.call(output, key)
      ? output[key]
      : undefined;
    output[key] = isObject(current) && isObject(value)
      ? deepMergeObjects(current, value)
      : value;
  }
  return output;
}
`,
]]);

await patchFile("src/i18n/shared.ts", [[
  "nested translation lookup",
  `function readNestedValue(source: Record<string, unknown>, key: string): unknown {
  if (!key) {
    return source;
  }
  const parts = key.split(".");
  let cursor: unknown = source;
  for (const part of parts) {
    if (!isRecord(cursor) || !(part in cursor)) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
}
`,
  `const FORBIDDEN_MESSAGE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function readNestedValue(source: Record<string, unknown>, key: string): unknown {
  if (!key) {
    return source;
  }
  const parts = key.split(".");
  let cursor: unknown = source;
  for (const part of parts) {
    if (
      FORBIDDEN_MESSAGE_KEYS.has(part)
      || !isRecord(cursor)
      || !Object.prototype.hasOwnProperty.call(cursor, part)
    ) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
}
`,
]]);

await patchFile("src/create.ts", [
  [
    "homedir import",
    `import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";`,
    `import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";`,
  ],
  [
    "target safety check",
    `    await prepareTarget(root, options.force);`,
    `    assertSafeCreateTarget(root, process.cwd(), options.force);
    await prepareTarget(root, options.force);`,
  ],
  [
    "target preparation function",
    `async function prepareTarget(root: string, force: boolean): Promise<void> {`,
    `export function assertSafeCreateTarget(root: string, cwd: string, force: boolean): void {
  if (!force) {
    return;
  }

  const target = path.resolve(root);
  const workingDirectory = path.resolve(cwd);
  const filesystemRoot = path.parse(target).root;
  const homeDirectory = path.resolve(homedir());
  const relativeWorkingDirectory = path.relative(target, workingDirectory);
  const containsWorkingDirectory = relativeWorkingDirectory === ""
    || (!relativeWorkingDirectory.startsWith("..") && !path.isAbsolute(relativeWorkingDirectory));

  if (target === filesystemRoot || target === homeDirectory || containsWorkingDirectory) {
    throw new Error(
      \`Refusing to use --force on protected directory "\${target}". Choose a new child directory instead.\`,
    );
  }
}

async function prepareTarget(root: string, force: boolean): Promise<void> {`,
  ],
]);

console.log("Applied history security fixes.");
