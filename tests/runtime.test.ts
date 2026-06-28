import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import {
  defineComponent,
  getClientRuntimeSource,
  readBody,
  renderApp,
  renderDocument,
  setHeader,
  type ComponentDefinition
} from "resuxjs/runtime";

let runtimeImportCounter = 0;
function nextRuntimeImportQuery() {
  runtimeImportCounter += 1;
  return `${Date.now()}-${runtimeImportCounter}`;
}

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
      appHead: {
        meta: [{ name: "description", content: "Media page" }],
        link: [
          { rel: "icon", href: "/favicon.svg" },
          { rel: "stylesheet", href: "/styles.css" },
        ],
      },
      runtimeConfig: {
        public: {
          image: {
            quality: 82
          }
        }
      }
    });

    expect(result.html).toContain("<img");
    expect(result.html).toContain("/__resux/image?src=%2Fimages%2Fhero.webp&amp;original=%2Fimages%2Fhero.jpg&amp;w=400&amp;q=82&amp;f=webp");
    expect(result.html).toContain('srcset="/__resux/image?src=%2Fimages%2Fhero.webp&amp;original=%2Fimages%2Fhero.jpg&amp;w=320&amp;q=82&amp;f=webp 320w, /__resux/image?src=%2Fimages%2Fhero.webp&amp;original=%2Fimages%2Fhero.jpg&amp;w=400&amp;q=82&amp;f=webp 400w"');
    expect(result.html).toContain("<picture");
    expect(result.html).toContain('type="image/avif"');
    expect(result.html).toContain('type="image/webp"');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "image",
        href: "/__resux/image?src=%2Fimages%2Fhero.webp&original=%2Fimages%2Fhero.jpg&w=400&q=82&f=webp",
        imagesrcset: "/__resux/image?src=%2Fimages%2Fhero.webp&original=%2Fimages%2Fhero.jpg&w=320&q=82&f=webp 320w, /__resux/image?src=%2Fimages%2Fhero.webp&original=%2Fimages%2Fhero.jpg&w=400&q=82&f=webp 400w",
        imagesizes: "100vw",
        fetchpriority: "high",
        type: "image/webp",
      })
    ]));

    const documentHtml = renderDocument(result);
    const preloadIndex = documentHtml.indexOf('rel="preload"');
    expect(preloadIndex).toBeGreaterThan(-1);
    expect(preloadIndex).toBeLessThan(documentHtml.indexOf('rel="icon"'));
    expect(preloadIndex).toBeLessThan(documentHtml.indexOf('name="description"'));
  });

  it("treats bare priority/preload attrs as true and emits responsive srcset for sizes-driven ResuxImg", async () => {
    const page = defineComponent({
      id: "m-image-hero-snippet",
      name: "ImageHeroSnippetPage",
      file: "ImageHeroSnippetPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/hero-large.jpg" },
            { kind: "static", name: "alt", value: "Hero" },
            { kind: "static", name: "width", value: "1920" },
            { kind: "static", name: "height", value: "1080" },
            { kind: "static", name: "sizes", value: "(min-width: 1280px) 960px, 100vw" },
            { kind: "static", name: "format", value: "webp" },
            { kind: "static", name: "quality", value: "82" },
            { kind: "static", name: "priority", value: "" },
            { kind: "static", name: "preload", value: "" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
    });

    expect(result.html).toContain('loading="eager"');
    expect(result.html).toContain('data-resux-img="loading"');
    expect(result.html).toContain('fetchpriority="high"');
    expect(result.html).toContain('width="1920"');
    expect(result.html).toContain('height="1080"');
    expect(result.html).toContain('sizes="(min-width: 1280px) 960px, 100vw"');
    expect(result.html).toContain('src="/__resux/image?src=%2Fimages%2Fhero-large.webp&amp;original=%2Fimages%2Fhero-large.jpg&amp;w=1920&amp;h=1080&amp;q=82&amp;f=webp"');
    expect(result.html).toContain('/__resux/image?src=%2Fimages%2Fhero-large.webp&amp;original=%2Fimages%2Fhero-large.jpg&amp;w=960&amp;h=540&amp;q=82&amp;f=webp 960w');
    expect(result.html).toContain('/__resux/image?src=%2Fimages%2Fhero-large.webp&amp;original=%2Fimages%2Fhero-large.jpg&amp;w=1920&amp;h=1080&amp;q=82&amp;f=webp 1920w');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "image",
        href: "/__resux/image?src=%2Fimages%2Fhero-large.webp&original=%2Fimages%2Fhero-large.jpg&w=1920&h=1080&q=82&f=webp",
        fetchpriority: "high",
        imagesizes: "(min-width: 1280px) 960px, 100vw",
        type: "image/webp",
      }),
    ]));
  });

  it("defers explicit lazy image loading until client runtime reveals sources", async () => {
    const page = defineComponent({
      id: "m-image-lazy",
      name: "ImageLazyPage",
      file: "ImageLazyPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/lazy.jpg" },
            { kind: "static", name: "alt", value: "Lazy" },
            { kind: "static", name: "width", value: "320" },
            { kind: "static", name: "loading", value: "lazy" },
          ],
          events: [],
          children: [],
        },
        {
          type: "element",
          tag: "ResuxPicture",
          attrs: [
            { kind: "static", name: "src", value: "/images/lazy-picture.jpg" },
            { kind: "static", name: "alt", value: "Lazy picture" },
            { kind: "static", name: "formats", value: "avif,webp" },
            { kind: "static", name: "loading", value: "lazy" },
            { kind: "static", name: "widths", value: "320,640" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      runtimeConfig: {
        public: {
          image: {
            quality: 75,
          },
        },
      },
    });

    expect(result.html).toContain('data-rx-lazy-image="true"');
    expect(result.html).toContain('data-resux-img="idle"');
    expect(result.html).toContain('data-rx-lazy-src="/__resux/image?src=%2Fimages%2Flazy.jpg&amp;w=320&amp;q=75"');
    expect(result.html).toContain('data-rx-lazy-root-margin="0px 0px"');
    expect(result.html).toContain('data-rx-lazy-threshold="0"');
    expect(result.html).toContain('src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="');
    expect(result.html).toContain('data-rx-lazy-srcset="/__resux/image?src=%2Fimages%2Flazy-picture.avif&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=320&amp;q=75&amp;f=avif 320w, /__resux/image?src=%2Fimages%2Flazy-picture.avif&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=640&amp;q=75&amp;f=avif 640w"');
    expect(result.html).toContain('data-rx-lazy-srcset="/__resux/image?src=%2Fimages%2Flazy-picture.webp&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=320&amp;q=75&amp;f=webp 320w, /__resux/image?src=%2Fimages%2Flazy-picture.webp&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=640&amp;q=75&amp;f=webp 640w"');
    expect(result.html).not.toContain('<source type="image/avif" srcset=');
    expect(result.html).not.toContain('<source type="image/webp" srcset=');
  });

  it("reserves media aspect ratio from explicit width and height to reduce CLS", async () => {
    const page = defineComponent({
      id: "m-media-aspect-ratio",
      name: "MediaAspectRatioPage",
      file: "MediaAspectRatioPage.vue",
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
            { kind: "static", name: "width", value: "1280" },
            { kind: "static", name: "height", value: "720" },
            { kind: "static", name: "loading", value: "lazy" },
            { kind: "static", name: "placeholder", value: "true" },
          ],
          events: [],
          children: [],
        },
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/videos/hero.mp4" },
            { kind: "static", name: "width", value: "1280" },
            { kind: "static", name: "height", value: "720" },
            { kind: "static", name: "lazy", value: "true" },
            { kind: "static", name: "placeholder", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/media", params: {}, query: {} },
    });

    expect(result.html).toContain("aspect-ratio: 1280 / 720");
    expect(result.html).toContain('style="aspect-ratio: 1280 / 720; display: block; width: 100%; max-width: 100%; height: auto"');
    expect(result.html).toContain('data-resux-video="idle"');
  });

  it("renders ResuxVideo hero preload links and skip-control shell attributes", async () => {
    const page = defineComponent({
      id: "m-video-hero-preload",
      name: "VideoHeroPreloadPage",
      file: "VideoHeroPreloadPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "hero", value: "true" },
            { kind: "static", name: "priority", value: "true" },
            { kind: "static", name: "preload-link", value: "true" },
            { kind: "static", name: "skip-controls", value: "true" },
            { kind: "static", name: "skip-seconds", value: "10" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/media", params: {}, query: {} },
    });

    expect(result.html).toContain('data-rx-video-hero="true"');
    expect(result.html).toContain('fetchpriority="high"');
    expect(result.html).toContain('data-rx-video-shell="true"');
    expect(result.html).toContain('data-rx-video-skip-controls="true"');
    expect(result.html).toContain('data-rx-video-skip-backward="10"');
    expect(result.html).toContain('data-rx-video-skip-forward="10"');
    expect(result.html).toContain('data-rx-video-skip-overlay-zone');
    expect(result.html).toContain('data-rx-video-click-to-play="true"');
    expect(result.html).toContain('data-rx-video-double-click-fullscreen="true"');
    expect(result.html).toContain('data-rx-video-side-click-skip="true"');
    expect(result.html).toContain('data-resux-video-zone="left"');
    expect(result.html).toContain('data-resux-video-zone="center"');
    expect(result.html).toContain('data-resux-video-zone="right"');
    expect(result.html).toContain('data-resux-video="loading"');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "video",
        href: "/media-test/videos/sample-video.mp4",
        type: "video/mp4",
        fetchpriority: "high",
      })
    ]));
    const videoPreloads = (result.head.link ?? []).filter(
      (entry) => entry.rel === "preload" && entry.as === "video",
    );
    expect(videoPreloads).toHaveLength(1);
  });

  it("does not emit a video preload link for lazy videos by default", async () => {
    const page = defineComponent({
      id: "m-video-lazy-no-preload",
      name: "VideoLazyNoPreloadPage",
      file: "VideoLazyNoPreloadPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "static", name: "lazy", value: "true" },
            { kind: "static", name: "controls", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/media", params: {}, query: {} },
    });

    const videoPreloads = (result.head.link ?? []).filter(
      (entry) => entry.rel === "preload" && entry.as === "video",
    );
    expect(videoPreloads).toHaveLength(0);
  });

  it("normalizes preload as values in SSR head output", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const page = defineComponent({
        id: "m-preload-normalize",
        name: "PreloadNormalizePage",
        file: "PreloadNormalizePage.vue",
        handlers: [],
        async script() {
          return {};
        },
        template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Head" }] }],
      });

      const result = await renderApp({
        page,
        route: { path: "/head", params: {}, query: {} },
        appHead: {
          link: [
            { rel: "preload", as: "priority", href: "/images/hero.webp" },
            { rel: "preload", as: "fetchpriority", href: "/styles/app.css" },
            { rel: "preload", as: "video/mp4", href: "/media-test/videos/sample-video.mp4" },
            { rel: "preload", as: "mp4", href: "/media-test/videos/sample-video-alt.mp4" },
            { rel: "preload", as: "webp", href: "/images/poster.webp" },
            { rel: "modulepreload", as: "module", href: "/__resux/client/chunk.mjs" },
            { rel: "preload", as: "resux-image", href: "/unknown-asset" },
          ],
        },
      });
      const html = renderDocument(result);

      expect(html).toContain('rel="preload" as="image" href="/images/hero.webp"');
      expect(html).toContain('rel="preload" as="style" href="/styles/app.css"');
      expect(html).toContain('rel="preload" as="video" href="/media-test/videos/sample-video.mp4"');
      expect(html).toContain('rel="preload" as="video" href="/media-test/videos/sample-video-alt.mp4"');
      expect(html).toContain('rel="preload" as="image" href="/images/poster.webp"');
      expect(html).toContain('rel="modulepreload" href="/__resux/client/chunk.mjs"');
      expect(html).not.toContain('as="module"');
      expect(html).not.toContain('as="priority"');
      expect(html).not.toContain('as="mp4"');
      expect(html).not.toContain('as="video/mp4"');
      expect(html).not.toContain('as="webp"');
      expect(html).not.toContain('as="fetchpriority"');
      expect(html).not.toContain('as="resux-image"');
      expect(warnSpy).toHaveBeenCalledWith(
        '[resux] Skipping invalid preload link for "/unknown-asset". Unsupported as="resux-image".',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("uses custom controls by default and supports controls load/icon configuration", async () => {
    const page = defineComponent({
      id: "m-video-controls-mode",
      name: "VideoControlsModePage",
      file: "VideoControlsModePage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "controls-load", value: "lazy" },
            { kind: "static", name: "icons-load", value: "lazy" },
            { kind: "static", name: "theme", value: "light" },
            { kind: "static", name: "accent-color", value: "#22c55e" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
      runtimeConfig: {
        public: {
          video: {
            controlsMode: "custom",
            controlsLoad: "lazy",
            iconsLoad: "lazy",
          },
        },
      },
    });

    expect(result.html).toContain('data-rx-video-shell="true"');
    expect(result.html).toContain('data-rx-video-custom-controls="true"');
    expect(result.html).toContain('data-rx-video-controls-load="lazy"');
    expect(result.html).toContain('data-rx-video-icons-load="lazy"');
    expect(result.html).toContain('data-rx-video-theme="light"');
    expect(result.html).toContain('data-rx-video-controls-activated="false"');
    expect(result.html).toContain('data-rx-video-icon-play-fallback="Play"');
    expect(result.html).toContain('data-rx-video-show-progress="true"');
  });

  it("builds generated video transform URLs when format and quality variants are requested", async () => {
    const page = defineComponent({
      id: "m-video-transform-url",
      name: "VideoTransformUrlPage",
      file: "VideoTransformUrlPage.vue",
      handlers: [],
      async script() {
        return {
          transformFormats: ["webm", "mp4"],
          transformQualities: [480, 720],
        };
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "dynamic", name: "formats", value: "transformFormats", bindingId: "b0" },
            { kind: "dynamic", name: "qualities", value: "transformQualities", bindingId: "b1" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "quality-control", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
      runtimeConfig: {
        public: {
          video: {
            transforms: {
              enabled: true,
              cache: true,
            },
          },
        },
      },
    });

    expect(result.html).toContain("/_resux/generated/videos/");
    expect(result.html).toContain("format=webm");
    expect(result.html).toContain("quality=480");
    expect(result.html).toContain('cache=1d');
    expect(result.html).toContain('<option value="480p" selected>480p</option>');
    expect(result.html).toContain('<option value="720p">720p</option>');
    expect(result.html).toContain('data-rx-video-quality-control="true"');
  });

  it("keeps original video source when format is explicitly disabled", async () => {
    const page = defineComponent({
      id: "m-video-transform-disabled",
      name: "VideoTransformDisabledPage",
      file: "VideoTransformDisabledPage.vue",
      handlers: [],
      async script() {
        return {
          disableFormat: null,
        };
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "dynamic", name: "format", value: "disableFormat", bindingId: "b0" },
            { kind: "static", name: "controls", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
      runtimeConfig: {
        public: {
          video: {
            transforms: {
              enabled: true,
              cache: true,
            },
          },
        },
      },
    });

    expect(result.html).toContain('src="/media-test/videos/sample-video.mp4"');
    expect(result.html).not.toContain("/_resux/generated/videos/");
    expect(result.html).not.toContain("/__resux/video?");
  });

  it("derives quality selector options from source quality labels", async () => {
    const page = defineComponent({
      id: "m-video-quality-from-sources",
      name: "VideoQualityFromSourcesPage",
      file: "VideoQualityFromSourcesPage.vue",
      handlers: [],
      async script() {
        return {
          sourceVariants: [
            { src: "/media-test/videos/sample-480.mp4", type: "video/mp4", quality: "480p" },
            { src: "/media-test/videos/sample-720.mp4", type: "video/mp4", quality: "720p" },
          ],
        };
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "dynamic", name: "sources", value: "sourceVariants", bindingId: "b0" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "quality-control", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
    });

    expect(result.html).toContain('data-rx-video-quality-control="true"');
    expect(result.html).toContain('<option value="480p" selected>480p</option>');
    expect(result.html).toContain('<option value="720p">720p</option>');
    expect(result.html).toContain('data-rx-video-default-quality="480p"');
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForText(window, "/api/test");

    expect(window.document.querySelector("[data-rx-text='s0:b0']")?.textContent).toBe("/api/test");
  });

  it("activates visible client enhancements immediately when the target is already visible", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-visible-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("swiper-carousel", async (target) => {
  target.setAttribute("data-enhanced", "true");
  return () => {
    target.setAttribute("data-cleaned", "true");
  };
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["swiper-carousel"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="slider" data-resux-enhancement="swiper-carousel" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("slider") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 500,
      bottom: 200,
      width: 500,
      height: 200,
      toJSON: () => "",
    }) as unknown as DOMRect;

    let observedCount = 0;
    class MockIntersectionObserver {
      constructor() {
        observedCount++;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    const lifecycleEvents: string[] = [];
    for (const eventName of ["found", "triggered", "loading", "ready", "cleanup-ready"]) {
      window.addEventListener(`resux:enhancement:${eventName}`, () => {
        lifecycleEvents.push(eventName);
      });
    }

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");

    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(observedCount).toBe(0);
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
    expect(lifecycleEvents).toEqual(expect.arrayContaining(["found", "triggered", "loading", "ready", "cleanup-ready"]));
  });

  it("supports enhancement alias attributes and executes cleanup disposers", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-alias-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("alias-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
  return () => {
    target.setAttribute("data-cleaned", "true");
  };
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["alias-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="alias-target" use-client-enhancement="alias-demo" data-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("alias-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 160,
      width: 400,
      height: 160,
      toJSON: () => "",
    }) as unknown as DOMRect;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    const runtimeModule = await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");
    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-rx-enhancement")).toBe("alias-demo");

    await runtimeModule.disposeClientEnhancements();
    expect(target.getAttribute("data-cleaned")).toBe("true");
  });

  it("activates visible enhancements after IntersectionObserver reports intersection", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-observed-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("observed-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["observed-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="observed-target" data-resux-enhancement="observed-demo" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("observed-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 1400,
      top: 1400,
      left: 0,
      right: 300,
      bottom: 1500,
      width: 300,
      height: 100,
      toJSON: () => "",
    }) as unknown as DOMRect;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => typeof observerCallback === "function");
    expect(target.getAttribute("data-enhanced")).toBeNull();
    expect(observerCallback).toBeTypeOf("function");

    observerCallback?.([{ target, isIntersecting: true, intersectionRatio: 1 }]);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");

    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("activates visible enhancements when visibility polling detects an already-visible element", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-visible-poll-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("poll-visible-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["poll-visible-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="poll-target" data-resux-enhancement="poll-visible-demo" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("poll-target") as HTMLElement;

    let isVisible = false;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: isVisible ? 0 : 1600,
      top: isVisible ? 0 : 1600,
      left: 0,
      right: 320,
      bottom: isVisible ? 120 : 1720,
      width: 320,
      height: 120,
      toJSON: () => "",
    }) as unknown as DOMRect;

    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    setTimeout(() => {
      isVisible = true;
    }, 300);

    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");
    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("supports immediate client enhancement trigger", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-immediate-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("immediate-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["immediate-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="immediate-target" data-resux-enhancement="immediate-demo" data-resux-trigger="immediate"></section>
      </div>
    `;
    const target = window.document.getElementById("immediate-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 2500,
      top: 2500,
      left: 0,
      right: 300,
      bottom: 2600,
      width: 300,
      height: 100,
      toJSON: () => "",
    }) as unknown as DOMRect;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");
    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("supports page-load client enhancement trigger after window load", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-page-load-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("page-load-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["page-load-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="page-load-target" data-resux-enhancement="page-load-demo" data-resux-trigger="page-load"></section>
      </div>
    `;
    const target = window.document.getElementById("page-load-target") as HTMLElement;

    Object.defineProperty(window.document, "readyState", {
      configurable: true,
      value: "interactive",
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "found");
    expect(target.getAttribute("data-enhanced")).toBeNull();

    window.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");

    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("passes parsed data-resux-options to client enhancements", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-options-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("options-demo", async (target, options) => {
  target.setAttribute("data-options-foo", String(options?.foo ?? ""));
  target.setAttribute("data-options-copy", String(options?.options?.foo ?? ""));
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["options-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section
          id="options-target"
          data-resux-enhancement="options-demo"
          data-resux-trigger="immediate"
          data-resux-options='{"foo":"bar"}'
        ></section>
      </div>
    `;
    const target = window.document.getElementById("options-target") as HTMLElement;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "active");

    expect(target.getAttribute("data-options-foo")).toBe("bar");
    expect(target.getAttribute("data-options-copy")).toBe("bar");
    expect(target.getAttribute("data-resux-options")).toBe('{"foo":"bar"}');
  });

  it("reports parse errors when data-resux-options contains invalid JSON", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-options-error-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("options-error-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["options-error-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section
          id="options-error-target"
          data-resux-enhancement="options-error-demo"
          data-resux-trigger="immediate"
          data-resux-options='{"foo":'
        ></section>
      </div>
    `;
    const target = window.document.getElementById("options-error-target") as HTMLElement;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "error");

    expect(target.getAttribute("data-enhanced")).toBeNull();
    expect(target.getAttribute("data-rx-enhancement-error")).toContain("Failed to parse options");
    expect(target.getAttribute("data-rx-enhancement-error")).toContain("data-resux-options");
  });

  it("marks missing client enhancements with friendly errors instead of staying pending", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-missing-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(manifestFile, "export const clientEnhancements = [];\n", "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="missing-target" data-resux-enhancement="missing-enhancement" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("missing-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 120,
      width: 320,
      height: 120,
      toJSON: () => "",
    }) as unknown as DOMRect;

    let enhancementError = "";
    window.addEventListener("resux:enhancement:error", (event) => {
      enhancementError = String((event as CustomEvent).detail?.error ?? "");
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "error");

    expect(target.getAttribute("data-resux-enhancement-status")).toBe("error");
    expect(target.getAttribute("data-rx-enhancement-error")).toContain('Client enhancement "missing-enhancement" was used but not registered.');
    expect(target.getAttribute("data-rx-enhancement-error")).toContain("client-enhancements/missing-enhancement.client.ts");
    expect(enhancementError).toContain("missing-enhancement");
  });

  it("supports keyboard interaction trigger for client enhancements", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-interaction-keyboard-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("interaction-keyboard-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["interaction-keyboard-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section
          id="keyboard-target"
          tabindex="0"
          data-resux-enhancement="interaction-keyboard-demo"
          data-resux-trigger="interaction"
        ></section>
      </div>
    `;
    const target = window.document.getElementById("keyboard-target") as HTMLElement;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "found");

    target.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "active");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("emits package loading/loaded/css events when a client package enhancement resolves", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-package-events-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const packageFile = path.join(tempDir, "demo-package.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    const packageSpecifier = pathToFileURL(packageFile).href;
    await writeFile(
      runtimeFile,
      getClientRuntimeSource({
        packageRegistry: {
          importers: [packageSpecifier],
          declared: [packageSpecifier],
        },
      }),
      "utf8",
    );
    await writeFile(packageFile, "export const ready = true;\nexport default { ready };\n", "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement, useClientPackage } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("package-events-demo", async (target) => {
  await useClientPackage(${JSON.stringify(packageSpecifier)}, {
    preferDefault: false,
    css: ["/assets/demo-package.css"]
  });
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["package-events-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="package-events-target" data-resux-enhancement="package-events-demo" data-resux-trigger="immediate"></section>
      </div>
    `;
    const target = window.document.getElementById("package-events-target") as HTMLElement;
    const packageEvents: string[] = [];
    const cssEntries: string[] = [];
    window.addEventListener("resux:package:loading", () => packageEvents.push("loading"));
    window.addEventListener("resux:package:loaded", () => packageEvents.push("loaded"));
    window.addEventListener("resux:package-css:loaded", (event) => {
      cssEntries.push(String((event as CustomEvent).detail?.entry ?? ""));
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true", 15000);

    expect(packageEvents).toEqual(expect.arrayContaining(["loading", "loaded"]));
    expect(cssEntries).toContain("/assets/demo-package.css");
  });

  it("emits package error events when a configured client package is missing from the generated registry", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-package-error-events-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    const missingPackage = "resux-missing-registry-package";
    await writeFile(
      runtimeFile,
      getClientRuntimeSource({
        packageRegistry: {
          declared: [missingPackage],
        },
      }),
      "utf8",
    );

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement, useClientPackage } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("package-error-demo", async () => {
  await useClientPackage(${JSON.stringify(missingPackage)});
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["package-error-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="package-error-target" data-resux-enhancement="package-error-demo" data-resux-trigger="immediate"></section>
      </div>
    `;
    const target = window.document.getElementById("package-error-target") as HTMLElement;
    let packageErrorDetail = "";
    window.addEventListener("resux:package:error", (event) => {
      packageErrorDetail = String((event as CustomEvent).detail?.error ?? "");
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "error");
    expect(packageErrorDetail).toContain(missingPackage);
    expect(packageErrorDetail).toContain("generated client registry");
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

  it("normalizes preload head links on client navigation updates", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const tempDir = path.join(os.tmpdir(), `resux-head-normalize-client-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
      const runtimeFile = path.join(tempDir, "runtime-client.mjs");
      await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

      const window = new Window({ url: "http://localhost/" });
      window.document.body.innerHTML = `
        <div id="__resux">
          <a href="/head">Head</a>
          <main>Home</main>
        </div>
      `;

      Object.assign(globalThis, {
        document: window.document,
        window,
        location: window.location,
        history: window.history,
        scrollTo: () => undefined,
        fetch: async () => {
          return new Response(
            JSON.stringify({
              html: "<main>Head</main>",
              head: {
                title: "Head",
                link: [
                  { rel: "preload", as: "priority", href: "/images/lcp.webp" },
                  { rel: "preload", as: "fetchpriority", href: "/styles/route.css" },
                  { rel: "preload", as: "video/mp4", href: "/media-test/videos/sample-video.mp4" },
                  { rel: "preload", as: "webp", href: "/images/poster.webp" },
                  { rel: "modulepreload", as: "module", href: "/__resux/client/chunk-head.mjs" },
                  { rel: "preload", as: "resux-video", href: "/unknown-client-preload" },
                ]
              },
              payload: {
                route: { path: "/head", params: {}, query: {} },
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

      await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
      window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
      await waitForHtml(window, "<main>Head</main>");

      const links = Array.from(window.document.querySelectorAll("link[data-rx-head='true']"));
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "image" && link.getAttribute("href") === "/images/lcp.webp")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "style" && link.getAttribute("href") === "/styles/route.css")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "video" && link.getAttribute("href") === "/media-test/videos/sample-video.mp4")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "image" && link.getAttribute("href") === "/images/poster.webp")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "modulepreload" && !link.hasAttribute("as") && link.getAttribute("href") === "/__resux/client/chunk-head.mjs")).toBe(true);
      expect(links.some((link) => link.getAttribute("href") === "/unknown-client-preload")).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        '[resux] Skipping invalid preload link for "/unknown-client-preload". Unsupported as="resux-video".',
      );
    } finally {
      warnSpy.mockRestore();
    }
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(fetchCalls).toBe(0);
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("About page");
    expect(window.location.pathname).toBe("/about");
    expect(window.location.search).toBe("?tab=info");
  });

  it("swaps route payloads on browser history navigation after the URL already changed", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-popstate-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/state" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <main>State</main>
      </div>
    `;

    const requestedPaths: string[] = [];
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        requestedPaths.push(decodeURIComponent(request.searchParams.get("path") ?? ""));
        return new Response(
          JSON.stringify({
            html: "<main>Media</main>",
            head: { title: "Media" },
            payload: {
              route: { path: "/media", params: {}, query: {} },
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
        route: { path: "/state", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.history.replaceState({ __resux: true, path: "/media" }, "", "/media");
    window.dispatchEvent(new window.Event("popstate"));
    await waitForHtml(window, "<main>Media</main>");

    expect(requestedPaths).toEqual(["/media"]);
    expect(window.location.pathname).toBe("/media");
    expect((globalThis as any).__RESUX__.route.path).toBe("/media");
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
          { kind: "static", name: "width", value: "560" },
          { kind: "static", name: "height", value: "280" },
          { kind: "static", name: "sizes", value: "100vw" },
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<img");

    const html = window.document.body.innerHTML;
    expect(html).toContain("/__resux/image?src=%2Fhero.webp&amp;original=%2Fhero.png&amp;w=560&amp;h=280&amp;q=80&amp;f=webp");
    expect(html).toContain('srcset="/__resux/image?src=%2Fhero.webp&amp;original=%2Fhero.png&amp;w=320&amp;h=160&amp;q=80&amp;f=webp 320w, /__resux/image?src=%2Fhero.webp&amp;original=%2Fhero.png&amp;w=560&amp;h=280&amp;q=80&amp;f=webp 560w"');
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

  it("reveals deferred lazy images only after intersection events", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-lazy-reveal-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Home</main></div>
      <picture>
        <source data-rx-lazy-srcset="/img/sample.avif 1x" type="image/avif">
        <img
          data-rx-lazy-image="true"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          data-rx-lazy-src="/img/sample.webp"
          data-rx-lazy-srcset="/img/sample.webp 1x, /img/sample@2x.webp 2x"
          alt="Sample"
          loading="lazy"
        >
      </picture>
    `;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    const observedTargets = new Set<Element>();
    class MockIntersectionObserver {
      constructor(
        callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void
      ) {
        observerCallback = callback;
      }
      observe(target: Element) {
        observedTargets.add(target);
      }
      unobserve(target: Element) {
        observedTargets.delete(target);
      }
      disconnect() {
        observedTargets.clear();
      }
    }

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const image = window.document.querySelector("img[data-rx-lazy-image]") as HTMLImageElement;
    const source = window.document.querySelector("source[type='image/avif']") as HTMLSourceElement;

    expect(observedTargets.has(image)).toBe(true);
    expect(image.getAttribute("src")).toContain("data:image/gif;base64");
    expect(image.getAttribute("srcset")).toBeNull();
    expect(source.getAttribute("srcset")).toBeNull();
    expect(observerCallback).toBeTypeOf("function");

    observerCallback!([{ target: image, isIntersecting: true, intersectionRatio: 1 }]);

    expect(image.getAttribute("src")).toBe("/img/sample.webp");
    expect(image.getAttribute("srcset")).toBe("/img/sample.webp 1x, /img/sample@2x.webp 2x");
    expect(source.getAttribute("srcset")).toBe("/img/sample.avif 1x");
    expect(image.getAttribute("data-rx-lazy-ready")).toBe("true");
    expect(image.getAttribute("data-resux-revealed")).toBe("true");
    expect(image.getAttribute("data-resux-img")).toBe("loading");
  });

  it("keeps image placeholders until decode settles", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-image-decode-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <img
        data-resux-media="img"
        data-resux-img="loading"
        data-resux-loading="true"
        data-rx-placeholder-src="/__resux/resux-placeholder.svg"
        data-rx-placeholder-active="true"
        data-resux-placeholder-active="true"
        style="background-image: url('/__resux/resux-placeholder.svg'); background-size: cover; background-position: center; background-repeat: no-repeat;"
        src="/media-test/images/hero-square.jpg"
        alt="Decode test"
      >
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const image = window.document.querySelector("img[data-resux-media='img']") as HTMLImageElement;
    let resolveDecode: (() => void) | null = null;
    image.decode = (() => new Promise<void>((resolve) => {
      resolveDecode = resolve;
    })) as HTMLImageElement["decode"];

    image.dispatchEvent(new window.Event("load", { bubbles: true }));
    expect(image.getAttribute("data-rx-placeholder-active")).toBe("true");
    expect(image.getAttribute("data-resux-img")).toBe("loading");

    resolveDecode?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(image.getAttribute("data-rx-placeholder-active")).toBeNull();
    expect(image.getAttribute("data-resux-img")).toBe("loaded");
  });

  it("handles lazy picture failures once and switches to fallback without reusing failed sources", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-picture-fallback-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <picture data-resux-media="picture">
        <source data-rx-lazy-srcset="/__resux/image?src=%2Fmedia-test%2Fimages%2Fmissing-picture.webp&original=%2Fmedia-test%2Fimages%2Fmissing-picture.jpg&w=840&f=webp" type="image/webp">
        <img
          data-rx-lazy-image="true"
          data-rx-fallback-src="/media-test/images/hero-square.jpg"
          data-rx-placeholder-src="/__resux/resux-placeholder.svg"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          data-rx-lazy-src="/__resux/image?src=%2Fmedia-test%2Fimages%2Fhero-square.jpg&w=840"
          alt="Broken picture"
          loading="lazy"
        >
      </picture>
    `;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const image = window.document.querySelector("img[data-rx-lazy-image]") as HTMLImageElement;
    const source = window.document.querySelector("source[type='image/webp']") as HTMLSourceElement;

    observerCallback!([{ target: image, isIntersecting: true, intersectionRatio: 1 }]);
    expect(source.getAttribute("srcset")).toContain("missing-picture.webp");

    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: "http://localhost/__resux/image?src=%2Fmedia-test%2Fimages%2Fmissing-picture.webp&original=%2Fmedia-test%2Fimages%2Fmissing-picture.jpg&w=840&f=webp"
    });
    image.dispatchEvent(new window.Event("error", { bubbles: true }));

    expect(source.getAttribute("srcset")).toBeNull();
    expect(image.getAttribute("src")).toBe("/media-test/images/hero-square.jpg");
    expect(image.getAttribute("data-resux-error-handled")).toBe("true");
    expect(image.getAttribute("data-resux-fallback-active")).toBe("true");

    image.dispatchEvent(new window.Event("error", { bubbles: true }));
    expect(image.getAttribute("src")).toBe("/media-test/images/hero-square.jpg");
  });

  it("reveals lazy videos once and clears failed sources without retrying", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-fallback-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <video
        data-rx-lazy-video="true"
        data-rx-lazy-src="/media-test/videos/missing.mp4"
        data-rx-lazy-preload="metadata"
        data-rx-fallback-poster="/media-test/videos/sample-poster.jpg"
        data-rx-placeholder-src="/__resux/resux-placeholder.svg"
        preload="none"
      >
        <source data-rx-lazy-src="/media-test/videos/missing.mp4" type="video/mp4">
      </video>
    `;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    let loadCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    const video = window.document.querySelector("video") as HTMLVideoElement;
    video.load = () => {
      loadCalls++;
    };

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const source = window.document.querySelector("source") as HTMLSourceElement;

    observerCallback!([{ target: video, isIntersecting: true, intersectionRatio: 1 }]);
    expect(source.getAttribute("src")).toBe("/media-test/videos/missing.mp4");
    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.getAttribute("data-resux-revealed")).toBe("true");
    expect(video.getAttribute("data-resux-video-loading")).toBe("true");
    expect(loadCalls).toBe(1);

    Object.defineProperty(video, "currentSrc", {
      configurable: true,
      value: "http://localhost/media-test/videos/missing.mp4"
    });
    video.dispatchEvent(new window.Event("error", { bubbles: true }));

    expect(video.getAttribute("src")).toBeNull();
    expect(source.getAttribute("src")).toBeNull();
    expect(video.getAttribute("poster")).toBe("/media-test/videos/sample-poster.jpg");
    expect(video.getAttribute("data-resux-error-handled")).toBe("true");

    video.dispatchEvent(new window.Event("error", { bubbles: true }));
    expect(loadCalls).toBe(1);
  });

  it("applies video click zones, skip actions, and control-safe interactions", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-speed-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <div
        data-rx-video-shell="true"
        data-rx-video-controls-ready="true"
        data-rx-video-icon-play=">"
        data-rx-video-icon-pause="||"
        data-rx-video-icon-mute="M"
        data-rx-video-icon-unmute="S"
        data-rx-video-icon-fullscreen="[ ]"
        data-rx-video-icon-exit-fullscreen="X"
        data-rx-video-speed-control="true"
        data-rx-video-speeds="0.5,0.75,1,1.25,1.5,2"
        data-rx-video-default-speed="1.25"
        data-rx-video-show-speed-icon="true"
        data-rx-video-speed-label="Playback speed"
        data-rx-video-skip-controls="true"
        data-rx-video-side-click-skip="true"
        data-rx-video-click-to-play="true"
        data-rx-video-double-click-fullscreen="true"
        data-rx-video-has-interaction-zones="true"
        data-rx-video-skip-backward="5"
        data-rx-video-skip-forward="10"
        data-rx-video-show-skip-overlay="true"
        data-rx-video-disable-skip-on-controls="true"
        data-rx-video-custom-controls="true"
      >
        <video data-resux-media="video" data-rx-video-default-speed="1.25" data-resux-video="ready"></video>
        <div class="rx-video-click-zones" data-rx-video-click-zones data-rx-video-skip-overlay-zone aria-hidden="false">
          <button type="button" class="rx-video-zone rx-video-zone-left" data-rx-video-zone="left" data-resux-video-zone="left" aria-label="Skip backward 5s"></button>
          <button type="button" class="rx-video-zone rx-video-zone-center" data-rx-video-zone="center" data-resux-video-zone="center" aria-label="Toggle play or pause video"></button>
          <button type="button" class="rx-video-zone rx-video-zone-right" data-rx-video-zone="right" data-resux-video-zone="right" aria-label="Skip forward 10s"></button>
        </div>
        <div class="rx-video-controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">
          <button type="button" class="rx-video-btn rx-video-toggle" data-rx-video-toggle data-resux-video-control="true" aria-label="Play video">></button>
          <span class="rx-video-time" data-rx-video-current>0:00</span>
          <input class="rx-video-seek" data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek video">
          <span class="rx-video-time" data-rx-video-duration>0:00</span>
          <button type="button" class="rx-video-btn rx-video-mute" data-rx-video-mute data-resux-video-control="true" aria-label="Toggle mute">S</button>
          <input class="rx-video-volume" data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
          <button type="button" class="rx-video-btn rx-video-speed" data-rx-video-speed data-resux-video-control="true" aria-label="Playback speed">>> 1x</button>
          <button type="button" class="rx-video-btn rx-video-fullscreen" data-rx-video-fullscreen data-resux-video-control="true" aria-label="Toggle fullscreen">[ ]</button>
        </div>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const video = window.document.querySelector("video[data-resux-media='video']") as HTMLVideoElement;
    const shell = window.document.querySelector("[data-rx-video-shell='true']") as HTMLElement;
    const speedButton = window.document.querySelector("[data-rx-video-speed]") as HTMLButtonElement;
    const leftZone = window.document.querySelector("[data-rx-video-zone='left']") as HTMLButtonElement;
    const centerZone = window.document.querySelector("[data-rx-video-zone='center']") as HTMLButtonElement;
    const rightZone = window.document.querySelector("[data-rx-video-zone='right']") as HTMLButtonElement;
    const seekInput = window.document.querySelector("[data-rx-video-seek]") as HTMLInputElement;

    let paused = true;
    let playCalls = 0;
    let pauseCalls = 0;
    Object.defineProperty(video, "paused", {
      configurable: true,
      get: () => paused,
    });
    video.play = (() => {
      paused = false;
      playCalls++;
      return Promise.resolve();
    }) as HTMLMediaElement["play"];
    video.pause = (() => {
      paused = true;
      pauseCalls++;
    }) as HTMLMediaElement["pause"];

    let fullscreenElement: Element | null = null;
    Object.defineProperty(window.document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    (shell as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = async () => {
      fullscreenElement = shell;
    };
    (window.document as unknown as { exitFullscreen: () => Promise<void> }).exitFullscreen = async () => {
      fullscreenElement = null;
    };

    expect(video.playbackRate).toBe(1.25);
    expect(speedButton.textContent).toContain("1.25x");

    speedButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.playbackRate).toBe(1.5);
    expect(speedButton.textContent).toContain("1.5x");

    Object.defineProperty(video, "duration", { configurable: true, value: 120 });
    video.currentTime = 40;
    leftZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(35);

    rightZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(45);

    video.currentTime = 2;
    leftZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(0);

    video.currentTime = 118;
    rightZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(120);

    centerZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 240));
    expect(playCalls).toBe(1);
    expect(video.getAttribute("data-resux-video")).toBe("playing");

    centerZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 240));
    expect(pauseCalls).toBe(1);

    centerZone.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, cancelable: true, button: 0 }));
    expect(fullscreenElement).toBe(shell);

    video.currentTime = 10;
    seekInput.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(10);
  });

  it("preserves playback state when switching managed video quality options", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-quality-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const qualityOptions = [
      {
        id: "480p",
        label: "480p",
        sources: [{ src: "/media-test/videos/sample-480.mp4", type: "video/mp4" }],
      },
      {
        id: "720p",
        label: "720p",
        sources: [{ src: "/media-test/videos/sample-720.mp4", type: "video/mp4" }],
      },
    ];
    const serializedQualities = JSON.stringify(qualityOptions).replace(/"/g, "&quot;");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <div
        data-rx-video-shell="true"
        data-rx-video-controls-ready="true"
        data-rx-video-custom-controls="true"
        data-rx-video-quality-control="true"
        data-rx-video-qualities="${serializedQualities}"
        data-rx-video-default-quality="480p"
      >
        <video
          data-resux-media="video"
          data-rx-video-active-quality="480p"
          data-rx-video-active-source-signature="/media-test/videos/sample-480.mp4|video/mp4"
          data-resux-video="playing"
          src="/media-test/videos/sample-480.mp4"
        >
          <source src="/media-test/videos/sample-480.mp4" type="video/mp4">
        </video>
        <div class="rx-video-controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">
          <button type="button" data-rx-video-toggle data-resux-video-control="true">Play</button>
          <span data-rx-video-current>0:00</span>
          <input data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0">
          <span data-rx-video-duration>0:00</span>
          <button type="button" data-rx-video-mute data-resux-video-control="true">Mute</button>
          <input data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1">
          <label data-rx-video-quality-wrap data-resux-video-control="true">
            <select data-rx-video-quality data-resux-video-control="true">
              <option value="480p">480p</option>
              <option value="720p">720p</option>
            </select>
          </label>
          <button type="button" data-rx-video-fullscreen data-resux-video-control="true">Fullscreen</button>
        </div>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const video = window.document.querySelector("video[data-resux-media='video']") as HTMLVideoElement;
    const qualitySelect = window.document.querySelector("[data-rx-video-quality]") as HTMLSelectElement;
    const source = window.document.querySelector("video source") as HTMLSourceElement;

    let paused = false;
    let playCalls = 0;
    Object.defineProperty(video, "paused", {
      configurable: true,
      get: () => paused,
    });
    video.play = (() => {
      paused = false;
      playCalls++;
      return Promise.resolve();
    }) as HTMLMediaElement["play"];

    let loadCalls = 0;
    video.load = (() => {
      loadCalls++;
    }) as HTMLMediaElement["load"];

    Object.defineProperty(video, "duration", { configurable: true, value: 120 });
    video.currentTime = 42;
    video.playbackRate = 1.5;
    video.volume = 0.35;
    video.muted = true;

    qualitySelect.value = "720p";
    qualitySelect.dispatchEvent(new window.Event("change", { bubbles: true, cancelable: true }));

    expect(loadCalls).toBe(1);
    expect(source.getAttribute("src")).toBe("/media-test/videos/sample-720.mp4");
    expect(video.getAttribute("data-rx-video-active-quality")).toBe("720p");
    expect(video.getAttribute("data-rx-video-pending-quality")).toBe("720p");

    video.dispatchEvent(new window.Event("loadedmetadata", { bubbles: true }));
    video.dispatchEvent(new window.Event("canplay", { bubbles: true }));

    expect(video.currentTime).toBe(42);
    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBeCloseTo(0.35);
    expect(video.muted).toBe(true);
    expect(playCalls).toBeGreaterThan(0);
  });

  it("waits for page-ready before revealing defer-until-page-ready videos", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-page-ready-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    Object.defineProperty(window.document, "readyState", {
      configurable: true,
      value: "loading",
    });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <video
        data-rx-lazy-video="true"
        data-rx-lazy-src="/media-test/videos/sample-video.mp4"
        data-rx-lazy-preload="metadata"
        data-rx-video-defer-ready="true"
        data-rx-video-ready-reveal="true"
        preload="none"
      ></video>
    `;

    let observerConstructed = 0;
    class MockIntersectionObserver {
      constructor() {
        observerConstructed++;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      requestIdleCallback: (callback: () => void) => {
        callback();
        return 1;
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    const video = window.document.querySelector("video") as HTMLVideoElement;
    let loadCalls = 0;
    video.load = () => {
      loadCalls++;
    };

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    expect(video.getAttribute("data-resux-revealed")).toBeNull();
    expect(observerConstructed).toBe(0);
    expect(loadCalls).toBe(0);

    Object.defineProperty(window.document, "readyState", {
      configurable: true,
      value: "complete",
    });
    window.dispatchEvent(new window.Event("load"));

    expect(video.getAttribute("data-resux-revealed")).toBe("true");
    expect(video.getAttribute("data-resux-video-loading")).toBe("true");
    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.getAttribute("src")).toBe("/media-test/videos/sample-video.mp4");
    expect(loadCalls).toBe(1);
  });

  it("blocks managed media anchor navigation to generated assets", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-media-link-guard-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/_resux/generated/images/abcd1234.webp?src=%2Fmedia-test%2Fimages%2Fhero-large.jpg&cache=1d" id="media-link">
        <img data-resux-media="img" src="/resux-placeholder.svg" alt="media">
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: `<main>Media</main>`,
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const mediaImage = window.document.querySelector("img[data-resux-media='img']") as HTMLImageElement;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    mediaImage.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(routeFetchCalls).toBe(0);
  });

  it("blocks managed media anchor navigation for generated video assets", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-link-guard-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/_resux/generated/videos/abcd1234.mp4?src=%2Fmedia-test%2Fvideos%2Fsample-video.mp4&cache=1d" id="video-link">
        <video data-resux-media="video" src="/media-test/videos/sample-video.mp4"></video>
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: `<main>Media</main>`,
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const mediaVideo = window.document.querySelector("video[data-resux-media='video']") as HTMLVideoElement;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    mediaVideo.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(routeFetchCalls).toBe(0);
  });

  it("ignores router interception for media control targets inside anchors", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-media-click-ignore-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/about" id="about-link">
        <button type="button" data-rx-video-toggle>Play</button>
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/about", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: "<main>About</main>",
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const playButton = window.document.querySelector("[data-rx-video-toggle]") as HTMLButtonElement;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    playButton.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(routeFetchCalls).toBe(0);
  });

  it("ignores prefetch for media/static links", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-media-prefetch-ignore-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/media-test/videos/sample-video.mp4" id="media-prefetch-link">
        <img data-resux-media="img" src="/resux-placeholder.svg" alt="media">
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: "<main>Media</main>",
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const mediaImage = window.document.querySelector("img[data-resux-media='img']") as HTMLImageElement;
    mediaImage.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true, cancelable: true }));

    expect(routeFetchCalls).toBe(0);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
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
  for (let attempt = 0; attempt < 150; attempt++) {
    if (window.document.querySelector("[data-rx-text='s0:b0']")?.textContent === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForHtml(window: Window, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (window.document.body.innerHTML.includes(expected)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForSignal(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    if ((globalThis as any).__RESUX_TEST_SIGNAL__) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

