import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import {
  defineComponent,
  getClientRuntimeSource,
  readBody,
  renderApp,
  renderDocument,
  type ComponentDefinition
} from "@mahmoud-abdelrahman/resux/runtime";

describe("runtime SSR", () => {
  it("renders HTML and serialized state without eagerly loading handler chunks", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m0",
      name: "CounterPage",
      file: "CounterPage.vue",
      handlers: ["increment"],
      async script(ctx) {
        const count = ctx.useState("count", () => 0);
        function increment() {
          count.value++;
        }
        return { count, increment };
      },
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "increment" }],
          children: [{ type: "text", value: "Increment" }]
        },
        {
          type: "interpolation",
          expression: "count.value",
          bindingId: "b0"
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      modules: { m0: "/__resux/handlers/m0.mjs" }
    });
    const documentHtml = renderDocument(result);

    expect(result.html).toContain('data-rx-on-click="s0:m0:increment"');
    expect(result.payload.scopes.s0.state.count).toBe(0);
    expect(result.payload.scopes.s0.asyncData).toEqual({});
    expect(documentHtml).toContain('/__resux/runtime-client.mjs');
    expect(documentHtml).toContain('__resux-loading');
    expect(documentHtml).toContain('role="progressbar"');
    expect(documentHtml).toContain('data-rx-transition-message');
    expect(documentHtml).not.toContain('/__resux/dev-events');
    expect(documentHtml).not.toContain('<script type="module" src="/__resux/handlers/m0.mjs"');
  });

  it("can inject a dev reload listener without changing the resumability runtime", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m0",
      name: "DevPage",
      file: "DevPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Dev" }] }]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });
    const documentHtml = renderDocument(result, "Resux App", { devReload: true });

    expect(documentHtml).toContain('/__resux/dev-events');
    expect(documentHtml).toContain('__RESUX_APPLY_DEV_UPDATE__');
    expect(documentHtml).toContain('/__resux/runtime-client.mjs');
  });

  it("serializes route params and async data", async () => {
    const page = defineComponent({
      id: "m1",
      name: "PostPage",
      file: "PostPage.vue",
      handlers: [],
      async script(ctx) {
        const route = ctx.useRoute();
        const title = await ctx.useAsyncData("title", async () => `Post ${route.params.id}`);
        return { route, title };
      },
      template: [{ type: "interpolation", expression: "title.value", bindingId: "b0" }]
    });

    const result = await renderApp({
      page,
      route: { path: "/post/42", params: { id: "42" }, query: {} }
    });

    expect(result.html).toContain("Post 42");
    expect(result.payload.route.params.id).toBe("42");
    expect(result.payload.scopes.s0.asyncData.title).toEqual({
      value: "Post 42",
      pending: false,
      error: null
    });
  });

  it("captures async data errors without throwing", async () => {
    const page = defineComponent({
      id: "m3",
      name: "ErrorPage",
      file: "ErrorPage.vue",
      handlers: [],
      async script(ctx) {
        const data = await ctx.useAsyncData("broken", async () => {
          throw new Error("Backend unavailable");
        });
        return { data };
      },
      template: [
        {
          type: "element",
          tag: "section",
          attrs: [],
          events: [],
          children: [
            {
              type: "element",
              tag: "p",
              attrs: [],
              events: [],
              children: [{ type: "interpolation", expression: 'data.error ? data.error.message : "ok"', bindingId: "b0" }]
            }
          ]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/error", params: {}, query: {} }
    });

    expect(result.html).toContain("Backend unavailable");
    expect(result.payload.scopes.s0.asyncData.broken.pending).toBe(false);
    expect(result.payload.scopes.s0.asyncData.broken.error).toEqual({
      name: "Error",
      message: "Backend unavailable"
    });
  });

  it("renders a pending async-data skeleton when the resource is not awaited", async () => {
    const page = defineComponent({
      id: "m4",
      name: "StatsPage",
      file: "StatsPage.vue",
      handlers: [],
      async script(ctx) {
        const stats = ctx.useAsyncData("stats", async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { label: "Ready" };
        });
        return { stats };
      },
      template: [
        {
          type: "element",
          tag: "p",
          attrs: [],
          events: [],
          if: { expression: "stats.pending", blockId: "b0" },
          children: [{ type: "text", value: "Loading stats" }]
        },
        {
          type: "element",
          tag: "p",
          attrs: [],
          events: [],
          if: { expression: "!stats.pending", blockId: "b1" },
          children: [{ type: "interpolation", expression: "stats.value.label", bindingId: "b2" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/stats", params: {}, query: {} },
      modules: { m4: "/__resux/handlers/m4.mjs" }
    });

    expect(result.html).toContain("Loading stats");
    expect(result.html).not.toContain("Ready");
    expect(result.payload.scopes.s0.asyncData.stats).toEqual({
      value: null,
      pending: true,
      error: null
    });
  });

  it("renders ResuxLink to as an anchor href", async () => {
    const page = defineComponent({
      id: "m5",
      name: "LinksPage",
      file: "LinksPage.vue",
      handlers: [],
      async script() {
        return { target: "/dynamic" };
      },
      template: [
        {
          type: "element",
          tag: "ResuxLink",
          attrs: [{ kind: "static", name: "to", value: "/about" }],
          events: [],
          children: [{ type: "text", value: "About" }]
        },
        {
          type: "element",
          tag: "ResuxLink",
          attrs: [{ kind: "dynamic", name: "to", value: "target", bindingId: "b0" }],
          events: [],
          children: [{ type: "text", value: "Dynamic" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    expect(result.html).toContain('<a href="/about">About</a>');
    expect(result.html).toContain('href="/dynamic"');
    expect(result.html).toContain('data-rx-attr-b0="s0:b0"');
  });

  it("normalizes dynamic class and style values", async () => {
    const page = defineComponent({
      id: "m6",
      name: "AttrsPage",
      file: "AttrsPage.vue",
      handlers: [],
      async script() {
        return {
          classes: ["card", { active: true, hidden: false }, "featured"],
          styles: { backgroundColor: "red", fontSize: "14px", opacity: 0 }
        };
      },
      template: [
        {
          type: "element",
          tag: "section",
          attrs: [
            { kind: "dynamic", name: "class", value: "classes", bindingId: "b0" },
            { kind: "dynamic", name: "style", value: "styles", bindingId: "b1" }
          ],
          events: [],
          children: [{ type: "text", value: "Card" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    expect(result.html).toContain('class="card active featured"');
    expect(result.html).toContain('style="background-color:red;font-size:14px;opacity:0"');
  });

  it("sanitizes v-html content before rendering", async () => {
    const page = defineComponent({
      id: "m7",
      name: "HtmlPage",
      file: "HtmlPage.vue",
      handlers: [],
      async script() {
        return {
          body: `<p onclick="alert(1)">Hi <strong>there</strong></p><script>alert(1)</script><a href="javascript:alert(1)" target="_blank">Bad</a><a href="/safe" target="_blank">Safe</a>`
        };
      },
      template: [
        {
          type: "element",
          tag: "article",
          attrs: [],
          events: [],
          html: { expression: "body", bindingId: "b0" },
          children: [{ type: "text", value: "Ignored" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    expect(result.html).toContain('data-rx-html-b0="s0:b0"');
    expect(result.html).toContain("<strong>there</strong>");
    expect(result.html).toContain('<a target="_blank" rel="noopener noreferrer">Bad</a>');
    expect(result.html).toContain('<a href="/safe" target="_blank" rel="noopener noreferrer">Safe</a>');
    expect(result.html).not.toContain("onclick");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toContain("Ignored");
  });

  it("passes component props and slot content to child components", async () => {
    const card = defineComponent({
      id: "m1",
      name: "CardPanel",
      file: "components/CardPanel.vue",
      handlers: [],
      async script(ctx) {
        const props = ctx.defineProps<{ title: string; count: number }>();
        return { props };
      },
      template: [
        {
          type: "element",
          tag: "article",
          attrs: [],
          events: [],
          children: [
            { type: "interpolation", expression: "props.title + ':' + props.count", bindingId: "b0" },
            { type: "element", tag: "slot", attrs: [], events: [], children: [] }
          ]
        }
      ]
    });
    const page = defineComponent({
      id: "m0",
      name: "IndexPage",
      file: "pages/index.vue",
      handlers: [],
      async script() {
        return { total: 3 };
      },
      template: [
        {
          type: "element",
          tag: "CardPanel",
          attrs: [
            { kind: "static", name: "title", value: "Projects" },
            { kind: "dynamic", name: "count", value: "total", bindingId: "b1" }
          ],
          events: [],
          children: [{ type: "text", value: "Slot body" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      components: { CardPanel: card }
    });

    expect(result.html).toContain("Projects:3");
    expect(result.html).toContain("Slot body");
    expect(Object.values(result.payload.scopes).some((scope) => scope.props?.title === "Projects")).toBe(true);
  });

  it("renders layouts, plugin provides, runtime config, and head entries", async () => {
    const app = defineComponent({
      id: "m0",
      name: "App",
      file: "app.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxLayout",
          attrs: [],
          events: [],
          children: [{ type: "element", tag: "ResuxPage", attrs: [], events: [], children: [] }]
        }
      ]
    });
    const layout = defineComponent({
      id: "m1",
      name: "DefaultLayout",
      file: "layouts/default.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "section",
          attrs: [{ kind: "static", name: "class", value: "layout" }],
          events: [],
          children: [{ type: "element", tag: "slot", attrs: [], events: [], children: [] }]
        }
      ]
    });
    const page = defineComponent({
      id: "m2",
      name: "IndexPage",
      file: "pages/index.vue",
      handlers: [],
      meta: { title: "Home" },
      async script(ctx) {
        const config = ctx.useRuntimeConfig();
        const resuxApp = ctx.useResuxApp();
        ctx.useHead({ meta: [{ name: "page", content: "home" }] });
        return { config, resuxApp };
      },
      template: [
        {
          type: "interpolation",
          expression: "config.public.apiBase + ':' + resuxApp.provides.appName",
          bindingId: "b0"
        }
      ]
    });

    const result = await renderApp({
      app,
      page,
      route: { path: "/", params: {}, query: {} },
      layouts: { default: layout },
      runtimeConfig: { public: { apiBase: "/api" } },
      plugins: [
        async (resuxApp) => {
          resuxApp.provide("appName", "TestApp");
        }
      ]
    });

    expect(result.html).toContain('class="layout"');
    expect(result.html).toContain("/api:TestApp");
    expect(result.head.title).toBe("Home");
    expect(result.head.meta?.[0]).toEqual({ name: "page", content: "home" });
    expect(result.payload.config?.public?.apiBase).toBe("/api");
  });

  it("renders useSeoMeta tags near the top of the document head", async () => {
    const page = defineComponent({
      id: "m0",
      name: "SharePage",
      file: "pages/share.vue",
      handlers: [],
      async script(ctx) {
        ctx.useSeoMeta({
          title: "Share Title",
          description: "Short share description.",
          ogTitle: "Open Graph Title",
          ogImage: ["/share-a.png", "/share-b.png"],
          twitterCard: "summary_large_image",
          fbAppId: "123"
        });
        return {};
      },
      template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Share" }] }]
    });

    const result = await renderApp({
      page,
      route: { path: "/share", params: {}, query: {} }
    });
    const documentHtml = renderDocument(result);

    expect(result.head.title).toBe("Share Title");
    expect(result.head.meta).toEqual(expect.arrayContaining([
      { name: "description", content: "Short share description." },
      { property: "og:title", content: "Open Graph Title" },
      { property: "og:image", content: "/share-a.png" },
      { property: "og:image", content: "/share-b.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "fb:app_id", content: "123" }
    ]));
    expect(documentHtml.indexOf("<title>Share Title</title>")).toBeLessThan(documentHtml.indexOf("<style>"));
    expect(documentHtml.indexOf('property="og:title"')).toBeLessThan(documentHtml.indexOf("<style>"));
    expect(documentHtml.indexOf('property="og:title"')).toBeGreaterThan(documentHtml.indexOf("<head>"));
  });
});

describe("server event helpers", () => {
  it("reads JSON request bodies", async () => {
    const event = {
      path: "/api/message",
      method: "POST",
      query: {},
      params: {},
      node: {
        req: {
          async *[Symbol.asyncIterator]() {
            yield Buffer.from('{"message":"hello"}');
          }
        },
        res: {}
      }
    };

    await expect(readBody<{ message: string }>(event)).resolves.toEqual({ message: "hello" });
  });
});

describe("client resume loader", () => {
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
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.pending", blockId: "b0" }, children: [{ type: "text", value: "Loading stats" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "!stats.pending", blockId: "b1" }, children: [{ type: "interpolation", expression: "stats.value.label", bindingId: "b2" }] }
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

    const window = new Window();
    window.document.body.innerHTML = `
      <span data-rx-block="s0:b0"><p>Loading stats</p></span>
      <span data-rx-block="s0:b1"></span>
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    await waitForHtml(window, "Ready");

    expect(window.document.body.innerHTML).not.toContain("Loading stats");
    expect((globalThis as any).__RESUX__.scopes.s0.asyncData.stats).toEqual({
      value: { label: "Ready" },
      pending: false,
      error: null
    });
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.Event("click", { bubbles: true }));
    await waitForText(window, "1");
    window.document.querySelector("button")!.dispatchEvent(new window.Event("click", { bubbles: true }));
    await waitForText(window, "2");

    expect(window.document.querySelector("[data-rx-text='s0:b0']")?.textContent).toBe("2");
    expect((globalThis as any).__setupRuns).toBe(1);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
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

  it("intercepts internal links and swaps the route payload without a document reload", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/post/42?tab=info">Post 42</a>
        <main>Home</main>
      </div>
    `;

    let requestedUrl = "";
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        requestedUrl = url;
        return new Response(
          JSON.stringify({
            html: "<main>Post 42</main>",
            head: {
              title: "Post 42",
              meta: [{ name: "route", content: "post" }],
              link: [{ rel: "stylesheet", href: "/route.css" }]
            },
            payload: {
              route: {
                path: "/post/42",
                params: { id: "42" },
                query: { tab: "info" }
              },
              scopes: {},
              modules: {}
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      },
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>Post 42</main>");

    expect(requestedUrl).toBe("/__resux/route?path=%2Fpost%2F42%3Ftab%3Dinfo");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("Post 42");
    expect(window.location.pathname).toBe("/post/42");
    expect(window.location.search).toBe("?tab=info");
    expect((globalThis as any).__RESUX__.route.params.id).toBe("42");
    expect(window.document.title).toBe("Post 42");
    expect(window.document.head.innerHTML).toContain('name="route"');
  });

  it("reports route transition phases with progress and accessibility state", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-transition-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/slow">Slow</a>
        <main>Home</main>
      </div>
      <div id="__resux-loading" hidden data-state="idle" aria-live="polite" aria-busy="false">
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span></span></div>
        <div class="panel" data-rx-transition-message>Ready</div>
      </div>
    `;
    const phases: string[] = [];
    window.addEventListener("resux:route-transition", (event) => {
      phases.push((event as CustomEvent).detail.state);
    });

    let resolveFetch!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      Object.assign(globalThis, {
        fetch: async () => {
          resolve();
          await new Promise<void>((fetchResolve) => {
            resolveFetch = fetchResolve;
          });
          return new Response(
            JSON.stringify({
              html: "<main>Slow</main>",
              head: { title: "Slow" },
              payload: {
                route: { path: "/slow", params: {}, query: {} },
                scopes: {},
                modules: {}
              }
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" }
            }
          );
        }
      });
    });

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await fetchStarted;

    const loader = window.document.getElementById("__resux-loading")!;
    const root = window.document.getElementById("__resux")!;
    expect(loader.hidden).toBe(false);
    expect(loader.dataset.state).toBe("fetching");
    expect(loader.getAttribute("aria-busy")).toBe("true");
    expect(root.getAttribute("data-route-transition")).toBe("loading");
    expect(window.document.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow")).toBe("38");

    resolveFetch();
    await waitForHtml(window, "<main>Slow</main>");

    expect(phases).toEqual(expect.arrayContaining(["start", "fetching", "swapping", "complete"]));
    expect(loader.dataset.state).toBe("complete");
    expect(root.hasAttribute("data-route-transition")).toBe(false);
  });

  it("preserves the active layout across client-side navigation", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-layout-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <span data-rx-layout="default">
          <section id="layout" data-rx-text="s0:b0">
            <nav><a href="/about">About</a></nav>
            <span data-rx-page=""><main>Home</main></span>
          </section>
        </span>
      </div>
    `;
    const layoutElement = window.document.getElementById("layout");

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(
        JSON.stringify({
          html: `
            <span data-rx-layout="default">
              <section id="layout" data-rx-text="s0:b0">
                <nav><a href="/">Home</a></nav>
                <span data-rx-page=""><main>About</main></span>
              </section>
            </span>
          `,
          head: { title: "About" },
          payload: {
            route: { path: "/about", params: {}, query: {} },
            scopes: {
              s0: { id: "s0", moduleId: "layout", state: { menuOpen: false }, asyncData: {} },
              s1: { id: "s1", moduleId: "page", state: { loaded: true }, asyncData: {} }
            },
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
          s0: { id: "s0", moduleId: "layout", state: { menuOpen: true }, asyncData: {} },
          s9: { id: "s9", moduleId: "home", state: {}, asyncData: {} }
        },
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>About</main>");

    expect(window.document.getElementById("layout")).toBe(layoutElement);
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("<main>About</main>");
    expect((globalThis as any).__RESUX__.scopes.s0.state.menuOpen).toBe(true);
    expect((globalThis as any).__RESUX__.scopes.s1.state.loaded).toBe(true);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForText(window, "1:old");

    await writeFile(handlerFile, createModule("new"), "utf8");
    await (window as any).__RESUX_APPLY_DEV_UPDATE__({ revision: Date.now() });
    await waitForText(window, "1:new");

    expect(window.document.getElementById("__resux")).toBeTruthy();
    expect((globalThis as any).__RESUX__.scopes.s0.state.count).toBe(1);
  });
});

async function waitForText(window: Window, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (window.document.querySelector("[data-rx-text='s0:b0']")?.textContent === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForHtml(window: Window, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (window.document.body.innerHTML.includes(expected)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
