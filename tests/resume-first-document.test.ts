import { describe, expect, it } from "vitest";
import {
  renderDocument,
  shouldLoadClientRuntime,
  type RenderResult,
} from "../src/runtime/index.js";

function createResult(
  html: string,
  overrides: Partial<RenderResult["payload"]> = {},
): RenderResult {
  return {
    html,
    head: {},
    payload: {
      route: {
        path: "/",
        params: {},
        query: {},
      },
      scopes: {},
      modules: {},
      ...overrides,
    },
  } as RenderResult;
}

describe("resume-first document boot", () => {
  it("emits no executable client payload or runtime for a static document", () => {
    const result = createResult("<main><h1>Static</h1><a href=\"/docs\">Docs</a></main>");

    expect(shouldLoadClientRuntime(result)).toBe(false);

    const document = renderDocument(result);
    expect(document).not.toContain("window.__RESUX__=");
    expect(document).not.toContain("/__resux/runtime-client.mjs");
    expect(document).toContain('<a href="/docs">Docs</a>');
  });

  it("keeps the runtime for resumable event handlers", () => {
    const result = createResult(
      '<button data-rx-on-click="s0:c0:increment">Increment</button>',
      {
        scopes: {
          s0: {
            id: "s0",
            moduleId: "c0",
            state: { count: 0 },
            asyncData: {},
          },
        },
        modules: { c0: "/__resux/handlers/c0.mjs" },
      },
    );

    expect(shouldLoadClientRuntime(result)).toBe(true);

    const document = renderDocument(result);
    expect(document).toContain("window.__RESUX__=");
    expect(document).toContain('/__resux/runtime-client.mjs');
  });

  it("keeps startup behavior for pending async data and client support modules", () => {
    const pending = createResult("<main>Loading</main>", {
      scopes: {
        s0: {
          id: "s0",
          moduleId: "c0",
          state: {},
          asyncData: {
            profile: {
              value: null,
              pending: true,
              error: null,
            },
          },
        },
      },
    });
    expect(shouldLoadClientRuntime(pending)).toBe(true);

    const plugin = createResult("<main>Plugin</main>", {
      plugins: [{
        id: "p0",
        file: "plugins/app.client.ts",
        mode: "client",
        src: "/__resux/plugins/p0.mjs",
      }],
    });
    expect(shouldLoadClientRuntime(plugin)).toBe(true);
  });

  it("keeps islands, enhancements, and managed media on the client path", () => {
    expect(shouldLoadClientRuntime(createResult(
      '<div data-rx-vue-island="Chart"></div>',
    ))).toBe(true);

    expect(shouldLoadClientRuntime(createResult(
      '<section data-resux-enhancement="map"></section>',
    ))).toBe(true);

    expect(shouldLoadClientRuntime(createResult(
      '<img data-rx-lazy-image="true" data-rx-lazy-src="/hero.webp">',
    ))).toBe(true);

    expect(shouldLoadClientRuntime(createResult(
      '<img data-resux-img="loading" data-rx-fallback-src="/fallback.webp" src="/hero.webp">',
    ))).toBe(true);
  });

  it("does not treat documentation text as client-work attributes", () => {
    const result = createResult(
      "<main><code>data-rx-vue-island</code><p>data-rx-video-controls</p><pre>data-rx-on-click=</pre></main>",
    );

    expect(shouldLoadClientRuntime(result)).toBe(false);
  });

  it("boots only client middleware selected by the current route", () => {
    const middleware = [
      {
        id: "global-server",
        name: "server-only",
        file: "middleware/server.ts",
        global: true,
        mode: "server" as const,
        src: "/__resux/middleware/server.mjs",
      },
      {
        id: "named-client",
        name: "auth",
        file: "middleware/auth.client.ts",
        global: false,
        mode: "client" as const,
        src: "/__resux/middleware/auth.mjs",
      },
      {
        id: "global-client",
        name: "analytics",
        file: "middleware/analytics.client.ts",
        global: true,
        mode: "client" as const,
        src: "/__resux/middleware/analytics.mjs",
      },
    ];

    expect(shouldLoadClientRuntime(createResult("<main>Public</main>", {
      middleware: middleware.slice(0, 2),
      pageMeta: {},
    }))).toBe(false);

    expect(shouldLoadClientRuntime(createResult("<main>Private</main>", {
      middleware: middleware.slice(0, 2),
      pageMeta: { middleware: "auth" },
    }))).toBe(true);

    expect(shouldLoadClientRuntime(createResult("<main>Global</main>", {
      middleware: [middleware[2]],
      pageMeta: {},
    }))).toBe(true);
  });
});
