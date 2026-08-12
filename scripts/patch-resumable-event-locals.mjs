import { readFile, writeFile } from "node:fs/promises";

const compilerPath = new URL("../src/compiler/index.ts", import.meta.url);
const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);

let compiler = await readFile(compilerPath, "utf8");

const eventBefore = `      const isSimpleIdentifier = /^[A-Za-z_$][\\w$]*$/.test(expression);\n      const handler = (isSimpleIdentifier && !state.activeLocals.includes(expression))\n        ? expression\n        : createInlineEventHandler(expression, state, prop);\n      const event = {\n        name: arg,\n        handler,\n        modifiers\n      };`;
const eventAfter = `      const isSimpleIdentifier = /^[A-Za-z_$][\\w$]*$/.test(expression);\n      const usesInlineHandler = !(isSimpleIdentifier && !state.activeLocals.includes(expression));\n      const handler = usesInlineHandler\n        ? createInlineEventHandler(expression, state, prop)\n        : expression;\n      const event: TemplateEvent = {\n        name: arg,\n        handler,\n        modifiers,\n        ...(usesInlineHandler && state.activeLocals.length > 0\n          ? { locals: [...state.activeLocals] }\n          : {})\n      };`;
if (!compiler.includes(eventBefore)) throw new Error("template event block anchor not found");
compiler = compiler.replace(eventBefore, eventAfter);

const modelBefore = `      const event = {\n        name: model.event,\n        handler: model.handler,\n        modifiers: []\n      };`;
const modelAfter = `      const event: TemplateEvent = {\n        name: model.event,\n        handler: model.handler,\n        modifiers: [],\n        ...(state.activeLocals.length > 0 ? { locals: [...state.activeLocals] } : {})\n      };`;
if (!compiler.includes(modelBefore)) throw new Error("v-model event block anchor not found");
compiler = compiler.replace(modelBefore, modelAfter);

const inlineBefore = `function createInlineEventHandler(expression: string, state: CompileTemplateState, node?: VueCompilerNode): string {\n  const name = nextInlineHandlerName(state);\n  const transformed = transformTemplateExpressionCode(expression, state.templateRefBindings, state.file, node ?? ({} as any)).transformed;\n  state.inlineHandlers.push({\n    name,\n    source: \`function \${name}($event) {\\n\${transformed}\\n}\`,\n    locals: [...state.activeLocals]\n  });\n  return name;\n}`;
const inlineAfter = `function createInlineEventHandler(expression: string, state: CompileTemplateState, node?: VueCompilerNode): string {\n  const name = nextInlineHandlerName(state);\n  const transformed = transformTemplateExpressionCode(expression, state.templateRefBindings, state.file, node ?? ({} as any)).transformed;\n  const localBindings = state.activeLocals\n    .map((local) => \`const \${local} = __rx_event_locals[\${JSON.stringify(local)}];\`)\n    .join("\\n");\n  state.inlineHandlers.push({\n    name,\n    source: \`function \${name}($event, __rx_event_locals = {}) {\\n\${localBindings}\${localBindings ? "\\n" : ""}\${transformed}\\n}\`,\n    locals: [...state.activeLocals]\n  });\n  return name;\n}`;
if (!compiler.includes(inlineBefore)) throw new Error("inline handler anchor not found");
compiler = compiler.replace(inlineBefore, inlineAfter);

await writeFile(compilerPath, compiler, "utf8");

let runtime = await readFile(runtimePath, "utf8");

const typeBefore = `export interface TemplateEvent {\n  name: string;\n  handler: string;\n  modifiers?: string[];\n}`;
const typeAfter = `export interface TemplateEvent {\n  name: string;\n  handler: string;\n  modifiers?: string[];\n  /** Template-local bindings captured by an inline resumable handler. */\n  locals?: string[];\n}`;
if (!runtime.includes(typeBefore)) throw new Error("TemplateEvent type anchor not found");
runtime = runtime.replace(typeBefore, typeAfter);

const serverMarkerLine = '    attrs.push(`data-rx-on-${event.name}="${context.scopeId}:${context.moduleId}:${event.handler}"`);';
const serverMarkerWithLocals = [
  serverMarkerLine,
  '    if (event.locals?.length) {',
  '      const eventLocals: Record<string, unknown> = {};',
  '      for (const name of event.locals) {',
  '        if (!Object.prototype.hasOwnProperty.call(locals, name)) continue;',
  '        assertJsonSerializable(locals[name], `event local "${name}"`);',
  '        eventLocals[name] = JSON.parse(JSON.stringify(locals[name]));',
  '      }',
  '      attrs.push(`data-rx-locals-${event.name}="${escapeAttribute(JSON.stringify(eventLocals))}"`);',
  '    }',
].join("\n");
const serverCount = runtime.split(serverMarkerLine).length - 1;
if (serverCount < 1) throw new Error("server event render marker not found");
runtime = runtime.split(serverMarkerLine).join(serverMarkerWithLocals);

const runBefore = `    async run(scopeRecord, handlerName, event) {\n      const handler = scopeRecord.scope[handlerName];\n      if (typeof handler !== \"function\") {\n        throw new Error(\"Missing resumable handler \" + handlerName + \".\");\n      }\n      await handler(event);`;
const runAfter = `    async run(scopeRecord, handlerName, event, eventLocals = {}) {\n      const handler = scopeRecord.scope[handlerName];\n      if (typeof handler !== \"function\") {\n        throw new Error(\"Missing resumable handler \" + handlerName + \".\");\n      }\n      await handler(event, eventLocals);`;
if (!runtime.includes(runBefore)) throw new Error("client component run anchor not found");
runtime = runtime.replace(runBefore, runAfter);

const delegatedBefore = `    const patches = await component.run(scopeRecord, handlerName, event);`;
const delegatedAfter = `    const patches = await component.run(scopeRecord, handlerName, event, readEventLocals(target, eventName));`;
if (!runtime.includes(delegatedBefore)) throw new Error("delegated component.run anchor not found");
runtime = runtime.replace(delegatedBefore, delegatedAfter);

const modifiersAnchor = `function readEventModifiers(target, eventName) {\n  return (target.getAttribute(\"data-rx-mod-\" + eventName) || \"\")`;
const localsHelper = `function readEventLocals(target, eventName) {\n  const encoded = target.getAttribute(\"data-rx-locals-\" + eventName);\n  if (!encoded) return {};\n  try {\n    const parsed = JSON.parse(encoded);\n    return parsed && typeof parsed === \"object\" && !Array.isArray(parsed) ? parsed : {};\n  } catch {\n    return {};\n  }\n}\n\n`;
if (!runtime.includes(modifiersAnchor)) throw new Error("readEventModifiers anchor not found");
runtime = runtime.replace(modifiersAnchor, localsHelper + modifiersAnchor);

const clientMarkerPrefix = "    attrs.push('data-rx-on-' + event.name + ";
const clientMarkerStart = runtime.indexOf(clientMarkerPrefix);
if (clientMarkerStart < 0) throw new Error("client event render marker prefix not found");
const clientMarkerEnd = runtime.indexOf("\n", clientMarkerStart);
if (clientMarkerEnd < 0) throw new Error("client event render marker line end not found");
const clientMarkerLine = runtime.slice(clientMarkerStart, clientMarkerEnd);
const clientMarkerWithLocals = [
  clientMarkerLine,
  '    if (event.locals && event.locals.length) {',
  '      const eventLocals = {};',
  '      for (const name of event.locals) {',
  '        if (Object.prototype.hasOwnProperty.call(locals, name)) eventLocals[name] = locals[name];',
  '      }',
  `      attrs.push('data-rx-locals-' + event.name + '=\\"' + escapeAttribute(JSON.stringify(eventLocals)) + '\\"');`,
  '    }',
].join("\n");
runtime = runtime.slice(0, clientMarkerStart) + clientMarkerWithLocals + runtime.slice(clientMarkerEnd);

await writeFile(runtimePath, runtime, "utf8");
console.log(`Patched resumable event locals (server render markers: ${serverCount}).`);
