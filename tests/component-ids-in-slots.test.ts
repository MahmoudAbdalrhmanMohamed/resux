import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";

// Regression: a component used inside a v-for / v-if that sits in the slot content of another
// component was missing from payload.componentIds. After any client re-render of that block the
// component rendered as an empty literal tag.

const pill = defineComponent({
  id: "m1", name: "Pill", file: "Pill.vue", handlers: [],
  template: [{ type: "element", tag: "span", attrs: [], events: [], children: [{ type: "text", value: "p" }] }],
  async script() { return {}; },
});
const panel = defineComponent({
  id: "m2", name: "Panel", file: "Panel.vue", handlers: [],
  template: [{ type: "element", tag: "section", attrs: [], events: [], children: [{ type: "element", tag: "slot", attrs: [], events: [], children: [] }] }],
  async script() { return {}; },
});

const pillInFor = { type: "element", tag: "Pill", attrs: [], events: [], children: [], for: { source: "items", value: "p", blockId: "b0" } } as TemplateNode;
const slotted: TemplateNode[] = [{
  type: "element", tag: "Panel", attrs: [], events: [], children: [],
  slots: { default: { children: [pillInFor] } }, slotsId: "b1", slotLocals: [],
} as TemplateNode];

describe("componentIds for components in slot content", () => {
  it("maps a component inside a block in another component's slot", async () => {
    const page = defineComponent({
      id: "p1", name: "Page", file: "Page.vue", handlers: [], template: slotted,
      async script() { return { items: [1, 2] }; },
    });
    const result = await renderAppAsync({
      page, components: { Pill: pill, Panel: panel },
      modules: { m1: "/m1.mjs", m2: "/m2.mjs", p1: "/p1.mjs" },
      route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
    });
    expect(result.payload.componentIds).toEqual({ Pill: "m1" });
  });
});
