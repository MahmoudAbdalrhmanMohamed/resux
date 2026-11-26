import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// <component :is="Name">: registered or auto-discovered component names only. The compiler turns a dynamic
// :is into a block, the server resolves the name, and the client re-renders the block with the new component.

const badgeTemplate: TemplateNode[] = [{
  type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
  events: [{ name: "click", handler: "inc" }],
  children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" }, { type: "interpolation", expression: "label", bindingId: "b1" }],
}];

function component(id: string, name: string) {
  return defineComponent({
    id, name, file: `${name}.vue`, handlers: ["inc"], template: badgeTemplate,
    async script(ctx) {
      const n = ctx.ref(0);
      function inc() { n.value++; }
      return { n, inc, label: ctx.props.label ?? name };
    },
  });
}

async function render(which: unknown, extraAttrs: unknown[] = []) {
  const template: TemplateNode[] = [{
    type: "element", tag: "component", events: [], children: [],
    if: { expression: "true", blockId: "b0" },
    attrs: [{ kind: "dynamic", name: "is", value: "which.value", bindingId: "b9" }, { kind: "static", name: "label", value: "L" }, ...(extraAttrs as never[])],
  }];
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: [], template,
    async script(ctx) { return { which: ctx.ref(which) }; },
  });
  return renderAppAsync({
    page, components: { Alpha: component("m1", "Alpha"), Beta: component("m2", "Beta") },
    modules: { m1: "/m1.mjs", m2: "/m2.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
}

describe("compiler: component :is", () => {
  it("turns a dynamic :is into a block and keeps a static is= as a plain node", () => {
    const dynamic = compileVueSource(
      `<script setup lang="ts">\nconst which = useState("which", () => "Alpha")\n</script>\n<template><div><component :is="which.value" /></div></template>`,
      { file: "P.vue", id: "m0", name: "P" },
    );
    const node = (dynamic.template as any)[0].children[0];
    expect(node.tag).toBe("component");
    expect(node.if?.blockId).toBeTruthy();
    const fixed = compileVueSource(
      `<script setup lang="ts">\nconst x = useState("x", () => 0)\n</script>\n<template><div><component is="Alpha" /></div></template>`,
      { file: "P.vue", id: "m0", name: "P" },
    );
    expect((fixed.template as any)[0].children[0].if).toBeUndefined();
  });
});

describe("server: component :is", () => {
  it("renders the named component with the remaining attrs as props", async () => {
    const result = await render("Beta");
    expect(result.html).toContain('data-rx-block="s0:b0"');
    expect(result.html.replace(/<[^>]*>/g, "")).toContain("0:L");
    expect(result.html).toContain('class="bb"');
    expect(result.payload.componentIds).toEqual({ Alpha: "m1", Beta: "m2" });
  });

  it("fails with a clear error for an unknown name", async () => {
    await expect(render("Nope")).rejects.toThrow(/Unknown component <Nope> in <component :is>/);
  });

  it("rejects non-string values (component objects are not supported)", async () => {
    await expect(render({ render() {} })).rejects.toThrow(/name of a registered component as a string/);
  });
});

describe("client runtime: component :is", () => {
  const setup = `
    const mk = (id, name) => createClientComponent({
      id, name, handlers: ["inc"],
      template: [{ type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
        events: [{ name: "click", handler: "inc" }], children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" + name }] }],
      async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc }; }
    });
    const defs = { m1: mk("m1", "Alpha"), m2: mk("m2", "Beta") };
    globalThis.importComponent = async (id) => defs[id];
    globalThis.__RESUX__ = { route: { path: "/" }, scopes: {}, modules: { m1: "/m1.mjs", m2: "/m2.mjs" }, componentIds: { Alpha: "m1", Beta: "m2" } };
    document.body.innerHTML = '<div id="host"><span data-rx-block="s0:b0" style="display: contents;"></span></div>';
    const node = { type: "element", tag: "component", events: [], children: [], if: { expression: "true", blockId: "b0" },
      attrs: [{ kind: "dynamic", name: "is", value: "which", bindingId: "b9" }] };
    const render = (which) => { const h = renderNode(node, { which }, {}, "", "s0", "p1"); return h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")); };
    const settle = () => new Promise((r) => setTimeout(r, 30));
    const patch = async (which) => { applyPatches("s0", [{ type: "block", id: "b0", value: render(which) }]); await settle(); };
    const text = () => document.querySelector("button.bb") ? document.querySelector("button.bb").textContent.trim() : "";
    const click = async () => { await handleDelegatedEvent("click", { target: document.querySelector("button.bb"), preventDefault() {}, stopPropagation() {} }); };
  `;

  it("renders the named component, keeps its state on same-name updates and swaps on a new name", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch("Alpha");
      t("alpha rendered", text() === "0:Alpha", document.body.innerHTML);
      await click();
      t("alpha interactive", text() === "1:Alpha", document.body.innerHTML);
      await patch("Alpha");
      t("same name keeps state", text() === "1:Alpha", document.body.innerHTML);
      await patch("Beta");
      t("new name swaps component", text() === "0:Beta", document.body.innerHTML);
      t("old scope released", Object.keys(globalThis.__RESUX__.scopes).length === 1, Object.keys(globalThis.__RESUX__.scopes).join());
      t("no literal component tag", !document.querySelector("component"), document.body.innerHTML);
    `);
    expectAllPass(results);
  });

  it("renders a comment for an unknown name instead of a literal tag", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch("Nope");
      t("no literal tag, no child", !document.querySelector("component") && !document.querySelector("button.bb"), document.body.innerHTML);
    `);
    expectAllPass(results);
  });
});
