import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime i18n t(): the server engine
// (src/i18n/shared.ts translateText) stringifies number and boolean message
// values. The client copy returned the message KEY for any non-string value,
// so SSR and hydrated client rendered different text.

describe("client runtime i18n non-string message values", () => {
  it("mirrors the server engine for number, boolean, missing and interpolated messages", async () => {
    const results = await runClientEngineProbe(`
      globalThis.__RESUX__ = {
        route: { path: "/", params: {}, query: {} },
        scopes: {}, globalState: {}, modules: {},
        config: { public: { i18n: {
          locales: [{ code: "en" }], defaultLocale: "en", fallbackLocale: "en",
          messages: { en: { count: 5, ratio: 1.5, flag: true, greet: "hi {name}" } }
        } } }
      };
      const i18n = useClientI18n();
      t("number message stringified like the server", i18n.t("count") === "5", i18n.t("count"));
      t("float message stringified", i18n.t("ratio") === "1.5", i18n.t("ratio"));
      t("boolean message stringified like the server", i18n.t("flag") === "true", i18n.t("flag"));
      t("missing key still returns the key", i18n.t("unknown.key") === "unknown.key", i18n.t("unknown.key"));
      t("string messages still interpolate", i18n.t("greet", { name: "sam" }) === "hi sam", i18n.t("greet", { name: "sam" }));
    `);
    expectAllPass(results);
  });
});
