import { describe, expect, it } from "vitest";
import { compileVueSource } from "../src/compiler/index.js";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Attributes written on a component tag that are not declared props fall through to the child's root element
// (Vue semantics): class and style are merged (child first, then parent), id/aria-*/data-* are set, declared props
// are consumed, defineOptions({ inheritAttrs: false }) turns it off, multi-root children drop them.

const root = (extra: Array<{ kind: "static"; name: string; value: string }> = []): TemplateNode[] => [{
  type: "element", tag: "div", events: [], children: [{ type: "text", value: "x" }],
  attrs: [{ kind: "static", name: "class", value: "c" }, { kind: "static", name: "style", value: "color: red" }, ...extra],
}];
const multi: TemplateNode[] = [
  { type: "element", tag: "div", attrs: [], events: [], children: [{ type: "text", value: "a" }] },
  { type: "element", tag: "div", attrs: [], events: [], children: [{ type: "text", value: "b" }] },
];
const child = (extra: Record<string, unknown> = {}, template: TemplateNode[] = root()) => defineComponent({
  id: "m1", name: "Child", file: "Child.vue", handlers: [], template, async script() { return {}; }, ...extra,
});
const attr = (name: string, value: string) => ({ kind: "static" as const, name, value });
const parentAttrs = [
  attr("class", "p"), attr("style", "margin: 1px"), attr("id", "i"), attr("aria-label", "a"), attr("data-x", "1"), attr("foo", "bar"),
  { kind: "dynamic" as const, name: "class", value: "{ dyn: on }" },
];

async function render(components: Record<string, any>, attrs: any[]) {
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: [], async script(ctx) { return { on: ctx.ref(true) }; },
    template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "element", tag: "Child", attrs, events: [], children: [] }] }],
  });
  const r = await renderAppAsync({
    page, components, modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
  return r.html;
}
const rootTag = (html: string) => /<main[^>]*>\s*(<[a-z0-9]+[^>]*>)/.exec(html)?.[1] ?? "";

describe("component attribute fallthrough (server)", () => {
  it("falls everything through when no props are declared, merging class and style", async () => {
    const tag = rootTag(await render({ Child: child({ declaredProps: [], inheritAttrs: true }) }, parentAttrs));
    expect(tag).toContain('class="c p dyn"');
    expect(tag).toMatch(/style="color: red;\s*margin: 1px"/);
    expect(tag).toContain('id="i"');
    expect(tag).toContain('aria-label="a"');
    expect(tag).toContain('data-x="1"');
    expect(tag).toContain('foo="bar"');
  });

  it("does not repeat declared props on the root, others still fall through", async () => {
    const tag = rootTag(await render({ Child: child({ declaredProps: ["class", "id", "foo"], inheritAttrs: true }) }, parentAttrs));
    expect(tag).toContain('class="c"');
    expect(tag).not.toContain('id="i"');
    expect(tag).not.toContain("foo=");
    expect(tag).toContain('aria-label="a"');
    expect(tag).toContain('data-x="1"');
  });

  it("inheritAttrs: false keeps the root as written", async () => {
    const tag = rootTag(await render({ Child: child({ declaredProps: [], inheritAttrs: false }) }, parentAttrs));
    expect(tag).toContain('class="c"');
    expect(tag).not.toContain("aria-label");
    expect(tag).not.toContain("foo=");
  });

  it("drops the attributes for a multi-root child", async () => {
    const html = await render({ Child: child({ declaredProps: [], inheritAttrs: true }, multi) }, parentAttrs);
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("foo=");
  });

  it("falls back to class, style, id, aria-* and data-* when the props could not be resolved", async () => {
    const tag = rootTag(await render({ Child: child({ declaredProps: null, inheritAttrs: true }) }, parentAttrs));
    expect(tag).toContain('class="c p dyn"');
    expect(tag).toContain('id="i"');
    expect(tag).toContain('data-x="1"');
    expect(tag).not.toContain("foo=");
  });

  it("keeps duplicate classes as written (like Vue)", async () => {
    const tag = rootTag(await render({ Child: child({ declaredProps: [], inheritAttrs: true }, [{
      type: "element", tag: "div", events: [], children: [], attrs: [attr("class", "c p")] }]) }, [attr("class", "p c")]));
    expect(tag).toContain('class="c p p c"');
  });

  it("a child that declares nothing and gets no attributes is unchanged", async () => {
    const tag = rootTag(await render({ Child: child({ declaredProps: [], inheritAttrs: true }) }, []));
    expect(tag).toContain('class="c"');
    expect(tag).not.toContain("id=");
  });
});

describe("component attribute fallthrough (compiler)", () => {
  const compile = (script: string) => compileVueSource(
    `<script setup lang="ts">\n${script}\n</script>\n<template><div>x</div></template>`, { file: "C.vue", id: "m1", name: "C" }).serverSource;
  const declared = (src: string) => JSON.parse(/declaredProps: (null|\[[^\]]*\])/.exec(src)![1]);

  it("reads a type literal, an interface in the file, an array and an object", () => {
    expect(declared(compile("const p = defineProps<{ a: string; 'b-c'?: number }>();"))).toEqual(["a", "b-c"]);
    expect(declared(compile("interface Props { a: string; b?: number }\nconst p = defineProps<Props>();"))).toEqual(["a", "b"]);
    expect(declared(compile("type P = { a: string } & { b: number };\nconst p = withDefaults(defineProps<P>(), {});"))).toEqual(["a", "b"]);
    expect(declared(compile("const p = defineProps(['a', 'b']);"))).toEqual(["a", "b"]);
    expect(declared(compile("const p = defineProps({ a: String, b: { type: Number } });"))).toEqual(["a", "b"]);
  });

  it("adds defineModel names", () => {
    expect(declared(compile("const m = defineModel();\nconst t = defineModel('title');"))).toEqual(["modelValue", "title"]);
  });

  it("is empty without defineProps, null for a props type it cannot read", () => {
    expect(declared(compile("const n = 1;"))).toEqual([]);
    expect(declared(compile("import type { P } from './p';\nconst p = defineProps<P>();"))).toBeNull();
    expect(declared(compile("const o = { a: String };\nconst p = defineProps(o);"))).toBeNull();
  });

  it("reads inheritAttrs: false", () => {
    expect(compile("defineOptions({ inheritAttrs: false });")).toContain("inheritAttrs: false");
    expect(compile("const n = 1;")).toContain("inheritAttrs: true");
  });
});

describe("component attribute fallthrough (client)", () => {
  const CLIENT_CHILD = `createClientComponent({ id: "m1", name: "Child", handlers: [], declaredProps: ["label"], inheritAttrs: true,
    template: [{ type: "element", tag: "div", attrs: [{ kind: "static", name: "class", value: "c" }], events: [], children: [{ type: "text", value: "x" }] }],
    async script() { return {}; } })`;
  const SERVER_NODE = { type: "element", tag: "Child", events: [], children: [], for: { source: "items.value", value: "r", blockId: "b0" },
    attrs: [{ kind: "dynamic", name: "key", value: "r" }, { kind: "static", name: "label", value: "L" }, { kind: "static", name: "class", value: "p" },
      { kind: "static", name: "aria-label", value: "a" }, { kind: "static", name: "foo", value: "bar" }] };

  it("children created on the client keep the parent's attributes and skip declared props", async () => {
    const page = defineComponent({
      id: "p1", name: "Page", file: "Page.vue", handlers: [], template: [{ type: "element", tag: "main", attrs: [], events: [], children: [SERVER_NODE as never] }],
      async script(ctx) { return { items: ctx.ref(["a"]) }; },
    });
    const r = await renderAppAsync({
      page, components: { Child: child({ declaredProps: ["label"], inheritAttrs: true }) }, modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
      route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
    });
    const enc = (s: string) => encodeURIComponent(s);
    expectAllPass(await runClientEngineProbe(`
      const comps = { m1: ${CLIENT_CHILD} };
      globalThis.importComponent = async (id) => comps[id];
      globalThis.__RESUX__ = JSON.parse(decodeURIComponent("${enc(JSON.stringify(r.payload))}"));
      document.body.innerHTML = decodeURIComponent("${enc('<div id="host">' + r.html + "</div>")}");
      const node = ${JSON.stringify(SERVER_NODE)};
      const settle = () => new Promise((res) => setTimeout(res, 40));
      const rootOf = () => Array.from(document.querySelectorAll("main > div, main div.c"));
      const h = renderNode(node, { items: { value: ["a", "b", "c"] } }, {}, "", "s0", "p1");
      applyPatches("s0", [{ type: "block", id: "b0", value: h.slice(h.indexOf(">") + 1, h.lastIndexOf("<")) }]);
      await settle();
      const divs = Array.from(document.querySelectorAll("div.c"));
      t("three children", divs.length === 3, String(divs.length));
      const last = divs[divs.length - 1];
      t("client child has parent class merged", last.getAttribute("class") === "c p", last.outerHTML);
      t("client child has aria-label", last.getAttribute("aria-label") === "a", last.outerHTML);
      t("client child has unknown attr", last.getAttribute("foo") === "bar", last.outerHTML);
      t("declared prop not on the root", !last.hasAttribute("label"), last.outerHTML);
    `));
  });
});
