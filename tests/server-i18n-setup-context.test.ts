import { describe, expect, it } from "vitest";
import { createServerSetupContext, type ResuxAppLike, type RouteContext, type RuntimeConfig } from "../src/runtime/index.js";

describe("server i18n setup context", () => {
  it("uses request runtime config for parameterized translations even when the global adapter is poisoned", () => {
    const route: RouteContext = { path: "/features/i18n", params: {}, query: {} };
    const runtimeConfig: RuntimeConfig = {
      public: {
        i18n: {
          defaultLocale: "en",
          fallbackLocale: "en",
          strategy: "prefix_except_default",
          locales: [
            { code: "en", name: "English", dir: "ltr" },
            { code: "ar", name: "العربية", dir: "rtl" },
          ],
          messages: {
            en: { i18n: { greeting: "Hello {name}" } },
            ar: { i18n: { greeting: "مرحبًا {name}" } },
          },
        },
      },
    };
    const provides: Record<string, unknown> = {};
    const app: ResuxAppLike = {
      route,
      payload: {} as any,
      $config: runtimeConfig,
      provides,
      provide(key: string, value: unknown) {
        provides[key] = value;
      },
    };

    const globals = globalThis as any;
    const previous = globals.__RESUX_USE_I18N__;
    globals.__RESUX_USE_I18N__ = () => ({
      t: (key: string) => key,
      tm: (key: string) => key,
    });

    try {
      const context = createServerSetupContext(
        route,
        {},
        {},
        {},
        [],
        app,
        runtimeConfig,
      );
      const i18n = context.useI18n();
      expect(i18n.t("i18n.greeting", { name: "Developer" })).toBe("Hello Developer");
      expect(i18n.localePath("/features/i18n", "ar")).toBe("/ar/features/i18n");
      expect(context.useLocalePath()("/features/i18n", "ar")).toBe("/ar/features/i18n");
    } finally {
      if (previous === undefined) delete globals.__RESUX_USE_I18N__;
      else globals.__RESUX_USE_I18N__ = previous;
    }
  });
});
