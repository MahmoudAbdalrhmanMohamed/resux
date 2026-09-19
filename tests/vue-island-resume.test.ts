import { describe, expect, it } from "vitest";
import {
  getClientRuntimeSource,
  renderApp,
  type ComponentDefinition,
  type RouteContext,
} from "../src/runtime/index.js";

function createPage(resume?: string): ComponentDefinition {
  return {
    id: "page",
    name: "Page",
    file: "/pages/index.vue",
    handlers: [],
    script: () => ({}),
    template: [{
      type: "element",
      tag: "VueIsland",
      attrs: [
        { kind: "static", name: "name", value: "CounterIsland" },
        ...(resume ? [{ kind: "static" as const, name: "resume", value: resume }] : []),
      ],
      events: [],
      children: [],
    }],
  };
}

const route = {
  path: "/",
  params: {},
  query: {},
} as RouteContext;

describe("VueIsland resume policies", () => {
  it("renders visible-resume metadata into server HTML", async () => {
    const result = await renderApp({
      page: createPage("visible"),
      route,
      vueIslands: { CounterIsland: "/__resux/vue-islands/CounterIsland.mjs" },
    });

    expect(result.html).toContain('data-rx-vue-island="CounterIsland"');
    expect(result.html).toContain('data-rx-vue-resume="visible"');
  });

  it("keeps immediate activation as the backwards-compatible default", async () => {
    const result = await renderApp({
      page: createPage(),
      route,
      vueIslands: { CounterIsland: "/__resux/vue-islands/CounterIsland.mjs" },
    });

    expect(result.html).toContain('data-rx-vue-resume="immediate"');
  });

  it("rejects unsupported resume modes at render time", async () => {
    await expect(renderApp({
      page: createPage("whenever"),
      route,
      vueIslands: { CounterIsland: "/__resux/vue-islands/CounterIsland.mjs" },
    })).rejects.toThrow("resume must be one of immediate, interaction, visible, idle, or never");
  });

  it("generates client scheduling for visible, idle, interaction, and never islands", () => {
    const runtime = getClientRuntimeSource();

    expect(runtime).toContain('mode === "visible"');
    expect(runtime).toContain('mode === "idle"');
    expect(runtime).toContain('mode === "never"');
    expect(runtime).toContain('const events = ["pointerdown", "keydown", "focusin"]');
    expect(runtime).toContain("new IntersectionObserver");
    expect(runtime).toContain("requestIdleCallback");
    expect(runtime).toContain("scheduledVueIslands");
  });
});
