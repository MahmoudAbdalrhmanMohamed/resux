import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// The server asserts that useState values and event locals are JSON
// serializable. The client runtime skipped those checks, so a function or
// bigint only failed after hydration. In dev the client now throws the same
// error; production keeps its current no-check behavior.
describe("client runtime dev JSON serializability checks", () => {
  it("throws for non-serializable event locals in dev only", async () => {
    const results = await runClientEngineProbe(`
      const node = { tag: "button", attrs: [], children: [], events: [{ name: "click", handler: "h", locals: ["fn"], modifiers: [] }] };
      const render = () => renderElement(node, {}, { fn: () => 1 }, "s", "sc", "m");
      let prodThrew = false;
      try { render(); } catch { prodThrew = true; }
      t("production render does not assert", prodThrew === false, prodThrew);
      window.__RESUX_DEV_RELOAD__ = true;
      let message = "";
      try { render(); } catch (error) { message = error.message; }
      t("dev render rejects a function local", message === 'event local "fn" must be JSON serializable.', message);
      const ok = renderElement(node, {}, { fn: 1 }, "s", "sc", "m");
      t("dev render accepts serializable locals", String(ok).includes("data-rx-locals-click"), ok);
    `);
    expectAllPass(results);
  });
});
