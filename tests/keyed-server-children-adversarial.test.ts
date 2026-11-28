import { describe, it } from "vitest";

// Edge cases for keyed server-rendered children inside v-for / v-if blocks (see keyed-server-children-in-blocks.test.ts):
// duplicate keys, key type changes, empty then refilled lists, slot content, nested blocks and component boundaries.
// Each one must keep working without errors; children that cannot be adopted are created again, as before.
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

const btn = (extra: TemplateNode[] = []): TemplateNode[] => [{
  type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
  events: [{ name: "click", handler: "inc" }],
  children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" }, { type: "interpolation", expression: "label", bindingId: "b1" }, ...extra],
}];
const item = () => defineComponent({ id: "m1", name: "Item", file: "Item.vue", handlers: ["inc"], template: btn(),
  async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: String((ctx.props as any).label) }; } });
const slotItem = () => defineComponent({ id: "m1", name: "Item", file: "Item.vue", handlers: ["inc"], template: btn([{ type: "element", tag: "slot", attrs: [], events: [], children: [] } as any]),
  async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: String((ctx.props as any).label) }; } });
const itemNode = (extraAttrs: any[] = [], children: any[] = [], extra: any = {}) => ({
  type: "element", tag: "Item", events: [], children,
  attrs: [{ kind: "dynamic", name: "key", value: "r" }, { kind: "dynamic", name: "label", value: "r" }, ...extraAttrs], ...extra });
const forOf = (src = "items.value", blockId = "b0") => ({ source: src, value: "r", blockId });

const CLIENT_ITEM = `createClientComponent({ id: "m1", name: "Item", handlers: ["inc"],
  template: [{ type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }], events: [{ name: "click", handler: "inc" }],
    children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" }, { type: "interpolation", expression: "label", bindingId: "b1" }] }],
  async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: String(ctx.props.label) }; } })`;

async function server(pageTemplate: TemplateNode[], components: any, init: unknown) {
  const page = defineComponent({ id: "p1", name: "Page", file: "Page.vue", handlers: [], template: pageTemplate,
    async script(ctx) { return { items: ctx.ref(init), show: ctx.ref(true) }; } });
  return renderAppAsync({ page, components, modules: { m1: "/m1.mjs", m2: "/m2.mjs", p1: "/p1.mjs" }, route: { path: "/", params: {}, query: {}, fullPath: "/" } as never });
}
const enc = (s: string) => encodeURIComponent(s);
function prelude(r: any, node: string, clientComps = `{ m1: ${CLIENT_ITEM} }`) {
  return `
    const comps = ${clientComps};
    globalThis.importComponent = async (id) => comps[id];
    globalThis.__RESUX__ = JSON.parse(decodeURIComponent("${enc(JSON.stringify(r.payload))}"));
    document.body.innerHTML = decodeURIComponent("${enc('<div id="host">' + r.html + '</div>')}");
    const node = ${node};
    const settle = () => new Promise((r) => setTimeout(r, 40));
    const texts = () => Array.from(document.querySelectorAll("button.bb")).map((b) => b.textContent.trim()).join(",");
    const click = async (i) => { await handleDelegatedEvent("click", { target: document.querySelectorAll("button.bb")[i], preventDefault() {}, stopPropagation() {} }); await settle(); };
    const blockHtml = (n, scope, locals, sid, mod) => { const h = renderNode(n, scope, locals || {}, "", sid || "s0", mod || "p1"); return h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")); };
    const patch = async (items, extra) => { applyPatches("s0", [{ type: "block", id: "b0", value: blockHtml(extra || node, { items: { value: items }, show: { value: true } }) }]); await settle(); };
  `;
}
const nodeStr = (n: unknown) => JSON.stringify(n);

describe("adversarial keyed adoption", () => {
  it("duplicate keys do not crash or lose items", async () => {
    const r = await server([itemNode() as any].map((n) => ({ ...n, for: forOf() })), { Item: item() }, ["a", "a", "b"]);
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr({ ...itemNode(), for: forOf() }))}
      await click(0); await click(2);
      await patch(["a", "a", "b"]);
      t("three items remain", document.querySelectorAll("button.bb").length === 3, texts());
      t("b keeps state", texts().endsWith("1:b"), texts());
      t("no marker left", !document.body.innerHTML.includes("rx-c"), "");
    `));
  });
  it("number key vs string key stay the same identity", async () => {
    const r = await server([{ ...itemNode(), attrs: [{ kind: "dynamic", name: "key", value: "r.k" }, { kind: "dynamic", name: "label", value: "r.l" }], for: forOf() } as any], { Item: item() }, [{ k: 1, l: "x" }, { k: 2, l: "y" }]);
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr({ ...itemNode(), attrs: [{ kind: "dynamic", name: "key", value: "r.k" }, { kind: "dynamic", name: "label", value: "r.l" }], for: forOf() }))}
      await click(1);
      await patch([{ k: "1", l: "x" }, { k: "2", l: "y" }]);
      t("string keys match number keys", texts() === "0:x,1:y", texts());
    `));
  });
  it("remove everything then re-insert", async () => {
    const r = await server([{ ...itemNode(), for: forOf() } as any], { Item: item() }, ["a", "b"]);
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr({ ...itemNode(), for: forOf() }))}
      await click(0);
      await patch([]);
      t("empty", texts() === "", texts());
      await patch(["a", "b"]);
      t("fresh after re-insert", texts() === "0:a,0:b", texts());
      t("scopes released", Object.keys(globalThis.__RESUX__.scopes).filter((k) => globalThis.__RESUX__.scopes[k].moduleId === "m1").length === 2, Object.keys(globalThis.__RESUX__.scopes).join());
    `));
  });
  it("keyed child with slot content is created fresh, no crash", async () => {
    const mk = () => ({ ...itemNode([], [{ type: "text", value: "S" }]), for: forOf() } as any);
    const r = await server([mk()], { Item: slotItem() }, ["a", "b"]);
    const cs = `{ m1: createClientComponent({ id: "m1", name: "Item", handlers: ["inc"], template: [{ type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }], events: [{ name: "click", handler: "inc" }], children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" }, { type: "interpolation", expression: "label", bindingId: "b1" }, { type: "element", tag: "slot", attrs: [], events: [], children: [] }] }], async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: String(ctx.props.label) }; } }) }`;
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr(mk()), cs)}
      await click(0);
      await patch(["a", "b"]);
      t("two buttons", document.querySelectorAll("button.bb").length === 2, texts());
      t("slot rendered", texts().includes("S"), texts());
      t("no marker left", !document.body.innerHTML.includes("rx-c"), document.body.innerHTML);
    `));
  });
  it("v-for inside a v-if element: patching inner keeps, patching outer recreates without errors", async () => {
    const tpl = { type: "element", tag: "div", attrs: [], events: [], if: { expression: "show.value", blockId: "b9" },
      children: [{ ...itemNode(), for: forOf("items.value", "b0") }] } as any;
    const r = await server([tpl], { Item: item() }, ["a", "b"]);
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr(tpl))}
      await click(1);
      applyPatches("s0", [{ type: "block", id: "b0", value: blockHtml({ ...node.children[0], for: node.children[0].for }, { items: { value: ["a", "b"] } }) }]);
      await settle();
      t("inner patch keeps state", texts() === "0:a,1:b", texts());
      applyPatches("s0", [{ type: "block", id: "b9", value: blockHtml(node, { items: { value: ["a", "b"] }, show: { value: true } }, {}, "s0", "p1").replace(/^<div>/, "") }]);
      await settle();
      t("outer patch still renders two buttons", document.querySelectorAll("button.bb").length === 2, texts());
    `));
  });
  it("component boundary: keyed list inside a wrapper component", async () => {
    const wrapper = defineComponent({ id: "m2", name: "Wrapper", file: "W.vue", handlers: [], template: [{ ...itemNode(), for: forOf("items.value", "b0") } as any],
      async script(ctx) { return { items: ctx.ref(["a", "b"]) }; } });
    const page = [{ type: "element", tag: "Wrapper", attrs: [], events: [], children: [] } as any];
    const r = await server(page, { Item: item(), Wrapper: wrapper }, []);
    const cs = `{ m1: ${CLIENT_ITEM}, m2: createClientComponent({ id: "m2", name: "Wrapper", handlers: [], template: [], async script(ctx) { return {}; } }) }`;
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr({ ...itemNode(), for: forOf() }), cs)}
      const wid = Object.keys(globalThis.__RESUX__.scopes).find((k) => globalThis.__RESUX__.scopes[k].moduleId === "m2");
      t("wrapper scope found", !!wid, Object.keys(globalThis.__RESUX__.scopes).join());
      await click(1);
      applyPatches(wid, [{ type: "block", id: "b0", value: blockHtml(node, { items: { value: ["a", "b"] } }, {}, wid, "m2") }]);
      await settle();
      t("state kept inside wrapper block", texts() === "0:a,1:b", texts());
      applyPatches(wid, [{ type: "block", id: "b0", value: blockHtml(node, { items: { value: ["b", "a", "c"] } }, {}, wid, "m2") }]);
      await settle();
      t("reorder + insert", texts() === "1:b,0:a,0:c", texts());
    `));
  });
  it("nested keyed lists: item component has its own keyed list", async () => {
    const inner = defineComponent({ id: "m1", name: "Item", file: "Item.vue", handlers: ["inc"], template: [{ type: "element", tag: "section", attrs: [], events: [], children: [
      { ...itemNode(), tag: "Leaf", for: forOf("kids.value", "b0") } as any] }],
      async script(ctx) { return { kids: ctx.ref(["x", "y"]), label: "" }; } });
    const leaf = defineComponent({ id: "m2", name: "Leaf", file: "Leaf.vue", handlers: ["inc"], template: btn(),
      async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: String((ctx.props as any).label) }; } });
    const r = await server([{ ...itemNode(), for: forOf() } as any], { Item: inner, Leaf: leaf }, ["a", "b"]);
    const html = r.html;
    expectAllPass(await runClientEngineProbe(`${prelude(r, nodeStr({ ...itemNode(), for: forOf() }), `{ m1: createClientComponent({ id: "m1", name: "Item", handlers: [], template: [{ type: "element", tag: "section", attrs: [], events: [], children: [] }], async script() { return {}; } }), m2: ${CLIENT_ITEM.replace('id: "m1"', 'id: "m2"')} }`)}
      t("nested markers exist", (document.body.innerHTML.match(/rx-c:/g) || []).length === 6, document.body.innerHTML);
      await click(3);
      const before = texts();
      await patch(["a", "b"]);
      t("outer patch did not throw and kept structure", document.querySelectorAll("section").length === 2, document.body.innerHTML);
      t("no error comment", !document.body.innerHTML.includes("resux-child-error"), document.body.innerHTML);
    `));
  });
});
