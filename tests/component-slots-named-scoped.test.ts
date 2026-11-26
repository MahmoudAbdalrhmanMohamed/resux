import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { compileVueSource } from "resuxjs/compiler";

// Named and scoped slots (Vue-style): the compiler splits the children of a component tag into slots,
// the server renders them with the slot props bound, and the payload maps each slot back to the parent.

const card = defineComponent({
  id: "m1", name: "Card", file: "Card.vue", handlers: [],
  template: [
    { type: "element", tag: "header", attrs: [], events: [], children: [
      { type: "element", tag: "slot", attrs: [{ name: "name", kind: "static", value: "header" }, { name: "title", kind: "static", value: "T1" }], events: [], children: [{ type: "text", value: "default header" }] },
    ] },
    { type: "element", tag: "main", attrs: [], events: [], children: [
      { type: "element", tag: "slot", attrs: [], events: [], children: [{ type: "text", value: "fallback body" }] },
    ] },
    { type: "element", tag: "footer", attrs: [], events: [], children: [
      { type: "element", tag: "slot", attrs: [{ name: "name", kind: "static", value: "footer" }], events: [], children: [{ type: "text", value: "fallback footer" }] },
    ] },
  ] as TemplateNode[],
  async script() { return {}; },
});

async function render(slots: Record<string, unknown> | undefined, children: TemplateNode[] = []) {
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: [],
    template: [{ type: "element", tag: "Card", attrs: [], events: [], children, ...(slots ? { slots, slotsId: "b9", slotLocals: [] } : {}) } as never],
    async script() { return {}; },
  });
  return renderAppAsync({
    page, components: { Card: card },
    modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
}

describe("server: named and scoped slots", () => {
  it("renders a scoped header slot with its props and falls back for the missing slots", async () => {
    const result = await render({
      header: { param: { kind: "pairs", pairs: [{ key: "title", local: "title" }] }, children: [{ type: "interpolation", expression: "title", bindingId: "b0" }] },
    });
    expect(result.html).toContain(">T1</span></header>");
    expect(result.html).toContain("<main>fallback body</main>");
    expect(result.html).toContain("<footer>fallback footer</footer>");
  });

  it("renders the default slot content and lists only provided slots in the child's payload", async () => {
    const result = await render({ default: { children: [{ type: "text", value: "body!" }] } });
    expect(result.html).toContain("<main>body!</main>");
    const scopes = Object.values(result.payload.scopes as Record<string, { moduleId: string; slots?: unknown }>);
    expect(scopes.find((scope) => scope.moduleId === "m1")?.slots).toEqual({ default: { ref: "s0:p1:b9" } });
    expect(scopes.find((scope) => scope.moduleId === "p1")?.slots).toBeUndefined();
  });

  it("omits the slots mapping when the tag has no slot content", async () => {
    const result = await render(undefined);
    const scopes = Object.values(result.payload.scopes as Record<string, { moduleId: string; slots?: unknown }>);
    expect(scopes.find((scope) => scope.moduleId === "m1")?.slots).toBeUndefined();
    expect(result.html).toContain("<main>fallback body</main>");
  });
});

function compile(template: string) {
  return compileVueSource(`<script setup lang="ts">\nconst x = ref(1)\n</script>\n<template>${template}</template>`, { file: "P.vue", id: "m0", name: "P" });
}

describe("compiler: slot split", () => {
  it("splits v-slot, # and default children into named slots with params", () => {
    const result = compile(`<Card><template v-slot:header="{ title }"><h1>{{ title }}</h1></template><p>body</p><template #footer>f</template></Card>`);
    const card = (result.template as any[]).find((node) => node.tag === "Card");
    expect(Object.keys(card.slots).sort()).toEqual(["default", "footer", "header"]);
    expect(card.slots.header.param).toEqual({ kind: "pairs", pairs: [{ key: "title", local: "title" }] });
    expect(card.slotsId).toBeTruthy();
    expect(card.children).toEqual([]);
  });

  it("keeps built-in tags as plain children", () => {
    const result = compile(`<ResuxLink to="/">Home</ResuxLink>`);
    const link = (result.template as any[]).find((node) => node.tag === "ResuxLink");
    expect(link.slots).toBeUndefined();
    expect(link.children.length).toBe(1);
  });

  it("rejects dynamic slot names, defaults and duplicates", () => {
    expect(() => compile(`<Card><template #[name]>x</template></Card>`)).toThrow();
    expect(() => compile(`<Card><template #a="{ t = 1 }">x</template></Card>`)).toThrow();
    expect(() => compile(`<Card><template #a>x</template><template #a>y</template></Card>`)).toThrow(/more than once/);
  });
});
