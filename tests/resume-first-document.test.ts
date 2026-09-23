import { describe, expect, it } from "vitest";
import {
  getClientRuntimeBootPlan,
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

  it("defers event-only pages until their first resumable interaction", () => {
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
    expect(getClientRuntimeBootPlan(result)).toEqual({
      mode: "interaction",
      eventNames: ["click"],
    });

    const document = renderDocument(result);
    expect(document).toContain("window.__RESUX__=");
    expect(document).not.toContain('src="/__resux/runtime-client.mjs"');
    expect(document).toContain('const __rxEvents=["click"]');
    expect(document).toContain("const request=__rxRuntimeRequest();");
    expect(document).toContain("import(request)");
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
    expect(getClientRuntimeBootPlan(pending).mode).toBe("eager");

    const plugin = createResult("<main>Plugin</main>", {
      plugins: [{
        id: "p0",
        file: "plugins/app.client.ts",
        mode: "client",
        src: "/__resux/plugins/p0.mjs",
      }],
    });
    expect(shouldLoadClientRuntime(plugin)).toBe(true);
    expect(getClientRuntimeBootPlan(plugin).mode).toBe("eager");
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

  it("does not treat documentation text as client-work attributes or events", () => {
    const result = createResult(
      "<main><code>data-rx-vue-island</code><p>data-rx-video-controls</p><pre>data-rx-on-click=</pre></main>",
    );

    expect(getClientRuntimeBootPlan(result)).toEqual({ mode: "none", eventNames: [] });
  });

  it("boots only client middleware selected by the current route", () => {
    const namedClient = {
      id: "named-client",
      name: "auth",
      file: "middleware/auth.client.ts",
      global: false,
      mode: "client" as const,
      src: "/__resux/middleware/auth.mjs",
    };
    const globalClient = {
      id: "global-client",
      name: "analytics",
      file: "middleware/analytics.client.ts",
      global: true,
      mode: "client" as const,
      src: "/__resux/middleware/analytics.mjs",
    };

    expect(getClientRuntimeBootPlan(createResult("<main>Public</main>", {
      middleware: [namedClient],
      pageMeta: {},
    })).mode).toBe("none");

    expect(getClientRuntimeBootPlan(createResult("<main>Private</main>", {
      middleware: [namedClient],
      pageMeta: { middleware: "auth" },
    })).mode).toBe("eager");

    expect(getClientRuntimeBootPlan(createResult("<main>Global</main>", {
      middleware: [globalClient],
      pageMeta: {},
    })).mode).toBe("eager");
  });
});
