import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { createServerSetupContext, getClientRuntimeSource, renderDocument, renderTemplateNodesAsync, type ComponentDefinition } from "resuxjs/runtime";
import { createClientRuntimeFixture, installClientRuntimeFixture, managedTeleportSourceComment, nextRuntimeImportQuery, script, waitForCondition, waitForHtml, waitForText } from "./helpers/runtime-fixtures.js";

describe("client resume loader", () => {
  it("keeps apiURL relative in browser/client scopes", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-client-api-url-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [{ type: "interpolation", expression: "direct", bindingId: "b0" }];
async function script(ctx) {
  function reveal() {}
  return { direct: ctx.apiURL("/api/test"), reveal };
}
export default createClientComponent({ id: "m0", name: "ApiUrl", file: "ApiUrl.vue", script, template: __template, handlers: ["reveal"] });
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <button data-rx-on-click="s0:m0:reveal">Reveal</button>
      <span data-rx-text="s0:b0"></span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: {
            id: "s0",
            moduleId: "m0",
            state: {},
            asyncData: {}
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForText(window, "/api/test");

    expect(window.document.querySelector("[data-rx-text='s0:b0']")?.textContent).toBe("/api/test");
  });

  it("animates conditional blocks and keeps inserted resumable handlers fully scoped", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-transition-block",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggle" }], children: [{ type: "text", value: "Toggle" }] },
  { type: "element", tag: "transition", attrs: [{ kind: "dynamic", name: "name", value: "effect.value", bindingId: "b3" }], events: [], children: [
    { type: "element", tag: "div", attrs: [], events: [], if: { expression: "visible.value", blockId: "b0" }, children: [
      { type: "element", tag: "button", attrs: [{ kind: "dynamic", name: "disabled", value: "locked.value", bindingId: "b1" }], events: [{ name: "click", handler: "ping" }], children: [
        { type: "interpolation", expression: "hits.value", bindingId: "b2" }
      ] }
    ] }
  ] }
];
async function script(ctx) {
  const visible = ctx.useState("visible", () => false);
  const locked = ctx.useState("locked", () => false);
  const hits = ctx.useState("hits", () => 0);
  const effect = ctx.useState("effect", () => "fade");
  function toggle() { visible.value = !visible.value; }
  function ping() { hits.value += 1; }
  function swapEffect() { effect.value = "slide"; }
  return { visible, locked, hits, effect, toggle, ping, swapEffect };
}
export default createClientComponent({ id: "m0", name: "TransitionPanel", file: "TransitionPanel.vue", script, template, handlers: ["toggle", "ping", "swapEffect"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = `<style>
      .fade-enter-active,.fade-leave-active{transition:opacity .04s linear}
      .fade-enter-from,.fade-leave-to{opacity:0}
      .fade-enter-to,.fade-leave-from{opacity:1}
    </style>`;
    window.document.body.innerHTML = `
      <button id="toggle" data-rx-on-click="s0:m0:toggle">Toggle</button>
      <button id="effect" data-rx-on-click="s0:m0:swapEffect">Effect</button>
      <span data-rx-transition="fade" data-rx-attr-b3="s0:b3" data-rx-block="s0:b0" style="display: contents;"></span>
    `;

    installClientRuntimeFixture(
      window,
      { visible: false, locked: false, hits: 0, effect: "fade" },
      handlerUrl,
    );

    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
    window.document.getElementById("toggle")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    await waitForCondition(() => Boolean(window.document.querySelector('[data-rx-on-click="s0:m0:ping"]')));
    const inserted = window.document.querySelector('[data-rx-on-click="s0:m0:ping"]') as HTMLElement;
    expect(inserted).toBeTruthy();
    expect(inserted.getAttribute("data-rx-attr-b1")).toBe("s0:b1");
    expect(window.document.querySelector('[data-rx-text="s0:b2"]')?.textContent).toBe("0");

    inserted.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForCondition(() => (globalThis as any).__RESUX__.scopes.s0.state.hits === 1);
    expect((globalThis as any).__RESUX__.scopes.s0.state.hits).toBe(1);
    expect(window.document.querySelector('[data-rx-text="s0:b2"]')?.textContent).toBe("1");

    window.document.getElementById("toggle")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => !window.document.querySelector('[data-rx-on-click="s0:m0:ping"]'));
    expect(window.document.querySelector('[data-rx-block="s0:b0"]')?.textContent).toBe("");

    window.document.getElementById("effect")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => window.document.querySelector('[data-rx-block="s0:b0"]')?.getAttribute("data-rx-transition") === "slide");
    expect(window.document.querySelector('[data-rx-block="s0:b0"]')?.getAttribute("data-rx-transition")).toBe("slide");
  });

  it("resumes pending async data and patches skeleton blocks", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-pending-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.pending.value", blockId: "b0" }, children: [{ type: "text", value: "Loading stats" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "!stats.pending.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "stats.value.value.label", bindingId: "b2" }] },
  { type: "element", tag: "teleport", attrs: [
    { kind: "static", name: "to", value: "#pending-async-target" },
    { kind: "static", name: "defer", value: "" }
  ], events: [], children: [{ type: "element", tag: "p", attrs: [{ kind: "static", name: "id", value: "pending-deferred-content" }], events: [], children: [{ type: "text", value: "Deferred" }] }] },
  { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "pending-async-target" }], events: [], if: { expression: "!stats.pending.value", blockId: "b3" }, children: [] }
];
async function script(ctx) {
  const stats = ctx.useAsyncData("stats", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { label: "Ready" };
  });
  return { stats };
}
export default createClientComponent({ id: "m0", name: "Stats", file: "Stats.vue", script, template: __template, handlers: [] });
`,
      "utf8"
    );

    const pendingTeleport = managedTeleportSourceComment({
      to: "#pending-async-target",
      disabled: false,
      defer: true,
      html: '<p id="pending-deferred-content">Deferred</p>',
    });
    const window = new Window();
    window.document.body.innerHTML = `
      ${pendingTeleport}
      <span data-rx-block="s0:b0"><p>Loading stats</p></span>
      <span data-rx-block="s0:b1"></span>
      <span data-rx-block="s0:b3"></span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: {
            id: "s0",
            moduleId: "m0",
            state: {},
            asyncData: {
              stats: { value: null, pending: true, error: null }
            }
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    await waitForHtml(window, "Ready");
    await waitForCondition(() =>
      Boolean(window.document.getElementById("pending-async-target")?.querySelector("#pending-deferred-content")),
    );

    expect(window.document.body.innerHTML).not.toContain("Loading stats");
    expect(window.document.getElementById("pending-async-target")?.querySelector("#pending-deferred-content")).toBeTruthy();
    expect((globalThis as any).__RESUX__.scopes.s0.asyncData.stats).toEqual({
      value: { label: "Ready" },
      pending: false,
      error: null
    });
  });

  it("clears pending async-data skeletons and renders an error when fetch fails", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-pending-error-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.pending.value", blockId: "b0" }, children: [{ type: "text", value: "Loading stats" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.error.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "stats.error.value.message", bindingId: "b2" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "!stats.pending.value && !stats.error.value", blockId: "b3" }, children: [{ type: "interpolation", expression: "stats.value.value.label", bindingId: "b4" }] }
];
async function script(ctx) {
  const stats = ctx.useAsyncData("stats", () => ctx.$fetch("/api/stats"));
  return { stats };
}
export default createClientComponent({ id: "m0", name: "Stats", file: "Stats.vue", script, template: __template, handlers: [] });
`,
      "utf8"
    );

    const window = new Window();
    window.document.body.innerHTML = `
      <span data-rx-block="s0:b0"><p>Loading stats</p></span>
      <span data-rx-block="s0:b1"></span>
      <span data-rx-block="s0:b3"></span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      fetch: async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: {
            id: "s0",
            moduleId: "m0",
            state: {},
            asyncData: {
              stats: { value: null, pending: true, error: null }
            }
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    await waitForHtml(window, "Fetch failed for /api/stats: 500");

    expect(window.document.body.innerHTML).not.toContain("Loading stats");
    expect((globalThis as any).__RESUX__.scopes.s0.asyncData.stats).toEqual({
      value: null,
      pending: false,
      error: {
        name: "Error",
        message: "Fetch failed for /api/stats: 500"
      }
    });
  });

  it("renders successful async data when another pending request fails", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-partial-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "profile.pending.value", blockId: "b0" }, children: [{ type: "text", value: "Loading profile" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "!profile.pending.value && !profile.error.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "profile.value.value.name", bindingId: "b2" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.pending.value", blockId: "b3" }, children: [{ type: "text", value: "Loading stats" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.error.value", blockId: "b4" }, children: [{ type: "interpolation", expression: "stats.error.value.message", bindingId: "b5" }] }
];
async function script(ctx) {
  const profile = ctx.useAsyncData("profile", () => ctx.$fetch("/api/profile"));
  const stats = ctx.useAsyncData("stats", () => ctx.$fetch("/api/stats"));
  return { profile, stats };
}
export default createClientComponent({ id: "m0", name: "Home", file: "Home.vue", script, template: __template, handlers: [] });
`,
      "utf8"
    );

    const window = new Window();
    window.document.body.innerHTML = `
      <span data-rx-block="s0:b0"><p>Loading profile</p></span>
      <span data-rx-block="s0:b1"></span>
      <span data-rx-block="s0:b3"><p>Loading stats</p></span>
      <span data-rx-block="s0:b4"></span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      fetch: async (url: string) => url.includes("profile")
        ? new Response(JSON.stringify({ name: "Ada" }), { status: 200 })
        : new Response("Server exploded", { status: 500 }),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: {
            id: "s0",
            moduleId: "m0",
            state: {},
            asyncData: {
              profile: { value: null, pending: true, error: null },
              stats: { value: null, pending: true, error: null }
            }
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    await waitForHtml(window, "Ada");
    await waitForHtml(window, "Fetch failed for /api/stats: 500");

    expect(window.document.body.innerHTML).not.toContain("Loading profile");
    expect(window.document.body.innerHTML).not.toContain("Loading stats");
    expect((globalThis as any).__RESUX__.scopes.s0.asyncData.profile).toEqual({
      value: { name: "Ada" },
      pending: false,
      error: null
    });
    expect((globalThis as any).__RESUX__.scopes.s0.asyncData.stats.pending).toBe(false);
    expect((globalThis as any).__RESUX__.scopes.s0.asyncData.stats.error?.message).toBe("Fetch failed for /api/stats: 500");
  });

  it("imports the handler chunk on interaction and reuses the resumed scope", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [{ type: "interpolation", expression: "count.value", bindingId: "b0" }];
async function script(ctx) {
  globalThis.__setupRuns = (globalThis.__setupRuns ?? 0) + 1;
  const count = ctx.useState("count", () => 0);
  function increment() {
    count.value++;
  }
  return { count, increment };
}
export default createClientComponent({ id: "m0", name: "Counter", file: "Counter.vue", script, template: __template, handlers: ["increment"] });
`,
      "utf8"
    );

    const window = new Window();
    window.document.body.innerHTML = `
      <button data-rx-on-click="s0:m0:increment">Increment</button>
      <span data-rx-text="s0:b0">0</span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "m0", state: { count: 0 }, asyncData: {} }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __setupRuns: 0,
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.Event("click", { bubbles: true }));
    await waitForText(window, "1");
    window.document.querySelector("button")!.dispatchEvent(new window.Event("click", { bubbles: true }));
    await waitForText(window, "2");

    expect(window.document.querySelector("[data-rx-text='s0:b0']")?.textContent).toBe("2");
    expect((globalThis as any).__setupRuns).toBe(1);
  });

  it("navigates programmatically with useRouter from a resumed handler", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-router-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [];
async function script(ctx) {
  const router = ctx.useRouter();
  function goAbout() {
    return router.push("/about");
  }
  return { router, goAbout };
}
export default createClientComponent({ id: "m0", name: "RouterPage", file: "RouterPage.vue", script, template: __template, handlers: ["goAbout"] });
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button data-rx-on-click="s0:m0:goAbout">About</button>
        <main>Home</main>
      </div>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(
        JSON.stringify({
          html: "<main>About</main>",
          head: { title: "About" },
          payload: {
            route: { path: "/about", params: {}, query: {} },
            scopes: {},
            modules: {}
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      ),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "m0", state: {}, asyncData: {} }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>About</main>");

    expect(window.location.pathname).toBe("/about");
    expect((globalThis as any).__RESUX__.route.path).toBe("/about");
    expect(window.document.title).toBe("About");
  });

  it("applies resumable event modifiers before running handlers", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-modifiers-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [{ type: "interpolation", expression: "count.value", bindingId: "b0" }];
async function script(ctx) {
  const count = ctx.useState("count", () => 0);
  function save() {
    count.value++;
  }
  return { count, save };
}
export default createClientComponent({ id: "m0", name: "Form", file: "Form.vue", script, template: __template, handlers: ["save"] });
`,
      "utf8"
    );

    const window = new Window();
    window.document.body.innerHTML = `
      <form data-rx-on-submit="s0:m0:save" data-rx-mod-submit="prevent">
        <span data-rx-text="s0:b0">0</span>
      </form>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "m0", state: { count: 0 }, asyncData: {} }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const event = new window.Event("submit", { bubbles: true, cancelable: true });
    const allowed = window.document.querySelector("form")!.dispatchEvent(event);
    await waitForText(window, "1");

    expect(allowed).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it("resumes v-model handlers and mounted callbacks on first interaction", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-model-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "input", attrs: [{ kind: "dynamic", name: "value", value: "message.value", bindingId: "b1" }], events: [{ name: "input", handler: "__rx_inline_0" }], children: [] },
  { type: "interpolation", expression: "message.value + ':' + mounted.value", bindingId: "b0" }
];
async function script(ctx) {
  const message = ctx.useState("message", () => "Hello");
  const mounted = ctx.useState("mounted", () => false);
  ctx.onMounted(() => {
    mounted.value = true;
  });
  function __rx_inline_0($event) {
    message.value = $event.target ? $event.target.value : "";
  }
  return { message, mounted, __rx_inline_0 };
}
export default createClientComponent({ id: "m0", name: "Model", file: "Model.vue", script, template: __template, handlers: ["__rx_inline_0"] });
`,
      "utf8"
    );

    const window = new Window();
    window.document.body.innerHTML = `
      <input data-rx-on-input="s0:m0:__rx_inline_0" data-rx-attr-b1="s0:b1" value="Hello">
      <span data-rx-text="s0:b0">Hello:false</span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "m0", state: { message: "Hello", mounted: false }, asyncData: {} }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const input = window.document.querySelector("input") as HTMLInputElement;
    input.value = "Typed";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await waitForText(window, "Typed:true");

    expect(input.value).toBe("Typed");
    expect((globalThis as any).__RESUX__.scopes.s0.state).toEqual({
      message: "Typed",
      mounted: true
    });
  });

  it("hot-updates active component scopes in dev without reloading the document", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-hmr-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    const createModule = (label: string) => `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [{ type: "interpolation", expression: "count.value + ':${label}'", bindingId: "b0" }];
async function script(ctx) {
  const count = ctx.useState("count", () => 0);
  function increment() {
    count.value++;
  }
  return { count, increment };
}
export default createClientComponent({ id: "m0", name: "Counter", file: "Counter.vue", script, template: __template, handlers: ["increment"] });
`;
    await writeFile(handlerFile, createModule("old"), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button data-rx-on-click="s0:m0:increment">Increment</button>
        <span data-rx-text="s0:b0">0:old</span>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "m0", state: { count: 0 }, asyncData: {} }
        },
        modules: { m0: pathToFileURL(handlerFile).href }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForText(window, "1:old");

    await writeFile(handlerFile, createModule("new"), "utf8");
    await (window as any).__RESUX_APPLY_DEV_UPDATE__({ revision: Date.now() });
    await waitForText(window, "1:new");

    expect(window.document.getElementById("__resux")).toBeTruthy();
    expect((globalThis as any).__RESUX__.scopes.s0.state.count).toBe(1);
  });

  it("safely handles head style entries with undefined css content without throwing TypeError", () => {
    const result = {
      html: "<div>test</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: {
        style: [
          { id: "s1", css: undefined },
          { id: "s2", content: ".test { color: red; }" },
          "body { background: black; }",
          null as any
        ] as any
      }
    };
    const doc = renderDocument(result as any, "Test Title");
    expect(doc).toContain('<style data-rx-head="true" data-rx-style="s1"></style>');
    expect(doc).toContain('<style data-rx-head="true" data-rx-style="s2">.test { color: red; }</style>');
    expect(doc).toContain('<style data-rx-head="true">body { background: black; }</style>');
  });

  it("emits the fallback charset before long head links when no charset is declared", () => {
    const result = {
      html: "<div>test</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: {
        link: [{ rel: "preload", href: `/${"hero-".repeat(300)}.jpg`, as: "image" }]
      }
    };
    const doc = renderDocument(result as any, "Test Title");
    const charsetIndex = doc.indexOf('<meta charset="utf-8">');
    const viewportIndex = doc.indexOf('<meta name="viewport" content="width=device-width, initial-scale=1">');
    const preloadIndex = doc.indexOf('href="/hero-');
    expect(charsetIndex).toBeGreaterThan(-1);
    expect(viewportIndex).toBeGreaterThan(-1);
    expect(charsetIndex).toBeLessThan(preloadIndex);
    expect(viewportIndex).toBeLessThan(preloadIndex);
    expect(doc.match(/<meta charset=/g)).toHaveLength(1);
    expect(doc.match(/name="viewport"/g)).toHaveLength(1);
  });

  it("renders head script and noscript entries used by async font loading", () => {
    const result = {
      html: "<div>test</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: {
        script: [{
          "data-resux-font-loader": "true",
          innerHTML: "window.__fontLoaded=true;</script><script>alert(1)</script>"
        }],
        noscript: [{
          link: [{ rel: "stylesheet", href: "https://fonts.example.test/font.css" }]
        }]
      }
    };
    const doc = renderDocument(result as any, "Test Title");
    expect(doc).toContain('<noscript data-rx-head="true"><link rel="stylesheet" href="https://fonts.example.test/font.css"></noscript>');
    expect(doc).toContain('data-resux-font-loader="true"');
    expect(doc).toContain("<\\/script>");
    expect(doc).not.toContain("</script><script>alert(1)</script>");
  });

  it("renders critical head meta tags before title and preload links and supports textContent in styles", () => {
    const result = {
      html: "<div>test</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: {
        title: "Test Page",
        meta: [
          { name: "description", content: "A regular page description" },
          { charset: "utf-8" },
          { name: "viewport", content: "width=device-width, initial-scale=1" },
          { "http-equiv": "X-UA-Compatible", content: "IE=edge" },
          { property: "og:title", content: "OG Title" }
        ],
        link: [
          { rel: "preload", href: "/large-hero.jpg", as: "image", fetchpriority: "high" },
          { rel: "preload", href: "/critical.css", as: "style" },
          { rel: "stylesheet", href: "/theme.css" }
        ],
        style: [
          { id: "s-text", textContent: "h1 { font-size: 2rem; }" }
        ]
      }
    };
    const doc = renderDocument(result as any, "Test Title");

    const charsetIndex = doc.indexOf('<meta data-rx-head="true" charset="utf-8">');
    const viewportIndex = doc.indexOf('<meta data-rx-head="true" name="viewport" content="width=device-width, initial-scale=1">');
    const httpEquivIndex = doc.indexOf('<meta data-rx-head="true" http-equiv="X-UA-Compatible" content="IE=edge">');
    const titleIndex = doc.indexOf('<title>Test Page</title>');
    const preloadImageIndex = doc.indexOf('href="/large-hero.jpg"');
    const descIndex = doc.indexOf('name="description"');

    expect(charsetIndex).toBeGreaterThan(-1);
    expect(viewportIndex).toBeGreaterThan(-1);
    expect(httpEquivIndex).toBeGreaterThan(-1);
    expect(charsetIndex).toBeLessThan(titleIndex);
    expect(viewportIndex).toBeLessThan(titleIndex);
    expect(httpEquivIndex).toBeLessThan(titleIndex);
    expect(titleIndex).toBeLessThan(preloadImageIndex);
    expect(preloadImageIndex).toBeLessThan(descIndex);

    const preloadStyleIndex = doc.indexOf('href="/critical.css"');
    const stylesheetIndex = doc.indexOf('href="/theme.css"');
    expect(preloadStyleIndex).toBeLessThan(descIndex);
    expect(preloadStyleIndex).toBeLessThan(stylesheetIndex);

    expect(doc).toContain('<style data-rx-head="true" data-rx-style="s-text">h1 { font-size: 2rem; }</style>');
    expect(doc).not.toContain("[object Object]");
    expect(doc.match(/name="viewport"/g)).toHaveLength(1);
  });

  it("renders built-in <Icon>, <ResuxIcon>, and <NuxtIcon> tags without throwing Unknown component error", async () => {
    const template: TemplateNode[] = [
      {
        type: "element",
        tag: "Icon",
        attrs: [{ name: "name", value: "solar:leaf-outline", kind: "static" }, { name: "size", value: "24px", kind: "static" }],
        children: [],
        events: []
      },
      {
        type: "element",
        tag: "ResuxIcon",
        attrs: [{ name: "name", value: "ph:check-circle-thin", kind: "static" }],
        children: [],
        events: []
      },
      {
        type: "element",
        tag: "NuxtIcon",
        attrs: [
          { name: "name", value: "material-symbols:mail", kind: "static" },
          { name: "class", value: "text-accent", kind: "static" }
        ],
        children: [],
        events: []
      }
    ];

    const context: any = {
      scopeId: "s0",
      moduleId: "m0",
      scope: {},
      components: {},
      pageMeta: {}
    };

    const rendered = await renderTemplateNodesAsync(template, context, async () => "");
    expect(rendered).toContain('data-icon-name="solar:leaf-outline"');
    expect(rendered).toContain('data-icon-name="ph:check-circle-thin"');
    expect(rendered).toContain('data-icon-name="material-symbols:mail"');
    expect(rendered).toContain('class="resux-icon text-accent"');
    expect(rendered).toContain('M20 4H4c-1.1 0-1.99.9-1.99 2');
    expect(rendered).not.toContain('M12 2L2 22h20L12 2z');
    expect(rendered).toContain('<svg');
  });

  it("resolves short component names like <GarySetion> to subfolder-prefixed components like PublicGarySetion", async () => {
    const template: TemplateNode[] = [
      {
        type: "element",
        tag: "GarySetion",
        attrs: [],
        children: [],
        events: []
      }
    ];

    const targetComponent: ComponentDefinition = {
      id: "c1",
      name: "PublicGarySetion",
      file: "components/public/GarySetion.vue",
      template: [{ type: "text", value: "hello from public gary section" }],
      handlers: [],
      styles: []
    };

    const context: any = {
      scopeId: "s0",
      moduleId: "m0",
      scope: {},
      components: {
        PublicGarySetion: targetComponent
      },
      pageMeta: {}
    };

    const rendered = await renderTemplateNodesAsync(template, context, async (comp) => {
      return comp.name;
    });
    expect(rendered).toBe("PublicGarySetion");
  });

  it("provides defineEmits, emit, defineExpose, defineSlots, defineOptions, and defineModel in setup context", async () => {
    const route: any = { path: "/", query: {}, params: {} };
    const props = { modelValue: "initial" };
    const stateRefs = {};
    const asyncDataRefs = {};
    const headEntries: any[] = [];
    const resuxApp: any = { route, payload: { route, scopes: {}, modules: [], config: {} }, $config: { public: {} }, provides: {}, provide: () => {} };
    const runtimeConfig: any = { public: {} };

    const ctx = createServerSetupContext(route, props, stateRefs, asyncDataRefs, headEntries, resuxApp, runtimeConfig);

    expect(typeof ctx.defineEmits).toBe("function");
    const emit = ctx.defineEmits(["update:modelValue"]);
    expect(typeof emit).toBe("function");
    expect(() => emit("update:modelValue", "val")).not.toThrow();

    expect(typeof ctx.emit).toBe("function");
    expect(() => ctx.emit("change")).not.toThrow();

    expect(typeof ctx.defineExpose).toBe("function");
    expect(() => ctx.defineExpose({ someMethod: () => {} })).not.toThrow();

    expect(typeof ctx.defineSlots).toBe("function");
    expect(ctx.defineSlots()).toEqual({});

    expect(typeof ctx.defineOptions).toBe("function");
    expect(() => ctx.defineOptions({ inheritAttrs: false })).not.toThrow();

    expect(typeof ctx.defineModel).toBe("function");
    const model = ctx.defineModel();
    expect(model.value).toBe("initial");
  });
});
