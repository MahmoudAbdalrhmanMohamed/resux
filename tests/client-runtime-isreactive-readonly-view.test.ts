import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime isReactive(): the server engine
// (src/reactivity/reactive.ts) sees through a readonly view and reports the
// underlying reactive proxy, so isReactive(readonly(reactive(x))) is true.
// The client copy read only the proxy's own flags and reported false, which
// diverged from SSR for app code that branches on isReactive.
describe("client runtime isReactive through readonly views", () => {
  it("matches the server engine for readonly views of reactive targets", async () => {
    const results = await runClientEngineProbe(`
      const roOfRx = readonly(reactive({ a: 1 }));
      t("isReactive(readonly(reactive(object)))", isReactive(roOfRx) === true, isReactive(roOfRx));
      t("isReadonly stays true on the view", isReadonly(roOfRx) === true, isReadonly(roOfRx));
      const roOfRxMap = readonly(reactive(new Map()));
      t("isReactive(readonly(reactive(Map)))", isReactive(roOfRxMap) === true, isReactive(roOfRxMap));
      const plainRo = readonly({ a: 1 });
      t("isReactive(readonly(plain)) stays false", isReactive(plainRo) === false, isReactive(plainRo));
      const rx = reactive({ a: 1 });
      t("isReactive(reactive) stays true", isReactive(rx) === true, isReactive(rx));
      const roOfRo = readonly(readonly({ a: 1 }));
      t("isReactive(readonly(readonly(plain))) stays false", isReactive(roOfRo) === false, isReactive(roOfRo));
      t("isReactive(plain) stays false", isReactive({}) === false, isReactive({}));
      t("isReactive(null) stays false", isReactive(null) === false, isReactive(null));
    `);
    expectAllPass(results);
  });
});
