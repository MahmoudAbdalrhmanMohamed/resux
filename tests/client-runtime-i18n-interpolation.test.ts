import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime i18n interpolation: the server
// engine (src/i18n/shared.ts interpolateMessage) only fills {alphanumeric}
// placeholders and keeps a placeholder literal when the param is undefined or
// null. The client copy filled any {…} placeholder and rendered undefined
// params as the string "undefined", so SSR and hydrated client disagreed.

describe("client runtime i18n interpolation semantics", () => {
  it("mirrors the server engine for missing, undefined, null and exotic placeholders", async () => {
    const results = await runClientEngineProbe(`
      globalThis.__RESUX__ = {
        route: { path: "/", params: {}, query: {} },
        scopes: {}, globalState: {}, modules: {},
        config: { public: { i18n: {
          locales: [{ code: "en" }], defaultLocale: "en", fallbackLocale: "en",
          messages: { en: { greet: "hi {name}", duo: "{a} and {b}", exotic: "x {user-name} y" } }
        } } }
      };
      const i18n = useClientI18n();
      t("present param interpolated", i18n.t("greet", { name: "sam" }) === "hi sam", i18n.t("greet", { name: "sam" }));
      t("missing param kept literal", i18n.t("greet", {}) === "hi {name}", i18n.t("greet", {}));
      t("undefined param kept literal like the server", i18n.t("greet", { name: undefined }) === "hi {name}", i18n.t("greet", { name: undefined }));
      t("null param kept literal like the server", i18n.t("greet", { name: null }) === "hi {name}", i18n.t("greet", { name: null }));
      t("zero and false params interpolate", i18n.t("duo", { a: 0, b: false }) === "0 and false", i18n.t("duo", { a: 0, b: false }));
      t("non-alphanumeric placeholder left literal like the server", i18n.t("exotic", { "user-name": "sam" }) === "x {user-name} y", i18n.t("exotic", { "user-name": "sam" }));
    `);
    expectAllPass(results);
  });
});
