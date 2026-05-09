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
  setHeader,
  type ComponentDefinition
} from "resuxjs/runtime";

describe("runtime SSR", () => {
  it("renders object interpolation as JSON text instead of [object Object]", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-object-display",
      name: "ObjectDisplayPage",
      file: "ObjectDisplayPage.vue",
      handlers: [],
      async script() {
        return {
          payload: {
            ok: true,
            framework: "resux"
          }
        };
      },
      template: [
        {
          type: "element",
          tag: "pre",
          attrs: [],
          events: [],
          children: [{ type: "interpolation", expression: "payload", bindingId: "b0" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    expect(result.html).toContain('"ok": true');
    expect(result.html).toContain('"framework": "resux"');
    expect(result.html).not.toContain("[object Object]");
  });

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
    expect(documentHtml).not.toContain('__resux-loading');
    expect(documentHtml).toContain('data-rx-loading-indicator');
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
    expect(documentHtml).toContain('addEventListener("reload"');
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
        const { data: title } = await ctx.useAsyncData("title", async () => `Post ${route.params.id}`);
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
              children: [{ type: "interpolation", expression: 'data.error.value ? data.error.value.message : "ok"', bindingId: "b0" }]
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

  it("resolves server-side API fetch URLs through apiURL", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrls.push(String(url));
      return new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as typeof fetch;

    try {
      const page = defineComponent({
        id: "m-api",
        name: "ApiPage",
        file: "ApiPage.vue",
        handlers: [],
        async script(ctx) {
          const { data } = await ctx.useAsyncData("test", () => ctx.$fetch("/api/test"));
          return { data, direct: ctx.apiURL("/api/test") };
        },
        template: [
          { type: "interpolation", expression: "data.value.message", bindingId: "b0" },
          { type: "interpolation", expression: "direct", bindingId: "b1" }
        ]
      });

      const result = await renderApp({
        page,
        route: { path: "/", params: {}, query: {}, origin: "https://example.test" }
      });

      expect(requestedUrls).toEqual(["https://example.test/api/test"]);
      expect(result.html).toContain("ok");
      expect(result.html).toContain("https://example.test/api/test");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("allows awaited useAsyncData to SSR Nuxt-like data/pending/error refs", async () => {
    const page = defineComponent({
      id: "m-api-awaited",
      name: "AwaitedApiPage",
      file: "AwaitedApiPage.vue",
      handlers: [],
      async script(ctx) {
        const { data, pending, error } = await ctx.useAsyncData("stats", async () => ({ response: "14 ms" }));
        return { data, pending, error };
      },
      template: [
        { type: "element", tag: "p", attrs: [], events: [], if: { expression: "pending.value", blockId: "b0" }, children: [{ type: "text", value: "Loading" }] },
        { type: "element", tag: "p", attrs: [], events: [], if: { expression: "!pending.value && !error.value && data.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "data.value.response", bindingId: "b2" }] }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    expect(result.html).toContain("14 ms");
    expect(result.html).not.toContain("Loading");
    expect(result.payload.scopes.s0.asyncData.stats).toEqual({
      value: { response: "14 ms" },
      pending: false,
      error: null
    });
  });

  it("renders a pending async-data skeleton when the resource is not awaited", async () => {
    const page = defineComponent({
      id: "m4",
      name: "StatsPage",
      file: "StatsPage.vue",
      handlers: [],
      async script(ctx) {
        const { data, pending } = ctx.useAsyncData("stats", async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { label: "Ready" };
        });
        return { data, pending };
      },
      template: [
        {
          type: "element",
          tag: "p",
          attrs: [],
          events: [],
          if: { expression: "pending.value", blockId: "b0" },
          children: [{ type: "text", value: "Loading stats" }]
        },
        {
          type: "element",
          tag: "p",
          attrs: [],
          events: [],
          if: { expression: "!pending.value", blockId: "b1" },
          children: [{ type: "interpolation", expression: "data.value.label", bindingId: "b2" }]
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

  it("renders ResuxLoadingIndicator with configurable attrs and default slot content", async () => {
    const page = defineComponent({
      id: "m-loading",
      name: "LoadingPage",
      file: "LoadingPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxLoadingIndicator",
          attrs: [
            { kind: "static", name: "color", value: "#22c55e" },
            { kind: "static", name: "error-color", value: "#ef4444" },
            { kind: "static", name: "height", value: "4" },
            { kind: "static", name: "duration", value: "1500" },
            { kind: "static", name: "throttle", value: "25" }
          ],
          events: [],
          children: [
            {
              type: "element",
              tag: "strong",
              attrs: [],
              events: [],
              children: [{ type: "text", value: "Please wait" }]
            }
          ]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    expect(result.html).toContain('data-rx-loading-indicator="true"');
    expect(result.html).toContain('data-duration="1500"');
    expect(result.html).toContain('data-throttle="25"');
    expect(result.html).toContain("--resux-loader-height: 4px");
    expect(result.html).toContain("--resux-loader-color: #22c55e");
    expect(result.html).toContain("--resux-loader-error-color: #ef4444");
    expect(result.html).toContain("<strong>Please wait</strong>");
  });

  it("builds image URLs with useResuxImage and provider templates", async () => {
    const page = defineComponent({
      id: "m-image-builder",
      name: "ImageBuilderPage",
      file: "ImageBuilderPage.vue",
      handlers: [],
      async script(ctx) {
        const buildImage = ctx.useResuxImage();
        return {
          url: buildImage("/hero.jpg", {
            provider: "cdn",
            width: 640
          })
        };
      },
      template: [{ type: "interpolation", expression: "url", bindingId: "b0" }]
    });

    const result = await renderApp({
      page,
      route: { path: "/gallery", params: {}, query: {} },
      runtimeConfig: {
        public: {
          image: {
            quality: 78,
            format: "webp",
            providers: {
              cdn: {
                baseURL: "https://img.example.com/{src}?w={width}&q={quality}&f={format}"
              }
            }
          }
        }
      }
    });

    expect(result.html).toContain("https://img.example.com/%2Fhero.jpg?w=640&amp;q=78&amp;f=webp");
  });

  it("renders ResuxImg and ResuxPicture with responsive attrs and preload links", async () => {
    const page = defineComponent({
      id: "m-image-components",
      name: "ImageComponentsPage",
      file: "ImageComponentsPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/hero.jpg" },
            { kind: "static", name: "alt", value: "Hero" },
            { kind: "static", name: "width", value: "400" },
            { kind: "static", name: "sizes", value: "100vw" },
            { kind: "static", name: "densities", value: "1,2" },
            { kind: "static", name: "format", value: "webp" },
            { kind: "static", name: "priority", value: "true" }
          ],
          events: [],
          children: []
        },
        {
          type: "element",
          tag: "ResuxPicture",
          attrs: [
            { kind: "static", name: "src", value: "/images/card.jpg" },
            { kind: "static", name: "alt", value: "Card" },
            { kind: "static", name: "widths", value: "320,640" },
            { kind: "static", name: "formats", value: "avif,webp" }
          ],
          events: [],
          children: []
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      runtimeConfig: {
        public: {
          image: {
            quality: 82
          }
        }
      }
    });

    expect(result.html).toContain("<img");
    expect(result.html).toContain("/__resux/image?src=%2Fimages%2Fhero.jpg&amp;w=400&amp;q=82&amp;f=webp");
    expect(result.html).toContain('srcset="/__resux/image?src=%2Fimages%2Fhero.jpg&amp;w=400&amp;q=82&amp;f=webp 1x, /__resux/image?src=%2Fimages%2Fhero.jpg&amp;w=800&amp;q=82&amp;f=webp 2x"');
    expect(result.html).toContain("<picture");
    expect(result.html).toContain('type="image/avif"');
    expect(result.html).toContain('type="image/webp"');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "image"
      })
    ]));
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

    let provideType = "";
    const result = await renderApp({
      app,
      page,
      route: { path: "/", params: {}, query: {} },
      layouts: { default: layout },
      runtimeConfig: { public: { apiBase: "/api" } },
      plugins: [
        async (resuxApp) => {
          provideType = typeof resuxApp.provide;
          resuxApp.provide("appName", "TestApp");
        }
      ]
    });

    expect(provideType).toBe("function");
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
    expect(documentHtml.indexOf("<title>Share Title</title>")).toBe("<!doctype html><html lang=\"en\"><head>".length);
    expect(documentHtml.indexOf("<title>Share Title</title>")).toBeLessThan(documentHtml.indexOf("<style>"));
    expect(documentHtml.indexOf('property="og:title"')).toBeLessThan(documentHtml.indexOf("<style>"));
    expect(documentHtml.indexOf('property="og:title"')).toBeLessThan(documentHtml.indexOf('charset="utf-8"'));
    expect(documentHtml.indexOf('property="og:title"')).toBeGreaterThan(documentHtml.indexOf("<head>"));
  });

  it("renders component styles in head and scoped attrs in HTML", async () => {
    const page = defineComponent({
      id: "m0",
      name: "StyledPage",
      file: "pages/styled.vue",
      handlers: [],
      styles: [
        {
          id: "m0-0",
          css: ".page[data-v-rx-s-m0]{color:red}",
          scoped: true
        }
      ],
      styleScopeId: "data-v-rx-s-m0",
      async script() {
        return {};
      },
      template: [{ type: "element", tag: "main", attrs: [{ kind: "static", name: "class", value: "page" }], events: [], children: [{ type: "text", value: "Styled" }] }]
    });

    const result = await renderApp({
      page,
      route: { path: "/styled", params: {}, query: {} }
    });
    const documentHtml = renderDocument(result);

    expect(result.head.style).toEqual([{ id: "m0-0", css: ".page[data-v-rx-s-m0]{color:red}", scoped: true }]);
    expect(result.html).toContain('<main class="page" data-v-rx-s-m0="">Styled</main>');
    expect(documentHtml).toContain('<style data-rx-head="true" data-rx-style="m0-0">.page[data-v-rx-s-m0]{color:red}</style>');
  });
});

describe("server event helpers", () => {
  it("sets response headers through the h3-style helper", () => {
    const headers = new Map<string, number | string | string[]>();
    const event = {
      path: "/api/message",
      method: "GET",
      query: {},
      params: {},
      node: {
        req: {},
        res: {
          setHeader(name: string, value: number | string | string[]) {
            headers.set(name, value);
          }
        }
      }
    };

    setHeader(event, "x-app", "resux");

    expect(headers.get("x-app")).toBe("resux");
  });

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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForText(window, "/api/test");

    expect(window.document.querySelector("[data-rx-text='s0:b0']")?.textContent).toBe("/api/test");
  });

  it("ignores same-route link clicks without refetching route payloads", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-same-route-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/">Home</a>
        <main>Home</main>
      </div>
    `;
    let fetchCalls = 0;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => {
        fetchCalls++;
        return new Response(
          JSON.stringify({
            html: "<main>Home</main>",
            head: { title: "Home" },
            payload: {
              route: { path: "/", params: {}, query: {} },
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
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchCalls).toBe(0);
    expect(window.location.pathname).toBe("/");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("<main>Home</main>");
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
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "!stats.pending.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "stats.value.value.label", bindingId: "b2" }] }
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
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

  it("ignores same-route link clicks without fetching or rerendering", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-same-route-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/about?tab=info" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/about?tab=info">About</a>
        <main>About page</main>
      </div>
    `;

    let fetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => {
        fetchCalls++;
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      },
      __RESUX__: {
        route: { path: "/about", params: {}, query: { tab: "info" } },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(fetchCalls).toBe(0);
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("About page");
    expect(window.location.pathname).toBe("/about");
    expect(window.location.search).toBe("?tab=info");
  });

  it("renders ResuxImg to native img markup during client block patches", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-client-img-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggle" }], children: [{ type: "text", value: "Toggle" }] },
  { type: "element", tag: "section", attrs: [], events: [], if: { expression: "show.value", blockId: "b0" }, children: [
      { type: "element", tag: "ResuxImg", attrs: [
          { kind: "static", name: "src", value: "/hero.png" },
          { kind: "static", name: "alt", value: "Hero" },
          { kind: "static", name: "width", value: "200" },
          { kind: "static", name: "format", value: "webp" }
        ], events: [], children: [] }
    ] }
];
async function script(ctx) {
  const show = ctx.useState("show", () => false);
  function toggle() {
    show.value = !show.value;
  }
  return { show, toggle };
}
export default createClientComponent({ id: "m0", name: "ImagePatch", file: "ImagePatch.vue", script, template: __template, handlers: ["toggle"] });
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <button data-rx-on-click="s0:m0:toggle">Toggle</button>
      <span data-rx-block="s0:b0" style="display: contents;"></span>
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
            state: { show: false },
            asyncData: {}
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        },
        config: {
          public: {
            image: {
              quality: 80
            }
          }
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<img");

    const html = window.document.body.innerHTML;
    expect(html).toContain("/__resux/image?src=%2Fhero.png&amp;w=200&amp;q=80&amp;f=webp");
    expect(html).not.toContain("<ResuxImg");
  });

  it("runs client route middleware during client-side navigation", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-client-mw-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const middlewareFile = path.join(tempDir, "auth.client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      middlewareFile,
      `import { defineResuxRouteMiddleware, defineClientRouteRedirect as navigateTo } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
export default defineResuxRouteMiddleware((to, from) => {
  globalThis.__CLIENT_MW_RUNS__ = globalThis.__CLIENT_MW_RUNS__ || [];
  globalThis.__CLIENT_MW_RUNS__.push({ to: to.path, from: from.path });
  if (to.path === "/protected") {
    return navigateTo("/login");
  }
});
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/protected">Protected</a>
        <main>Home</main>
      </div>
      <div data-rx-loading-indicator="true" hidden data-state="idle" aria-live="polite" aria-busy="false" data-duration="2000" data-throttle="0" style="--resux-loader-height: 3px;">
        <div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>
      </div>
    `;

    const middlewareEntry = {
      id: "w0",
      name: "auth",
      file: "middleware/auth.client.ts",
      global: false,
      mode: "client",
      src: pathToFileURL(middlewareFile).href
    };
    const requestedPaths: string[] = [];
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        const routePath = decodeURIComponent(request.searchParams.get("path") ?? "");
        requestedPaths.push(routePath);
        if (routePath === "/protected") {
          return new Response(
            JSON.stringify({
              html: "<main>Protected</main>",
              head: { title: "Protected" },
              payload: {
                route: { path: "/protected", params: {}, query: {} },
                scopes: {},
                modules: {},
                plugins: [],
                middleware: [middlewareEntry],
                pageMeta: { middleware: "auth" }
              }
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" }
            }
          );
        }

        return new Response(
          JSON.stringify({
            html: "<main>Login</main>",
            head: { title: "Login" },
            payload: {
              route: { path: "/login", params: {}, query: {} },
              scopes: {},
              modules: {},
              plugins: [],
              middleware: [middlewareEntry],
              pageMeta: {}
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
        modules: {},
        plugins: [],
        middleware: [middlewareEntry],
        pageMeta: {}
      },
      __CLIENT_MW_RUNS__: [],
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>Login</main>");

    expect(requestedPaths).toEqual(["/protected", "/login"]);
    expect(window.location.pathname).toBe("/login");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("Login");
    expect((globalThis as any).__CLIENT_MW_RUNS__).toEqual([
      { to: "/protected", from: "/" }
    ]);
  });

  it("aborts pending async data when leaving the current route", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-abort-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.pending.value", blockId: "b0" }, children: [{ type: "text", value: "Loading stats" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.error.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "stats.error.value.name", bindingId: "b2" }] }
];
async function script(ctx) {
  const stats = ctx.useAsyncData("stats", ({ signal }) => new Promise((_resolve, reject) => {
    globalThis.__RESUX_TEST_SIGNAL__ = signal;
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  return { stats };
}
export default createClientComponent({ id: "m0", name: "Home", file: "Home.vue", script, template: __template, handlers: [] });
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/about">About</a>
        <span data-rx-block="s0:b0"><p>Loading stats</p></span>
        <span data-rx-block="s0:b1"></span>
      </div>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      DOMException: window.DOMException,
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
    await waitForSignal();
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>About</main>");

    expect((globalThis as any).__RESUX_TEST_SIGNAL__.aborted).toBe(true);
    expect(window.location.pathname).toBe("/about");
  });

  it("preserves loaded global styles while navigating between routes", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-style-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = '<link data-rx-head="true" rel="stylesheet" href="/styles.css">';
    window.document.body.innerHTML = `
      <div id="__resux">
        <span data-rx-layout="default">
          <section class="shell">
            <nav><a href="/">Home</a><a href="/about">About</a></nav>
            <span data-rx-page=""><main class="page">Home</main></span>
          </section>
        </span>
      </div>
    `;
    const stylesheet = window.document.querySelector('link[href="/styles.css"]');

    const routePayloads: Record<string, unknown> = {
      "/about": {
        html: `
          <span data-rx-layout="default">
            <section class="shell">
              <nav><a href="/">Home</a><a href="/about">About</a></nav>
              <span data-rx-page=""><main class="page">About</main></span>
            </section>
          </span>
        `,
        head: { title: "About", link: [{ rel: "stylesheet", href: "/styles.css" }] },
        payload: { route: { path: "/about", params: {}, query: {} }, scopes: {}, modules: {} }
      },
      "/": {
        html: `
          <span data-rx-layout="default">
            <section class="shell">
              <nav><a href="/">Home</a><a href="/about">About</a></nav>
              <span data-rx-page=""><main class="page">Home</main></span>
            </section>
          </span>
        `,
        head: { title: "Home", link: [{ rel: "stylesheet", href: "/styles.css" }] },
        payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {} }
      }
    };

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        const routePath = decodeURIComponent(request.searchParams.get("path") ?? "");
        return new Response(JSON.stringify(routePayloads[routePath]), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      },
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector('a[href="/about"]')!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main class=\"page\">About</main>");

    expect(window.location.pathname).toBe("/about");
    expect(window.document.getElementById("__resux")?.textContent).toContain("About");
    expect(window.document.querySelector('link[href="/styles.css"]')).toBe(stylesheet);

    window.document.querySelector('a[href="/"]')!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main class=\"page\">Home</main>");

    expect(window.location.pathname).toBe("/");
    expect(window.document.getElementById("__resux")?.textContent).toContain("Home");
    expect(window.document.querySelector('link[href="/styles.css"]')).toBe(stylesheet);
  });

  it("updates route style tags while navigating between routes", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-style-head-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = '<style data-rx-head="true" data-rx-style="m0-0">.home{color:red}</style>';
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/about">About</a>
        <main class="home">Home</main>
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
          html: '<main class="about">About</main>',
          head: {
            title: "About",
            style: [{ id: "m1-0", css: ".about{color:blue}" }]
          },
          payload: { route: { path: "/about", params: {}, query: {} }, scopes: {}, modules: {} }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      ),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    window.document.querySelector('a[href="/about"]')!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, '<main class="about">About</main>');

    expect(window.document.querySelector('style[data-rx-style="m0-0"]')).toBeNull();
    expect(window.document.querySelector('style[data-rx-style="m1-0"]')?.textContent).toBe(".about{color:blue}");
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
      <div data-rx-loading-indicator="true" hidden data-state="idle" aria-live="polite" aria-busy="false" data-duration="2000" data-throttle="0" style="--resux-loader-height: 3px;">
        <div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>
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

    const loader = window.document.querySelector("[data-rx-loading-indicator]") as HTMLElement;
    const root = window.document.getElementById("__resux")!;
    expect(loader.hidden).toBe(false);
    expect(loader.dataset.state).toBe("fetching");
    expect(loader.getAttribute("aria-busy")).toBe("true");
    expect(root.getAttribute("data-route-transition")).toBe("loading");
    const progressValue = Number(window.document.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow") ?? "0");
    expect(progressValue).toBeGreaterThan(0);
    expect(progressValue).toBeLessThan(100);

    resolveFetch();
    await waitForHtml(window, "<main>Slow</main>");

    expect(phases).toEqual(expect.arrayContaining(["start", "fetching", "swapping", "complete"]));
    expect(["complete", "idle"]).toContain(loader.dataset.state);
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

async function waitForSignal(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if ((globalThis as any).__RESUX_TEST_SIGNAL__) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
