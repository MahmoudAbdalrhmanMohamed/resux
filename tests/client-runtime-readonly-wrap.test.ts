import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime readonly(): the server engine
// (src/reactivity/reactive.ts) only returns an existing proxy as-is when the
// request is not a readonly view over a reactive proxy. The client copy
// returned the reactive proxy itself from readonly(reactive(x)), so the
// "readonly" result stayed mutable in the browser.

describe("client runtime readonly over reactive", () => {
  it("readonly(reactive(x)) is a true readonly view, like the server engine", async () => {
    const results = await runClientEngineProbe(`
      const r = reactive({ a: 1, n: { b: 2 } });
      const ro = readonly(r);
      t("readonly view reports readonly", isReadonly(ro) === true, isReadonly(ro));
      t("readonly view is not the reactive proxy", ro !== r, ro === r);
      ro.a = 5;
      t("writes through the readonly view are blocked", r.a === 1, r.a);
      r.a = 7;
      t("reads through the readonly view stay live", ro.a === 7, ro.a);
      t("nested objects are readonly too", isReadonly(ro.n) === true, isReadonly(ro.n));
      ro.n.b = 9;
      t("nested writes are blocked", r.n.b === 2, r.n.b);
      const plain = readonly({ a: 1 });
      t("readonly(readonly(x)) returns the same proxy", readonly(plain) === plain, readonly(plain) === plain);
    `);
    expectAllPass(results);
  });
});
