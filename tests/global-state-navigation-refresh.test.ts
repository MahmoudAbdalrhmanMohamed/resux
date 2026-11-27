import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { defineComponent, getClientRuntimeSource, renderApp, type ComponentDefinition } from "resuxjs/runtime";

// Regression: after client navigation the new page is server-rendered with the server's default global
// values. It must show the client's current value, as the state guide promises ("preserved during
// client navigation").

const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "bump" }], children: [{ type: "text", value: "Bump" }] },
  { type: "element", tag: "span", attrs: [{ kind: "static", name: "id", value: "n" }], events: [], children: [{ type: "interpolation", expression: "hits.value.n", bindingId: "b0" }] }
];
async function script(ctx: any) {
  const hits = ctx.useGlobalState("hits", () => ({ n: 0 }));
  function bump() { hits.value.n += 1; }
  return { hits, bump };
}
const counter: ComponentDefinition = defineComponent({ id: "nav-counter", name: "NavCounter", file: "NavCounter.vue", handlers: ["bump"], script, template: template as never });

// The page navigated to uses a different component that only reads the key (no handler, never resumed).
const readerTemplate = [{ type: "element", tag: "span", attrs: [{ kind: "static", name: "id", value: "r" }], events: [], children: [{ type: "interpolation", expression: "hits.value.n", bindingId: "b0" }] }];
const reader: ComponentDefinition = defineComponent({ id: "nav-reader", name: "NavReader", file: "NavReader.vue", handlers: [], script, template: readerTemplate as never });

function pageFor(name: string, tag: string): ComponentDefinition {
  return defineComponent({
    id: name, name, file: name + ".vue", handlers: [], async script() { return {}; },
    template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "element", tag, attrs: [], events: [], children: [] }] }]
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the navigation refresh.");
}

describe("global state across client navigation", () => {
  it("shows the client's current value on the page navigated to", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-global-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "counter.mjs");
    const runtimeUrl = `${pathToFileURL(runtimeFile).href}?test=${Date.now()}`;
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(componentFile, `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = ${JSON.stringify(template)};
const script = ${script.toString()};
export default createClientComponent({ id: "nav-counter", name: "NavCounter", file: "NavCounter.vue", handlers: ["bump"], script, template });
`, "utf8");

    const readerFile = path.join(tempDir, "reader.mjs");
    await writeFile(readerFile, `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = ${JSON.stringify(readerTemplate)};
const script = ${script.toString()};
export default createClientComponent({ id: "nav-reader", name: "NavReader", file: "NavReader.vue", handlers: [], script, template });
`, "utf8");

    const options = {
      components: { NavCounter: counter, NavReader: reader },
      modules: { "nav-counter": pathToFileURL(componentFile).href, "nav-reader": pathToFileURL(readerFile).href }
    };
    const first = await renderApp({ page: pageFor("PageA", "NavCounter"), route: { path: "/", params: {}, query: {} }, ...options });
    const next = await renderApp({ page: pageFor("PageB", "NavReader"), route: { path: "/next", params: {}, query: {} }, ...options });

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `<div id="__resux"><a href="/next">Next</a>${first.html}</div>`;
    Object.assign(globalThis, {
      document: window.document, window, location: window.location, history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(JSON.stringify({ html: next.html, head: { title: "Next" }, payload: JSON.parse(JSON.stringify(next.payload)) }), { status: 200, headers: { "content-type": "application/json" } }),
      __RESUX__: first.payload, __RESUX_INSTALLED__: false,
      __RESUX_GLOBAL_STATE_REFS__: new Map(), __RESUX_GLOBAL_STATE_SNAPSHOTS__: new Map()
    });
    await import(runtimeUrl);

    const shown = () => window.document.querySelector("#n")?.textContent?.trim();
    window.document.querySelector<HTMLButtonElement>("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitFor(() => shown() === "1");

    window.document.querySelector<HTMLAnchorElement>('a[href="/next"]')!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitFor(() => window.document.querySelector("#r") !== null);
    const nextShown = () => window.document.querySelector("#r")?.textContent?.trim();
    await waitFor(() => nextShown() === "1", 1500).catch(() => undefined);
    expect(nextShown()).toBe("1");
  });
});
