import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage: components inside v-if / v-for blocks. The client block renderer used to emit
// an empty literal tag (<badge></badge>) for every component, so a block update silently lost them.

const badgeTemplate: TemplateNode[] = [{
  type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
  events: [{ name: "click", handler: "inc" }],
  children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }],
}];

function badge() {
  return defineComponent({
    id: "m1", name: "Badge", file: "Badge.vue", handlers: ["inc"], template: badgeTemplate,
    async script(ctx) {
      const n = ctx.ref(0);
      function inc() { n.value++; }
      return { n, inc };
    },
  });
}

const blockWithBadge: TemplateNode[] = [{
  type: "element", tag: "div", attrs: [], events: [],
  if: { expression: "show.value", blockId: "b0" },
  children: [{ type: "element", tag: "Badge", attrs: [{ kind: "dynamic", name: "label", value: "'x'" }], events: [], children: [] }],
}];

describe("server payload for client-rendered block components", () => {
  async function render(template: TemplateNode[]) {
    const components = { Badge: badge() };
    const page = defineComponent({
      id: "p1", name: "Page", file: "Page.vue", handlers: [], template,
      async script(ctx) { return { show: ctx.ref(false) }; },
    });
    return renderAppAsync({
      page, components, modules: { m1: "/__resux/handlers/m1.mjs", p1: "/__resux/handlers/p1.mjs" },
      route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
    });
  }

  it("maps components used inside blocks to their module ids", async () => {
    const result = await render(blockWithBadge);
    expect(result.payload.componentIds).toEqual({ Badge: "m1" });
  });

  it("emits nothing for pages without components in blocks (no payload growth)", async () => {
    const result = await render([{ type: "element", tag: "Badge", attrs: [], events: [], children: [] }]);
    expect(result.payload.componentIds).toBeUndefined();
    expect(JSON.stringify(result.payload)).not.toContain("componentIds");
    const plain = await render([{ type: "element", tag: "p", attrs: [], events: [], children: [{ type: "text", value: "hi" }] }]);
    expect(plain.payload.componentIds).toBeUndefined();
  });

  it("keeps the server-rendered first paint of the block unchanged", async () => {
    const hidden = await render(blockWithBadge);
    expect(hidden.html).toContain('data-rx-block="s0:b0"');
    expect(hidden.html).not.toContain("data-rx-child");
  });
});

describe("client runtime: components inside blocks", () => {
  const setup = `
    const child = createClientComponent({
      id: "m1", name: "Badge", handlers: ["inc"],
      template: [{ type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
        events: [{ name: "click", handler: "inc" }], children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }] }],
      async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc }; }
    });
    globalThis.importComponent = async () => child;
    globalThis.__RESUX__ = { route: { path: "/" }, scopes: {}, modules: { m1: "/m1.mjs" }, componentIds: { Badge: "m1" } };
    document.body.innerHTML = '<div id="host"><span data-rx-block="s0:b0" style="display: contents;"></span></div>';
    const blockNode = { type: "element", tag: "div", attrs: [], events: [], if: { expression: "show", blockId: "b0" },
      children: [{ type: "element", tag: "Badge", attrs: [], events: [], children: [] }] };
    const render = (show) => { const h = renderNode(blockNode, { show }, {}, "", "s0", "p1"); return h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")); };
    const settle = () => new Promise((r) => setTimeout(r, 30));
  `;

  it("renders the component instead of an empty tag and keeps it interactive", async () => {
    const results = await runClientEngineProbe(`${setup}
      applyPatches("s0", [{ type: "block", id: "b0", value: render(true) }]);
      await settle();
      const html = document.body.innerHTML;
      t("no literal component tag", !/<badge/i.test(html), html);
      t("component content rendered", !!document.querySelector("button.bb"), html);
      t("no placeholder left", !document.querySelector("[data-rx-child]"), html);
      const btn = document.querySelector("button.bb");
      t("scope id is client-only", btn.getAttribute("data-rx-on-click").startsWith("c") && btn.getAttribute("data-rx-on-click").endsWith(":m1:inc"), btn.getAttribute("data-rx-on-click"));
      const id = btn.getAttribute("data-rx-on-click").split(":")[0];
      t("scope registered in payload", !!globalThis.__RESUX__.scopes[id], Object.keys(globalThis.__RESUX__.scopes).join());
      await handleDelegatedEvent("click", { target: btn, preventDefault() {}, stopPropagation() {} });
      t("click resumes the client-created scope", document.querySelector("button.bb").textContent.trim() === "1", document.body.innerHTML);
    `);
    expectAllPass(results);
  });

  it("releases the scope when the block removes the component", async () => {
    const results = await runClientEngineProbe(`${setup}
      applyPatches("s0", [{ type: "block", id: "b0", value: render(true) }]);
      await settle();
      const id = document.querySelector("button.bb").getAttribute("data-rx-on-click").split(":")[0];
      t("scope registered while mounted", !!globalThis.__RESUX__.scopes[id], id);
      applyPatches("s0", [{ type: "block", id: "b0", value: render(false) }]);
      await settle();
      t("scope removed from payload", !globalThis.__RESUX__.scopes[id], id);
    `);
    expectAllPass(results);
  });

  it("leaves blocks without registered components untouched (no extra work)", async () => {
    const results = await runClientEngineProbe(`${setup}
      globalThis.__RESUX__.componentIds = undefined;
      const html = render(true);
      t("unregistered tag keeps the old output", /<Badge/i.test(html), html);
      t("no placeholder emitted", !html.includes("data-rx-child"), html);
    `);
    expectAllPass(results);
  });
});
