import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Client-created components render the default slot like the server renderer: all children of the
// component tag are one slot, rendered in the parent's scope and locals.

const setup = `
  const child = createClientComponent({
    id: "m1", name: "Card", handlers: ["inc"],
    template: [{ type: "element", tag: "div", attrs: [{ kind: "static", name: "class", value: "card" }], events: [], children: [
      { type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }], events: [{ name: "click", handler: "inc" }],
        children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }] },
      { type: "element", tag: "slot", attrs: [], events: [], children: [{ type: "text", value: "fallback" }] }
    ] }],
    async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc }; }
  });
  globalThis.importComponent = async () => child;
  globalThis.__RESUX__ = { route: { path: "/" }, scopes: {}, modules: { m1: "/m1.mjs" }, componentIds: { Card: "m1" } };
  document.body.innerHTML = '<div id="host"><span data-rx-block="s0:b0" style="display: contents;"></span></div>';
  const withSlot = { type: "element", tag: "Card", attrs: [], events: [], if: { expression: "show", blockId: "b0" }, children: [
    { type: "element", tag: "p", attrs: [{ kind: "static", name: "class", value: "slot" }], events: [], children: [{ type: "interpolation", expression: "label", bindingId: "b7" }] }
  ] };
  const noSlot = { ...withSlot, children: [] };
  const render = (node, scope) => { const h = renderNode(node, scope, {}, "", "s0", "p1"); return h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")); };
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const patch = async (node, scope) => { applyPatches("s0", [{ type: "block", id: "b0", value: render(node, scope) }]); await settle(); };
`;

describe("client runtime: default slot of client-created components", () => {
  it("renders the slot content in the child, evaluated in the parent scope", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(withSlot, { show: true, label: "hello" });
      const slot = document.querySelector(".card p.slot");
      t("slot content rendered inside the child", !!slot && slot.textContent === "hello", document.body.innerHTML);
      t("no literal slot tag", !document.querySelector("slot"), document.body.innerHTML);
      t("fallback is not rendered when slot content exists (server parity)", !document.body.textContent.includes("fallback"), document.body.textContent);
      t("slot text binding belongs to the parent scope", document.querySelector("[data-rx-text='s0:b7']") !== null, document.body.innerHTML);
    `);
    expectAllPass(results);
  });

  it("updates slot text through the parent scope patches", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(withSlot, { show: true, label: "hello" });
      applyPatches("s0", [{ type: "text", id: "b7", value: "bye" }]);
      t("parent text patch reaches slot content", document.querySelector("p.slot").textContent === "bye", document.body.innerHTML);
    `);
    expectAllPass(results);
  });

  it("renders nothing for a child without slot content (server parity)", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(noSlot, { show: true, label: "x" });
      t("child rendered", !!document.querySelector(".card"), document.body.innerHTML);
      t("no slot output", !document.querySelector("slot") && !document.body.textContent.includes("fallback"), document.body.innerHTML);
    `);
    expectAllPass(results);
  });

  it("keeps child state when the slot is unchanged and recreates it when the slot changed", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(withSlot, { show: true, label: "a" });
      await handleDelegatedEvent("click", { target: document.querySelector("button.bb"), preventDefault() {}, stopPropagation() {} });
      t("clicked", document.querySelector("button.bb").textContent.trim() === "1", document.body.innerHTML);
      await patch(withSlot, { show: true, label: "a" });
      t("state kept for same slot", document.querySelector("button.bb").textContent.trim() === "1", document.body.innerHTML);
      await patch(withSlot, { show: true, label: "b" });
      t("fresh child with new slot content", document.querySelector("button.bb").textContent.trim() === "0" && document.querySelector("p.slot").textContent === "b", document.body.innerHTML);
    `);
    expectAllPass(results);
  });

  it("releases slot bookkeeping with the child", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(withSlot, { show: true, label: "a" });
      await patch(withSlot, { show: false, label: "a" });
      t("scopes released", Object.keys(globalThis.__RESUX__.scopes).length === 0, Object.keys(globalThis.__RESUX__.scopes).join());
    `);
    expectAllPass(results);
  });
});
