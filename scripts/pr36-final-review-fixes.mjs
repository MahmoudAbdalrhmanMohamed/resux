import { readFile, writeFile, rm } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one patch anchor, found ${count}`);
  await writeFile(path, source.replace(before, after), "utf8");
}

async function replaceExactly(path, before, after, expected) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${path}: expected ${expected} patch anchors, found ${count}`);
  await writeFile(path, source.split(before).join(after), "utf8");
}

await replaceOnce(
  "src/compiler/index.ts",
  `      const isSimpleIdentifier = /^[A-Za-z_$][\\w$]*$/.test(expression);\n      const usesInlineHandler = !(isSimpleIdentifier && !state.activeLocals.includes(expression));`,
  `      const isSimpleIdentifier = /^[A-Za-z_$][\\w$]*$/.test(expression);\n      if (isSimpleIdentifier && state.activeLocals.includes(expression)) {\n        throw new ResuxCompileError(\n          \`Direct template-local event handler "\${expression}" cannot be resumed because template locals are serialized by value. Call a top-level handler with serializable local data instead.\`,\n          locationFromVueNode(state.file, prop),\n        );\n      }\n      const usesInlineHandler = !isSimpleIdentifier;`
);

await replaceOnce(
  "src/runtime/index.ts",
  `      return (globalThis as any).__RESUX_USE_I18N__ ? (globalThis as any).__RESUX_USE_I18N__().t(key, params) : key;`,
  `      return key;`
);

await replaceOnce(
  "src/runtime/index.ts",
  `      return (globalThis as any).__RESUX_USE_I18N__ ? (globalThis as any).__RESUX_USE_I18N__().tm(key) : key;`,
  `      return key;`
);

const undefinedLocalBefore = [
  '        if (!Object.prototype.hasOwnProperty.call(locals, name)) continue;',
  '        assertJsonSerializable(locals[name], `event local "${name}"`);',
  '        eventLocals[name] = JSON.parse(JSON.stringify(locals[name]));',
].join("\n");
const undefinedLocalAfter = [
  '        if (!Object.prototype.hasOwnProperty.call(locals, name)) continue;',
  '        const value = locals[name];',
  '        if (value === undefined) continue;',
  '        assertJsonSerializable(value, `event local "${name}"`);',
  '        eventLocals[name] = JSON.parse(JSON.stringify(value));',
].join("\n");
await replaceExactly("src/runtime/index.ts", undefinedLocalBefore, undefinedLocalAfter, 2);

await rm("scripts/pr36-final-review-fixes.mjs");
await rm(".github/workflows/pr36-final-review-fixes.yml");
