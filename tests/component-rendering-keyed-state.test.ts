import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Client-created components inside v-for keep their state across block re-renders.
// A block patch re-renders the whole block, so without reconciliation every child restarts at zero.

const setup = `
  const child = createClientComponent({
    id: "m1", name: "Badge", handlers: ["inc"],
    template: [{ type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
      events: [{ name: "click", handler: "inc" }],
      children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" }, { type: "interpolation", expression: "label", bindingId: "b1" }] }],
    async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: ctx.props.label }; }
  });
  globalThis.importComponent = async () => child;
  globalThis.__RESUX__ = { route: { path: "/" }, scopes: {}, modules: { m1: "/m1.mjs" }, componentIds: { Badge: "m1" } };
  document.body.innerHTML = '<div id="host"><span data-rx-block="s0:b0" style="display: contents;"></span></div>';
  const keyed = { type: "element", tag: "Badge", events: [], children: [], for: { source: "items", value: "item", blockId: "b0" },
    attrs: [{ kind: "dynamic", name: "key", value: "item" }, { kind: "dynamic", name: "label", value: "item" }] };
  const unkeyed = { ...keyed, attrs: [{ kind: "dynamic", name: "label", value: "item" }] };
  const render = (node, items) => { const h = renderNode(node, { items }, {}, "", "s0", "p1"); return h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")); };
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const patch = async (node, items) => { applyPatches("s0", [{ type: "block", id: "b0", value: render(node, items) }]); await settle(); };
  const texts = () => Array.from(document.querySelectorAll("button.bb")).map((b) => b.textContent.trim()).join(",");
  const click = async (i) => { await handleDelegatedEvent("click", { target: document.querySelectorAll("button.bb")[i], preventDefault() {}, stopPropagation() {} }); };
`;

describe("client runtime: keyed v-for component state", () => {
  it("keeps state when an unrelated update re-renders the block", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(keyed, ["a", "b"]);
      await click(1);
      t("second child incremented", texts() === "0:a,1:b", texts());
      const before = document.querySelectorAll("button.bb")[1];
      await patch(keyed, ["a", "b"]);
      t("state preserved", texts() === "0:a,1:b", texts());
      t("same DOM node reused", document.querySelectorAll("button.bb")[1] === before, "node replaced");
      t("no scope leak", Object.keys(globalThis.__RESUX__.scopes).length === 2, Object.keys(globalThis.__RESUX__.scopes).join());
    `);
    expectAllPass(results);
  });

  it("moves state with the key when the list is reordered", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(keyed, ["a", "b"]);
      await click(1);
      await patch(keyed, ["b", "a"]);
      t("state follows key", texts() === "1:b,0:a", texts());
    `);
    expectAllPass(results);
  });

  it("creates new items fresh and releases removed ones", async () => {
    const results = await runClientEngineProbe(`${setup}
      await patch(keyed, ["a", "b"]);
      await click(0);
      await patch(keyed, ["a", "c"]);
      t("kept a, fresh c", texts() === "1:a,0:c", texts());
      t("b scope released", Object.keys(globalThis.__RESUX__.scopes).length === 2, Object.keys(globalThis.__RESUX__.scopes).join());
    `);
    expectAllPass(results);
  });

  it("matches unkeyed children by position and warns in dev", async () => {
    const results = await runClientEngineProbe(`${setup}
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (message) => warnings.push(String(message));
      globalThis.isClientDevMode = () => true;
      await patch(unkeyed, ["a", "b"]);
      await click(0);
      await patch(unkeyed, ["a", "b"]);
      console.warn = originalWarn;
      t("state kept by position", texts() === "1:a,0:b", texts());
      t("dev warning for missing key", warnings.some((m) => m.includes("no :key")), warnings.join("|"));
    `);
    expectAllPass(results);
  });

  it("updates a child in place when its props change, keeping its state", async () => {
    const results = await runClientEngineProbe(`${setup}
      const node = { ...keyed, attrs: [{ kind: "dynamic", name: "key", value: "item.id" }, { kind: "dynamic", name: "label", value: "item.label" }] };
      await patch(node, [{ id: 1, label: "x" }]);
      await click(0);
      const before = document.querySelectorAll("button.bb")[0];
      await patch(node, [{ id: 1, label: "y" }]);
      t("state kept", texts().startsWith("1:"), texts());
      t("same DOM node reused", document.querySelectorAll("button.bb")[0] === before, "node replaced");
      // The probe component copies label into its own scope at setup, which is the documented limit.
      t("copied prop keeps the setup value", texts() === "1:x", texts());
    `);
    expectAllPass(results);
  });
});

describe("resumability and hot path guard", () => {
  it("does not touch pages without client-created children", async () => {
    const results = await runClientEngineProbe(`${setup}
      globalThis.__RESUX__.componentIds = undefined;
      document.body.innerHTML = '<span data-rx-block="s0:b0" style="display: contents;"></span>';
      applyPatches("s0", [{ type: "block", id: "b0", value: "<i>x</i>" }]);
      t("plain block still patches", document.body.innerHTML.includes("<i>x</i>"), document.body.innerHTML);
      t("no child scopes or placeholders", Object.keys(globalThis.__RESUX__.scopes).length === 0 && !document.querySelector("[data-rx-child]"), document.body.innerHTML);
    `);
    expectAllPass(results);
  });
});

