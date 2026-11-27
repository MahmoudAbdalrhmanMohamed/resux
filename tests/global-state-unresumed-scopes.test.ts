import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression: a global state change refreshed only scopes that had already been resumed. A layout that
// only reads the key (no handler ever ran in it) kept its stale text, although the docs promise that
// every rendered scope reading the key is refreshed. Also covers client navigation: the new page is
// server-rendered with the server's default value and must pick up the client's current value.

const setup = `
  const reader = createClientComponent({
    id: "m1", name: "Reader", handlers: [],
    template: [{ type: "element", tag: "span", attrs: [{ kind: "static", name: "id", value: "n" }], events: [],
      children: [{ type: "interpolation", expression: "cart.value.length", bindingId: "b0" }] }],
    async script(ctx) { const cart = ctx.useGlobalState("cart", () => []); return { cart }; }
  });
  globalThis.importComponent = async () => reader;
  globalThis.__RESUX__ = { route: { path: "/" }, scopes: { s1: { id: "s1", moduleId: "m1", props: {}, state: {}, globalStateKeys: ["cart"], asyncData: {} } },
    modules: { m1: "/m1.mjs" }, globalState: { cart: [] } };
  document.body.innerHTML = '<span id="n"><span data-rx-text="s1:b0">0</span></span>';
  const settle = () => new Promise((r) => setTimeout(r, 60));
  const shown = () => document.querySelector("#n").textContent;
`;

describe("client runtime: global state and scopes that never ran a handler", () => {
  it("refreshes a scope that only reads the key", async () => {
    const results = await runClientEngineProbe(`${setup}
      const cart = useClientGlobalState("cart", () => []);
      cart.value = [1, 2];
      await settle();
      t("reader updated", shown() === "2", shown());
      cart.value = [1, 2, 3];
      await settle();
      t("second change applied", shown() === "3", shown());
    `);
    expectAllPass(results);
  });

  it("does nothing for scopes that do not read the changed key", async () => {
    const results = await runClientEngineProbe(`${setup}
      globalThis.__RESUX__.scopes.s1.globalStateKeys = ["other"];
      const cart = useClientGlobalState("cart", () => []);
      cart.value = [1];
      await settle();
      t("unrelated scope untouched", shown() === "0", shown());
    `);
    expectAllPass(results);
  });
});
