import { readFile, writeFile } from "node:fs/promises";

const runtimePath = "src/runtime/index.ts";
const testsPath = "tests/resumable-event-locals.test.ts";

let runtime = await readFile(runtimePath, "utf8");

const syncStart = runtime.indexOf("function renderNativeElement(");
const syncEnd = runtime.indexOf("\n\nexport async function renderTemplateNodesAsync", syncStart);
if (syncStart < 0 || syncEnd < 0) {
  throw new Error("Could not locate sync native renderer");
}

const sharedRenderer = `function appendNativeEventAttributes(
  attrs: string[],
  event: ElementTemplateNode["events"][number],
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): void {
  attrs.push(\`data-rx-on-\${event.name}=\"\${context.scopeId}:\${context.moduleId}:\${event.handler}\"\`);

  if (event.locals?.length) {
    const eventLocals: Record<string, unknown> = {};
    for (const name of event.locals) {
      if (!Object.hasOwn(locals, name)) continue;
      const value = locals[name];
      if (value === undefined) continue;
      assertJsonSerializable(value, \`event local "\${name}"\`);
      eventLocals[name] = value;
    }
    attrs.push(\`data-rx-locals-\${event.name}=\"\${escapeAttribute(JSON.stringify(eventLocals))}\"\`);
  }

  if (event.modifiers?.length) {
    attrs.push(\`data-rx-mod-\${event.name}=\"\${escapeAttribute(event.modifiers.join(","))}\"\`);
  }
}

function collectNativeElementAttributes(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string[] {
  const attrs: string[] = [];

  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(\`\${attrName}=\"\${escapeAttribute(attr.value)}\"\`);
      continue;
    }

    const value = evaluateExpression(attr.value, context.scope, locals);
    if (value === false || value === null || value === undefined) continue;

    const marker = attr.bindingId ? \` data-rx-attr-\${attr.bindingId}=\"\${context.scopeId}:\${attr.bindingId}\"\` : "";
    attrs.push(\`\${attrName}=\"\${escapeAttribute(stringifyAttributeValue(attrName, value))}\"\${marker}\`);
  }

  for (const event of node.events) {
    appendNativeEventAttributes(attrs, event, context, locals);
  }

  if (node.html) {
    attrs.push(\`data-rx-html-\${node.html.bindingId}=\"\${context.scopeId}:\${node.html.bindingId}\"\`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);
  return attrs;
}

function renderNativeElement(node: ElementTemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  const attrs = collectNativeElementAttributes(node, context, locals);
  const tag = nativeElementTag(node);
  const attrText = attrs.length > 0 ? \` \${attrs.join(" ")}\` : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, context.scope, locals))
    : renderTemplateNodes(node.children, context, locals);
  return \`<\${tag}\${attrText}>\${children}</\${tag}>\`;
}`;

runtime = runtime.slice(0, syncStart) + sharedRenderer + runtime.slice(syncEnd);

const asyncStart = runtime.indexOf("async function renderNativeElementAsync(");
const asyncEnd = runtime.indexOf("\n\ninterface ResuxImageRenderInput", asyncStart);
if (asyncStart < 0 || asyncEnd < 0) {
  throw new Error("Could not locate async native renderer");
}

const asyncRenderer = `async function renderNativeElementAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  renderComponent: (component: ComponentDefinition, props?: ComponentProps, renderSlot?: () => Promise<string>) => Promise<string>,
  locals: Record<string, unknown>
): Promise<string> {
  const attrs = collectNativeElementAttributes(node, context, locals);
  const tag = nativeElementTag(node);
  const attrText = attrs.length > 0 ? \` \${attrs.join(" ")}\` : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, context.scope, locals))
    : await renderTemplateNodesAsync(node.children, context, renderComponent, locals);
  return \`<\${tag}\${attrText}>\${children}</\${tag}>\`;
}`;

runtime = runtime.slice(0, asyncStart) + asyncRenderer + runtime.slice(asyncEnd);
await writeFile(runtimePath, runtime);

let tests = await readFile(testsPath, "utf8");
tests = tests.replace(
  "  getClientRuntimeSource,\n  renderTemplateNodesAsync,",
  "  getClientRuntimeSource,\n  renderTemplateNodes,\n  renderTemplateNodesAsync,",
);

const asyncTestAnchor = `  it("omits undefined event-local values during async SSR instead of failing serialization", async () => {`;
if (!tests.includes(asyncTestAnchor)) {
  throw new Error("Could not locate event-local async SSR regression test");
}
const syncTest = `  it("omits undefined event-local values during sync SSR instead of failing serialization", () => {
    const node: ElementTemplateNode = {
      type: "element",
      tag: "button",
      attrs: [],
      events: [{ name: "click", handler: "select", locals: ["item"] }],
      children: [{ type: "text", value: "Select" }],
    };
    const html = renderTemplateNodes(
      [node],
      {
        scope: {},
        scopeId: "s0",
        moduleId: "m0",
        route: { path: "/", params: {}, query: {} },
        runtimeConfig: { public: {} },
        components: {},
        layouts: {},
        pageMeta: {},
      } as any,
      { item: undefined },
    );
    expect(html).toContain('data-rx-locals-click="{}"');
  });

`;
tests = tests.replace(asyncTestAnchor, syncTest + asyncTestAnchor);
await writeFile(testsPath, tests);
