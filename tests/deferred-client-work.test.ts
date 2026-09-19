import { describe, expect, it } from "vitest";
import {
  defineComponent,
  getClientRuntimeBootPlan,
  renderApp,
  renderDocument,
  type RenderResult,
} from "../src/runtime/index.js";
import { getResumeBootstrapSource } from "../src/runtime/resume.js";

function createResult(html: string): RenderResult {
  return {
    html,
    head: {},
    payload: {
      route: { path: "/", params: {}, query: {} },
      scopes: {},
      modules: {},
    },
  } as RenderResult;
}

describe("demand-driven client work", () => {
  it("renders Vue island trigger metadata without importing its client module on the server", async () => {
    const page = defineComponent({
      id: "page",
      name: "Page",
      file: "Page.vue",
      handlers: [],
      script() {
        return {};
      },
      template: [{
        type: "element",
        tag: "VueIsland",
        attrs: [
          { kind: "static", name: "name", value: "Chart" },
          { kind: "static", name: "trigger", value: "visible" },
        ],
        events: [],
        children: [],
      }],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      vueIslands: { Chart: "/__resux/vue-islands/chart.mjs" },
    });

    expect(result.html).toContain('data-rx-vue-island="Chart"');
    expect(result.html).toContain('data-rx-vue-trigger="visible"');
    expect(getClientRuntimeBootPlan(result).mode).toBe("interaction");
  });

  it("defers default-visible client enhancements instead of eagerly booting", () => {
    const result = createResult(
      '<section data-resux-enhancement="chart" data-resux-trigger="visible"></section>',
    );

    expect(getClientRuntimeBootPlan(result)).toEqual({
      mode: "interaction",
      eventNames: [],
      deferEnhancements: true,
      deferVueIslands: false,
    });

    const document = renderDocument(result);
    expect(document).not.toContain('src="/__resux/runtime-client.mjs"');
    expect(document).toContain("const __rxDeferEnhancements=true");
  });

  it("keeps immediate enhancements eager", () => {
    const result = createResult(
      '<section data-resux-enhancement="editor" data-resux-trigger="immediate"></section>',
    );

    expect(getClientRuntimeBootPlan(result).mode).toBe("eager");
    expect(renderDocument(result)).toContain('src="/__resux/runtime-client.mjs"');
  });

  it("defers explicitly scheduled Vue islands but preserves immediate compatibility", () => {
    const visible = createResult(
      '<div data-rx-vue-island="Chart" data-rx-vue-trigger="visible" data-rx-vue-props="{}"></div>',
    );
    expect(getClientRuntimeBootPlan(visible)).toEqual({
      mode: "interaction",
      eventNames: [],
      deferEnhancements: false,
      deferVueIslands: true,
    });

    const immediate = createResult(
      '<div data-rx-vue-island="Editor" data-rx-vue-trigger="immediate" data-rx-vue-props="{}"></div>',
    );
    expect(getClientRuntimeBootPlan(immediate).mode).toBe("eager");
  });

  it("supports visible, interaction, idle, page-load, and manual deferred triggers in the bootstrap", () => {
    const source = getResumeBootstrapSource({
      eventNames: [],
      deferEnhancements: true,
      deferVueIslands: true,
    });

    expect(source).toContain('document.querySelectorAll("[data-resux-enhancement], [use-client-enhancement]")');
    expect(source).toContain('document.querySelectorAll("[data-rx-vue-island]")');
    expect(source).toContain('trigger==="visible"');
    expect(source).toContain('trigger==="interaction"');
    expect(source).toContain('trigger==="idle"');
    expect(source).toContain('trigger==="page-load"');
    expect(source).toContain('trigger==="manual"');
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("requestIdleCallback");
  });

  it("does not let manual work accidentally pull the full runtime into initial load", () => {
    const result = createResult(
      '<section data-resux-enhancement="map" data-resux-trigger="manual"></section>',
    );

    const document = renderDocument(result);
    expect(getClientRuntimeBootPlan(result).mode).toBe("interaction");
    expect(document).not.toContain('src="/__resux/runtime-client.mjs"');
  });
});
