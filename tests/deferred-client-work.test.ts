import { describe, expect, it } from "vitest";
import {
  defineComponent,
  getClientRuntimeBootPlan,
  getClientRuntimeSource,
  renderApp,
  renderDocument,
  type ComponentDefinition,
} from "../src/runtime/index.js";
import { getResumeBootstrapSource } from "../src/runtime/resume.js";
import { createRuntimeResult } from "./runtime-result-fixture.js";

function createTestComponent(
  id: string,
  name: string,
  template: ComponentDefinition["template"],
): ComponentDefinition {
  return defineComponent({
    id,
    name,
    file: `${id}.vue`,
    handlers: [],
    script() {
      return {};
    },
    template,
  });
}

function createVueIslandPage(
  id: string,
  islandName: string,
  trigger: string,
  fallback: "none" | "button" | "component" = "none",
) {
  return createTestComponent(id, id, [{
      type: "element",
      tag: "VueIsland",
      attrs: [
        { kind: "static", name: "name", value: islandName },
        { kind: "static", name: "trigger", value: trigger },
      ],
      events: [],
      children: fallback === "button"
        ? [{
            type: "element",
            tag: "button",
            attrs: [],
            events: [],
            children: [{ type: "text", value: "Open menu" }],
          }]
        : fallback === "component"
          ? [{
              type: "element",
              tag: "FallbackCard",
              attrs: [],
              events: [],
              children: [],
            }]
          : [],
    }],
  );
}

async function renderVueIslandTestPage(
  page: Parameters<typeof renderApp>[0]["page"],
  islandName: string,
  components?: Parameters<typeof renderApp>[0]["components"],
) {
  return renderApp({
    page,
    route: { path: "/", params: {}, query: {} },
    ...(components ? { components } : {}),
    vueIslands: {
      [islandName]: `/__resux/vue-islands/${islandName.toLowerCase()}.mjs`,
    },
  });
}

describe("demand-driven client work", () => {
  it("renders Vue island trigger metadata without importing its client module on the server", async () => {
    const page = createVueIslandPage("page", "Chart", "visible");

    const result = await renderVueIslandTestPage(page, "Chart");

    expect(result.html).toContain('data-rx-vue-island="Chart"');
    expect(result.html).toContain('data-rx-vue-trigger="visible"');
    expect(getClientRuntimeBootPlan(result).mode).toBe("interaction");
  });

  it("renders interaction Vue islands with a reachable SSR fallback and rejects empty interaction boundaries", async () => {
    const withFallback = createVueIslandPage(
      "interaction-page",
      "Menu",
      "interaction",
      "button",
    );

    const rendered = await renderVueIslandTestPage(withFallback, "Menu");
    expect(rendered.html).toContain("<button>Open menu</button>");
    expect(rendered.html).toContain('data-rx-vue-trigger="interaction"');

    const withoutFallback = createVueIslandPage(
      "empty-interaction-page",
      "Menu",
      "interaction",
    );
    await expect(
      renderVueIslandTestPage(withoutFallback, "Menu"),
    ).rejects.toThrow("requires server-rendered fallback children");
  });

  it("renders Vue island component fallbacks through the async renderer", async () => {
    const fallbackCard = createTestComponent(
      "fallback-card",
      "FallbackCard",
      [{
        type: "element",
        tag: "strong",
        attrs: [],
        events: [],
        children: [{ type: "text", value: "Ready to interact" }],
      }],
    );
    const page = createVueIslandPage(
      "component-fallback-page",
      "Menu",
      "interaction",
      "component",
    );

    const rendered = await renderVueIslandTestPage(
      page,
      "Menu",
      { FallbackCard: fallbackCard },
    );

    expect(rendered.html).toContain("<strong>Ready to interact</strong>");
    expect(rendered.html).toContain('data-rx-vue-trigger="interaction"');
  });

  it("defers default-visible client enhancements instead of eagerly booting", () => {
    const result = createRuntimeResult(
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
    const result = createRuntimeResult(
      '<section data-resux-enhancement="editor" data-resux-trigger="immediate"></section>',
    );

    expect(getClientRuntimeBootPlan(result).mode).toBe("eager");
    expect(renderDocument(result)).toContain('src="/__resux/runtime-client.mjs"');
  });

  it("defers explicitly scheduled Vue islands but preserves immediate compatibility", () => {
    const visible = createRuntimeResult(
      '<div data-rx-vue-island="Chart" data-rx-vue-trigger="visible" data-rx-vue-props="{}"></div>',
    );
    expect(getClientRuntimeBootPlan(visible)).toEqual({
      mode: "interaction",
      eventNames: [],
      deferEnhancements: false,
      deferVueIslands: true,
    });

    const immediate = createRuntimeResult(
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
    expect(source).toContain("__rxActivateTarget(target)");
    expect(source).toContain("fire(__rxCaptureInteraction(target,event))");
    expect(source).toContain("__rxReplayInteraction(target,queuedInteraction)");
    expect(source).toContain('event.type==="click" && event.cancelable');
    expect(source).toContain("target.isConnected");
    expect(source).toContain("window.setTimeout(()=>{");
  });

  it("does not let manual work accidentally pull the full runtime into initial load", () => {
    const result = createRuntimeResult(
      '<section data-resux-enhancement="map" data-resux-trigger="manual"></section>',
    );

    const document = renderDocument(result);
    expect(getClientRuntimeBootPlan(result).mode).toBe("interaction");
    expect(document).not.toContain('src="/__resux/runtime-client.mjs"');
    expect(document).toContain("__RESUX_ACTIVATE_DEFERRED__");
  });

  it("keeps oversized event sets off the bounded inline bootstrap", () => {
    const eventAttributes = Array.from(
      { length: 33 },
      (_, index) => `data-rx-on-event${index}="s0:c0:h${index}"`,
    ).join(" ");
    const result = createRuntimeResult(`<button ${eventAttributes}>Many events</button>`);

    expect(getClientRuntimeBootPlan(result).mode).toBe("eager");
    expect(renderDocument(result)).toContain('src="/__resux/runtime-client.mjs"');
  });

  it("guards in-flight Vue island imports and exposes runtime activation for manual targets", () => {
    const runtime = getClientRuntimeSource();

    expect(runtime).toContain("const mountingVueIslands = new Map()");
    expect(runtime).toContain("token.cancelled || !el.isConnected");
    expect(runtime).toContain("token.cancelled = true");
    expect(runtime).toContain("__RESUX_ACTIVATE_DEFERRED_TARGET__");
    expect(runtime).toContain("__RESUX_ACTIVATE_DEFERRED__");
  });
});
