import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { iconRegistry } from "../src/icons/registry.js";
import {
  createServerSetupContext,
  defineComponent,
  getClientRuntimeSource,
  readBody,
  renderApp,
  renderDocument,
  renderTemplateNodesAsync,
  setHeader,
  type ComponentDefinition
} from "resuxjs/runtime";


let runtimeImportCounter = 0;
export function nextRuntimeImportQuery() {
  runtimeImportCounter += 1;
  return `${Date.now()}-${runtimeImportCounter}`;
}

export function createTestMatchMedia(matches: (query: string) => boolean) {
  return (query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  });
}

export async function installRouteTestRuntime(
  window: Window,
  fetchImpl: typeof fetch,
  extras: Record<string, unknown> = {},
): Promise<void> {
  const tempDir = path.join(os.tmpdir(), `resux-route-runtime-${Date.now()}-${nextRuntimeImportQuery()}`);
  await mkdir(tempDir, { recursive: true });
  const runtimeFile = path.join(tempDir, "runtime-client.mjs");
  await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
  Object.assign(globalThis, {
    document: window.document,
    window,
    location: window.location,
    history: window.history,
    fetch: fetchImpl,
    __RESUX__: {
      route: { path: window.location.pathname, params: {}, query: {} },
      scopes: {},
      modules: {},
      config: { public: {} }
    },
    __RESUX_INSTALLED__: false,
    ...extras
  });
  await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
}

export function createRouteTestResponse(pathname: string, html: string, links: Array<Record<string, unknown>>) {
  return new Response(JSON.stringify({
    payload: { route: { path: pathname, params: {}, query: {} }, scopes: {}, modules: {}, config: { public: {} } },
    html,
    head: { link: links }
  }), { status: 200, headers: { "content-type": "application/json" } });
}

export async function createClientRuntimeFixture(
  prefix: string,
  moduleSource: (runtimeUrl: string) => string,
): Promise<{ runtimeUrl: string; handlerUrl: string }> {
  const tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${runtimeImportCounter + 1}`);
  await mkdir(tempDir, { recursive: true });
  const runtimeFile = path.join(tempDir, "runtime-client.mjs");
  const handlerFile = path.join(tempDir, "handler.mjs");
  await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
  const runtimeUrl = pathToFileURL(runtimeFile).href;
  await writeFile(handlerFile, moduleSource(runtimeUrl), "utf8");
  return { runtimeUrl, handlerUrl: pathToFileURL(handlerFile).href };
}

export function installClientRuntimeFixture(
  window: Window,
  state: Record<string, unknown>,
  handlerUrl: string,
): void {
  Object.assign(globalThis, {
    document: window.document,
    window,
    location: window.location,
    history: window.history,
    scrollTo: () => undefined,
    __RESUX__: {
      route: { path: "/", params: {}, query: {} },
      scopes: {
        s0: { id: "s0", moduleId: "m0", state, asyncData: {} },
      },
      modules: { m0: handlerUrl },
    },
    __RESUX_APP__: undefined,
    __RESUX_ROUTER__: undefined,
    __RESUX_INSTALLED__: false,
  });
}

export async function renderRuntimePage(page: ComponentDefinition) {
  const result = await renderApp({
    page,
    route: { path: "/", params: {}, query: {} },
  });
  const parsed = new Window({ url: "http://localhost/" });
  parsed.document.body.innerHTML = result.html;
  return { result, parsed };
}

export type ManagedTeleportCommentRecord = {
  node: Comment;
  metadata: {
    to?: string;
    toBinding?: string;
    liveTargetToken?: string;
    disabled?: boolean;
    defer?: boolean;
    bindings?: Record<string, string>;
    html?: string;
    ssrKey?: string;
  };
};

export function managedTeleportSourceComment(metadata: ManagedTeleportCommentRecord["metadata"]): string {
  const encoded = encodeURIComponent(JSON.stringify(metadata)).replaceAll("-", "%2D");
  return `<!--resux-teleport-source:${encoded}--><!--resux-teleport-end-->`;
}

export type ClientComponentRuntimeFixtureOptions = {
  prefix: string;
  componentName: string;
  template: unknown[];
  scriptSource: string;
  handlers: string[];
};

export async function createClientComponentRuntimeFixture(
  options: ClientComponentRuntimeFixtureOptions,
): Promise<{ runtimeUrl: string; handlerUrl: string }> {
  return createClientRuntimeFixture(options.prefix, (runtimeUrl) => `
import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = ${JSON.stringify(options.template)};
${options.scriptSource}
export default createClientComponent({
  id: "m0",
  name: ${JSON.stringify(options.componentName)},
  file: ${JSON.stringify(options.componentName + ".vue")},
  script,
  template,
  handlers: ${JSON.stringify(options.handlers)},
});
`);
}

export type DynamicTeleportRuntimeFixtureOptions = {
  prefix: string;
  componentName: string;
  initialTarget: string;
  nextTarget: string;
  children: unknown[];
};

export async function createDynamicTeleportRuntimeFixture(
  options: DynamicTeleportRuntimeFixtureOptions,
): Promise<{ runtimeUrl: string; handlerUrl: string }> {
  return createClientComponentRuntimeFixture({
    prefix: options.prefix,
    componentName: options.componentName,
    template: [
      {
        type: "element",
        tag: "button",
        attrs: [],
        events: [{ name: "click", handler: "move" }],
        children: [{ type: "text", value: "Move" }],
      },
      {
        type: "element",
        tag: "teleport",
        attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }],
        events: [],
        children: options.children,
      },
    ],
    scriptSource: `
export async function script(ctx) {
  const target = ctx.useState("target", () => ${JSON.stringify(options.initialTarget)});
  function move() { target.value = ${JSON.stringify(options.nextTarget)}; }
  return { target, move };
}`,
    handlers: ["move"],
  });
}

export function managedTeleportBindingSourceComment(to: string, html: string): string {
  return managedTeleportSourceComment({
    to,
    disabled: false,
    defer: false,
    bindings: { b0: "s0:b0" },
    html,
  });
}

export function clickRuntimeFixture(window: Window, id: string): void {
  window.document.getElementById(id)!.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, button: 0 }),
  );
}

export function resetClientRuntimeFixture(): void {
  for (const key of ["document", "window", "location", "history", "scrollTo", "__RESUX__", "__RESUX_APP__", "__RESUX_ROUTER__", "__RESUX_INSTALLED__"]) {
    delete (globalThis as any)[key];
  }
}

export function managedTeleportCommentRecords(root: Node): ManagedTeleportCommentRecord[] {
  const records: ManagedTeleportCommentRecord[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === 8) {
      const comment = node as Comment;
      const prefix = "resux-teleport-source:";
      if (comment.data.startsWith(prefix)) {
        records.push({
          node: comment,
          metadata: JSON.parse(decodeURIComponent(comment.data.slice(prefix.length))),
        });
      }
    }
    for (const child of Array.from(node.childNodes)) {
      visit(child);
    }
  };
  visit(root);
  return records;
}



export async function waitForText(window: Window, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (window.document.querySelector("[data-rx-text='s0:b0']")?.textContent === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export async function waitForHtml(window: Window, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (window.document.body.innerHTML.includes(expected)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export async function waitForSignal(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    if ((globalThis as any).__RESUX_TEST_SIGNAL__) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  }
