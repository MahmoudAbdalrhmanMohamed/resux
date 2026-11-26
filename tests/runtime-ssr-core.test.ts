import path from "node:path";
import { iconRegistry } from "../src/icons/registry.js";
import { describe, expect, it } from "vitest";
import { defineComponent, getClientRuntimeSource, renderApp, renderDocument, type ComponentDefinition } from "resuxjs/runtime";
import { script } from "./helpers/runtime-fixtures.js";

describe("runtime SSR", () => {
  it("renders icon root presentation attributes consistently during SSR", async () => {
    const name = "audit-suite:ssr-outline";
    iconRegistry[name] = {
      path: "M3 3h18v18H3z",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      fillRule: "evenodd",
      clipRule: "evenodd",
      opacity: ".7",
      viewBox: "0 0 24 24",
    };

    try {
      const page: ComponentDefinition = defineComponent({
        id: "m-icon-root-presentation",
        name: "IconRootPresentation",
        file: "IconRootPresentation.vue",
        handlers: [],
        async script() { return {}; },
        template: [{
          type: "element",
          tag: "Icon",
          attrs: [{ kind: "static", name: "name", value: name }],
          events: [],
          children: [],
        }],
      });

      const result = await renderApp({
        page,
        route: { path: "/", params: {}, query: {} },
      });

      expect(result.html).toContain('fill="none"');
      expect(result.html).toContain('stroke="currentColor"');
      expect(result.html).toContain('stroke-width="1.5"');
      expect(result.html).toContain('stroke-linecap="round"');
      expect(result.html).toContain('fill-rule="evenodd"');
      expect(result.html).toContain('clip-rule="evenodd"');
      expect(result.html.match(/opacity=".7"/g)).toHaveLength(1);
    } finally {
      delete iconRegistry[name];
    }
  });

  it("unwraps reactive values passed to useHead", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-head-ref",
      name: "HeadRefPage",
      file: "HeadRefPage.vue",
      handlers: [],
      async script(ctx) {
        const locale = ctx.ref("en");
        ctx.useHead({
          htmlAttrs: {
            lang: locale,
          },
          bodyAttrs: {
            class: () => "overflow-x-hidden",
            style: {
              direction: "ltr",
              overflowX: "hidden",
            },
          },
        });
        return { locale };
      },
      template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Head" }] }],
    });

    const result = await renderApp({
      page,
      route: { path: "/en", params: {}, query: {} },
    });
    const documentHtml = renderDocument(result);

    expect(result.head.htmlAttrs?.lang).toBe("en");
    expect(documentHtml).toContain('<html lang="en">');
    expect(documentHtml).toContain('<body class="overflow-x-hidden" style="direction:ltr;overflow-x:hidden">');
    expect(documentHtml).not.toContain("[object Object]");
  });

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

  it("renders Vue-style transition boundaries without native transition tags and retains false-state patch markers", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-transition-ssr",
      name: "TransitionSsrPage",
      file: "TransitionSsrPage.vue",
      handlers: [],
      async script(ctx) {
        const visible = ctx.useState("visible", () => true);
        const effect = ctx.useState("effect", () => "fade");
        return { visible, effect };
      },
      template: [{
        type: "element",
        tag: "transition",
        attrs: [{ kind: "dynamic", name: "name", value: "effect.value", bindingId: "b-name" }],
        events: [],
        children: [{
          type: "element",
          tag: "div",
          attrs: [{ kind: "dynamic", name: "hidden", value: "!visible.value", bindingId: "b0" }],
          events: [],
          children: [{ type: "text", value: "Panel" }],
        }],
      }],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
    });

    expect(result.html).toContain('data-rx-transition="fade"');
    expect(result.html).toContain('data-rx-attr-b-name="s0:b-name"');
    expect(result.html).toContain('data-rx-attr-b0="s0:b0"');
    expect(result.html).not.toContain("<transition");
    expect(result.html).not.toContain('hidden="false"');
  });

  it("treats a camelCase <Transition> tag as a transition boundary", async () => {
    const camelPage: ComponentDefinition = defineComponent({
      id: "m-transition-camel-ssr",
      name: "TransitionCamelSsrPage",
      file: "TransitionCamelSsrPage.vue",
      handlers: [],
      async script(ctx) {
        const visible = ctx.useState("visible", () => true);
        return { visible };
      },
      template: [{
        type: "element",
        tag: "Transition",
        attrs: [{ kind: "static", name: "name", value: "fade" }],
        events: [],
        children: [{
          type: "element",
          tag: "div",
          attrs: [{ kind: "dynamic", name: "hidden", value: "!visible.value", bindingId: "b0" }],
          events: [],
          children: [{ type: "text", value: "Panel" }],
        }],
      }],
    });

    const result = await renderApp({
      page: camelPage,
      route: { path: "/", params: {}, query: {} },
    });

    expect(result.html).toContain('data-rx-transition="fade"');
    expect(result.html).not.toContain("<Transition");
    expect(result.html).not.toContain("<transition");
    expect(getClientRuntimeSource()).toContain("normalizeTransitionBoundaryTagName");
  });

  it.each(["transition-group", "TransitionGroup"])("honors %s tag and keeps a direct reactive list marker on the semantic container", async (groupTag) => {
    const page: ComponentDefinition = defineComponent({
      id: "m-transition-group-ssr",
      name: "TransitionGroupSsrPage",
      file: "TransitionGroupSsrPage.vue",
      handlers: [],
      async script(ctx) {
        const items = ctx.useState("items", () => [1, 2]);
        return { items };
      },
      template: [{
        type: "element",
        tag: groupTag,
        attrs: [
          { kind: "static", name: "name", value: "list" },
          { kind: "static", name: "tag", value: "ul" }
        ],
        events: [],
        children: [{
          type: "element",
          tag: "li",
          attrs: [{ kind: "dynamic", name: "key", value: "item" }],
          events: [],
          for: { source: "items.value", value: "item", blockId: "b-list" },
          children: [{ type: "interpolation", expression: "item", bindingId: "b-item" }],
        }],
      }],
    });

    const groupResult = await renderApp({ page, route: { path: "/", params: {}, query: {} } });

    expect(groupResult.html).toContain('<ul data-rx-transition="list" data-rx-transition-group="true" data-rx-block="s0:b-list">');
    expect(groupResult.html).toContain('<li key="1">');
    expect(groupResult.html).toContain('<li key="2">');
    expect(groupResult.html).not.toContain('<span data-rx-block="s0:b-list"');
    expect(groupResult.html).not.toContain("<TransitionGroup");
    expect(groupResult.html).not.toContain("<transition-group");
    expect(getClientRuntimeSource()).toContain("style.animationIterationCount");
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
    expect(documentHtml).not.toContain('/__resux/runtime-client.mjs');
    expect(documentHtml).not.toContain('window.__RESUX__=');
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
    const fallbackCharsetIndex = documentHtml.indexOf('<meta charset="utf-8">');
    const shareTitleIndex = documentHtml.indexOf("<title>Share Title</title>");
    expect(fallbackCharsetIndex).toBeGreaterThanOrEqual("<!doctype html><html lang=\"en\"><head>".length);
    expect(fallbackCharsetIndex).toBeLessThan(shareTitleIndex);
    expect(documentHtml.indexOf("<title>Share Title</title>")).toBeLessThan(documentHtml.indexOf("<style>"));
    expect(documentHtml.indexOf('property="og:title"')).toBeLessThan(documentHtml.indexOf("<style>"));
    expect(documentHtml.indexOf('charset="utf-8"')).toBeLessThan(documentHtml.indexOf('property="og:title"'));
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

  it("throws a friendly SSR error for client-only package loading", async () => {
    const page = defineComponent({
      id: "m-pkg-client-only",
      name: "ClientOnlyPackagePage",
      file: "pages/client-only-package.vue",
      handlers: [],
      async script(ctx) {
        await ctx.useLazyPackage("swiper", { mode: "clientOnly" });
        return {};
      },
      template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Package" }] }]
    });

    await expect(renderApp({
      page,
      route: { path: "/pkg", params: {}, query: {} }
    })).rejects.toThrow(/browser-only and was imported during SSR/i);
  });

  it("throws a friendly missing package error", async () => {
    const page = defineComponent({
      id: "m-pkg-missing",
      name: "MissingPackagePage",
      file: "pages/missing-package.vue",
      handlers: [],
      async script(ctx) {
        await ctx.useLazyPackage("resux-missing-package-name");
        return {};
      },
      template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Missing" }] }]
    });

    await expect(renderApp({
      page,
      route: { path: "/pkg-missing", params: {}, query: {} }
    })).rejects.toThrow(/is not installed\. Run "npm install resux-missing-package-name"/i);
  });
});
