import { readFile, writeFile, rm } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one patch anchor, found ${count}`);
  await writeFile(path, source.replace(before, after), "utf8");
}

await replaceOnce(
  "src/compiler/index.ts",
  `      if (!isAssignableExpression(expression)) {\n        throw new ResuxCompileError("v-model needs an assignable expression like \\"message.value\\".", locationFromVueNode(state.file, prop));\n      }\n      const model = createModelBinding(node.tag, node.props, expression, state, prop);`,
  `      if (!isAssignableExpression(expression)) {\n        throw new ResuxCompileError("v-model needs an assignable expression like \\"message.value\\".", locationFromVueNode(state.file, prop));\n      }\n      const assignmentRoot = assignableExpressionRoot(expression);\n      if (assignmentRoot && state.activeLocals.includes(assignmentRoot)) {\n        throw new ResuxCompileError(\n          \`v-model cannot assign through template-local binding "\${assignmentRoot}" because resumed event locals are serialized by value. Bind v-model to resumable component state instead.\`,\n          locationFromVueNode(state.file, prop),\n        );\n      }\n      const model = createModelBinding(node.tag, node.props, expression, state, prop);`
);

await replaceOnce(
  "src/compiler/index.ts",
  `function isAssignableExpression(expression: string): boolean {\n  return /^[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*|\\[[^\\]]+\\])*$/.test(expression.trim());\n}\n`,
  `function isAssignableExpression(expression: string): boolean {\n  return /^[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*|\\[[^\\]]+\\])*$/.test(expression.trim());\n}\n\nfunction assignableExpressionRoot(expression: string): string | undefined {\n  return /^([A-Za-z_$][\\w$]*)/.exec(expression.trim())?.[1];\n}\n`
);

await rm("scripts/pr36-vmodel-guard.mjs");
await rm(".github/workflows/pr36-vmodel-guard.yml");
