import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { compileVueSource } from "resuxjs/compiler";

// DOM events written on a component tag (<Child @click="go" />) fall through to the child's root element
// and call the parent's handler, like Vue does for listeners the child does not declare as emits.

function makeChild(template: TemplateNode[]) {
  return defineComponent({ id: "m1", name: "Child", file: "Child.vue", handlers: [], template, async script() { return {}; } });
}

async function render(child: ReturnType<typeof makeChild>, events: unknown[]) {
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: ["go"],
    template: [{ type: "element", tag: "Child", attrs: [], events: events as never[], children: [] }],
    async script() { return { go() {} }; },
  });
  return renderAppAsync({
    page, components: { Child: child },
    modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
}

const button: TemplateNode[] = [{ type: "element", tag: "button", attrs: [], events: [], children: [{ type: "text", value: "hi" }] }];

describe("server: native events on a component tag", () => {
  it("adds the parent's handler to the child's root element", async () => {
    const result = await render(makeChild(button), [{ name: "click", handler: "go", native: true, modifiers: ["prevent"] }]);
    expect(result.html).toContain('<button data-rx-on-click="s0:p1:go" data-rx-mod-click="prevent">hi</button>');
  });

  it("ignores component events that are not DOM events", async () => {
    const result = await render(makeChild(button), [{ name: "save", handler: "go" }]);
    expect(result.html).toContain("<button>hi</button>");
  });

  it("skips a root that already handles the same event, and fragments", async () => {
    const own: TemplateNode[] = [{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "inc" }], children: [] }];
    const result = await render(makeChild(own), [{ name: "click", handler: "go", native: true }]);
    expect(result.html).not.toContain("s0:p1:go");
    const fragment: TemplateNode[] = [...button, ...button];
    const second = await render(makeChild(fragment), [{ name: "click", handler: "go", native: true }]);
    expect(second.html).not.toContain("s0:p1:go");
  });
});

describe("compiler: native events on a component tag", () => {
  it("marks DOM event names on component tags only", () => {
    const result = compileVueSource(
      `<script setup lang="ts">\nfunction go() {}\n</script>\n<template><div><Card @click="go" @save="go" /><button @click="go">x</button></div></template>`,
      { file: "P.vue", id: "m0", name: "P" },
    );
    const div = (result.template as any[])[0];
    const card = div.children.find((node: any) => node.tag === "Card");
    const native = div.children.find((node: any) => node.tag === "button");
    expect(card.events.find((event: any) => event.name === "click").native).toBe(true);
    expect(card.events.find((event: any) => event.name === "save").native).toBeUndefined();
    expect(native.events[0].native).toBeUndefined();
  });
});
