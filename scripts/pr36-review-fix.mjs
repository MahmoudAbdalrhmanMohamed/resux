import { readFile, writeFile, rm } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${path}: expected exactly one patch anchor, found ${count}`);
  }
  await writeFile(path, source.replace(before, after), "utf8");
}

await replaceOnce(
  "src/compiler/index.ts",
  `      const isSimpleIdentifier = /^[A-Za-z_$][\\w$]*$/.test(expression);\n      const usesInlineHandler = !(isSimpleIdentifier && !state.activeLocals.includes(expression));\n      const handler = usesInlineHandler\n        ? createInlineEventHandler(expression, state, prop)\n        : expression;\n      const event: TemplateEvent = {\n        name: arg,\n        handler,\n        modifiers,\n        ...(usesInlineHandler && state.activeLocals.length > 0\n          ? { locals: [...state.activeLocals] }\n          : {})\n      };`,
  `      const isSimpleIdentifier = /^[A-Za-z_$][\\w$]*$/.test(expression);\n      const usesInlineHandler = !(isSimpleIdentifier && !state.activeLocals.includes(expression));\n      const inlineHandler = usesInlineHandler\n        ? createInlineEventHandler(expression, state, prop)\n        : null;\n      const handler = inlineHandler?.name ?? expression;\n      const event: TemplateEvent = {\n        name: arg,\n        handler,\n        modifiers,\n        ...(inlineHandler?.locals.length ? { locals: inlineHandler.locals } : {})\n      };`
);

await replaceOnce(
  "src/compiler/index.ts",
  `      const model = createModelBinding(node.tag, node.props, expression, state);`,
  `      const model = createModelBinding(node.tag, node.props, expression, state, prop);`
);

await replaceOnce(
  "src/compiler/index.ts",
  `        modifiers: [],\n        ...(state.activeLocals.length > 0 ? { locals: [...state.activeLocals] } : {})`,
  `        modifiers: [],\n        ...(model.locals.length > 0 ? { locals: model.locals } : {})`
);

await replaceOnce(
  "src/compiler/index.ts",
  `function createInlineEventHandler(expression: string, state: CompileTemplateState, node?: VueCompilerNode): string {\n  const name = nextInlineHandlerName(state);\n  const transformed = transformTemplateExpressionCode(expression, state.templateRefBindings, state.file, node ?? ({} as any)).transformed;\n  const localBindings = state.activeLocals\n    .map((local) => \`const \${local} = __rx_event_locals[\${JSON.stringify(local)}];\`)\n    .join("\\n");\n  state.inlineHandlers.push({\n    name,\n    source: \`function \${name}($event, __rx_event_locals = {}) {\\n\${localBindings}\${localBindings ? "\\n" : ""}\${transformed}\\n}\`,\n    locals: [...state.activeLocals]\n  });\n  return name;\n}\n\nfunction createModelBinding(\n  tag: string,\n  props: Array<AttributeNode | DirectiveNode>,\n  expression: string,\n  state: CompileTemplateState\n): { attribute: string; value: string; event: string; handler: string } {\n  const normalizedTag = tag.toLowerCase();\n  const inputType = normalizedTag === "input" ? staticAttributeValue(props, "type")?.toLowerCase() : undefined;\n  const isCheckbox = inputType === "checkbox";\n  const handler = nextInlineHandlerName(state);\n  const target = "$event.target";\n  const assignmentExpression = state.templateRefBindings.has(expression.trim()) ? \`\${expression.trim()}.value\` : expression;\n  const assignment = isCheckbox\n    ? \`\${assignmentExpression} = Boolean(\${target} && \${target}.checked)\`\n    : \`\${assignmentExpression} = \${target} ? \${target}.value : ""\`;\n\n  state.inlineHandlers.push({\n    name: handler,\n    source: \`function \${handler}($event) {\\n\${assignment}\\n}\`,\n    locals: [...state.activeLocals]\n  });\n\n  return {\n    attribute: isCheckbox ? "checked" : "value",\n    value: expression,\n    event: isCheckbox || normalizedTag === "select" ? "change" : "input",\n    handler\n  };\n}`,
  `function selectReferencedActiveLocals(activeLocals: string[], identifiers: string[]): string[] {\n  const referenced = new Set(identifiers);\n  const seen = new Set<string>();\n  const selected: string[] = [];\n  for (let index = activeLocals.length - 1; index >= 0; index -= 1) {\n    const local = activeLocals[index];\n    if (!referenced.has(local) || seen.has(local)) continue;\n    seen.add(local);\n    selected.unshift(local);\n  }\n  return selected;\n}\n\nfunction createInlineEventHandler(\n  expression: string,\n  state: CompileTemplateState,\n  node?: VueCompilerNode\n): { name: string; locals: string[] } {\n  const name = nextInlineHandlerName(state);\n  const transformed = transformTemplateExpressionCode(\n    expression,\n    state.templateRefBindings,\n    state.file,\n    node ?? ({} as any)\n  );\n  const capturedLocals = selectReferencedActiveLocals(state.activeLocals, transformed.identifiers);\n  const localBindings = capturedLocals\n    .map((local) => \`const \${local} = __rx_event_locals[\${JSON.stringify(local)}];\`)\n    .join("\\n");\n  state.inlineHandlers.push({\n    name,\n    source: \`function \${name}($event, __rx_event_locals = {}) {\\n\${localBindings}\${localBindings ? "\\n" : ""}\${transformed.transformed}\\n}\`,\n    locals: capturedLocals\n  });\n  return { name, locals: capturedLocals };\n}\n\nfunction createModelBinding(\n  tag: string,\n  props: Array<AttributeNode | DirectiveNode>,\n  expression: string,\n  state: CompileTemplateState,\n  node?: VueCompilerNode\n): { attribute: string; value: string; event: string; handler: string; locals: string[] } {\n  const normalizedTag = tag.toLowerCase();\n  const inputType = normalizedTag === "input" ? staticAttributeValue(props, "type")?.toLowerCase() : undefined;\n  const isCheckbox = inputType === "checkbox";\n  const handler = nextInlineHandlerName(state);\n  const target = "$event.target";\n  const assignmentExpression = state.templateRefBindings.has(expression.trim()) ? \`\${expression.trim()}.value\` : expression;\n  const assignment = isCheckbox\n    ? \`\${assignmentExpression} = Boolean(\${target} && \${target}.checked)\`\n    : \`\${assignmentExpression} = \${target} ? \${target}.value : ""\`;\n  const identifiers = transformTemplateExpressionCode(\n    expression,\n    state.templateRefBindings,\n    state.file,\n    node ?? ({} as any)\n  ).identifiers;\n  const capturedLocals = selectReferencedActiveLocals(state.activeLocals, identifiers);\n  const localBindings = capturedLocals\n    .map((local) => \`const \${local} = __rx_event_locals[\${JSON.stringify(local)}];\`)\n    .join("\\n");\n\n  state.inlineHandlers.push({\n    name: handler,\n    source: \`function \${handler}($event, __rx_event_locals = {}) {\\n\${localBindings}\${localBindings ? "\\n" : ""}\${assignment}\\n}\`,\n    locals: capturedLocals\n  });\n\n  return {\n    attribute: isCheckbox ? "checked" : "value",\n    value: expression,\n    event: isCheckbox || normalizedTag === "select" ? "change" : "input",\n    handler,\n    locals: capturedLocals\n  };\n}`
);

await replaceOnce(
  "tests/compiler.test.ts",
  `    expect(component.serverSource).toContain("function __rx_inline_0($event)");`,
  `    expect(component.serverSource).toContain("function __rx_inline_0($event, __rx_event_locals = {})");`
);

await replaceOnce(
  "tests/resumable-event-locals.test.ts",
  `      \`<script setup>\\nconst locales = [{ code: 'en' }, { code: 'ar' }]\\nfunction setLocale(code) { return code }\\n</script>\\n<template>\\n  <button v-for="item in locales" :key="item.code" @click="setLocale(item.code)">{{ item.code }}</button>\\n</template>\`,`,
  `      \`<script setup>\\nconst locales = [{ code: 'en' }, { code: 'ar' }]\\nfunction setLocale(code) { return code }\\n</script>\\n<template>\\n  <button v-for="(item, index) in locales" :key="item.code" @click="setLocale(item.code)">{{ index }}: {{ item.code }}</button>\\n</template>\`,`
);

await replaceOnce(
  "tests/resumable-event-locals.test.ts",
  `    expect(component?.clientSource).toContain('const item = __rx_event_locals["item"]');`,
  `    expect(component?.clientSource).toContain('const item = __rx_event_locals["item"]');\n    expect(component?.clientSource).not.toContain('const index = __rx_event_locals["index"]');`
);

await replaceOnce(
  "tests/resumable-event-locals.test.ts",
  `    expect(input?.events[0]?.locals).toEqual(["item"]);`,
  `    expect(input?.events[0]?.locals).toEqual(["item"]);\n    expect(component?.clientSource).toContain("function __rx_inline_0($event, __rx_event_locals = {})");\n    expect(component?.clientSource).toContain('const item = __rx_event_locals["item"]');\n    expect(component?.clientSource).toContain("item.code = $event.target ? $event.target.value : \\\"\\\"");`
);

await rm("scripts/pr36-review-fix.mjs");
await rm(".github/workflows/pr36-review-fix.yml");
