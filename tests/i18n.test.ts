import { describe, expect, it } from "vitest";
import {
  defineComponent,
  renderApp,
  renderDocument,
  type ComponentDefinition,
  type RuntimeConfig,
} from "resuxjs/runtime";
import {
  buildLocalePath,
  normalizeI18nRuntimeConfig,
  resolveI18nRoute,
  translateText,
} from "../src/i18n/shared.js";

function createRuntimeConfig(): RuntimeConfig {
  return {
    public: {
      i18n: {
        defaultLocale: "en",
        fallbackLocale: "en",
        strategy: "prefix_except_default",
        locales: [
          { code: "en", name: "English", dir: "ltr" },
          { code: "ar", name: "Arabic", dir: "rtl" },
        ],
        messages: {
          en: {
            demo: {
              welcome: "Hello {name}",
              onlyEn: "English fallback",
            },
          },
          ar: {
            demo: {
              welcome: "مرحبا {name}",
            },
          },
        },
        seo: {
          hreflang: true,
        },
      },
    },
  };
}

describe("i18n shared helpers", () => {
  it("handles nested keys, interpolation, fallback, and path strategy", () => {
    const config = normalizeI18nRuntimeConfig(createRuntimeConfig().public.i18n);
    if (!config) {
      throw new Error("Expected normalized i18n config.");
    }

    expect(translateText(config, "ar", "demo.welcome", { name: "Ada" })).toBe("مرحبا Ada");
    expect(translateText(config, "ar", "demo.onlyEn")).toBe("English fallback");
    expect(translateText(config, "ar", "demo.missing")).toBe("demo.missing");

    expect(resolveI18nRoute("/ar/about", config).locale.code).toBe("ar");
    expect(buildLocalePath("/about", "ar", config)).toBe("/ar/about");
    expect(buildLocalePath("/ar/about", "en", config)).toBe("/about");
    expect(buildLocalePath("/about?tab=1#part", "ar", config)).toBe("/ar/about?tab=1#part");
  });
});

describe("i18n runtime integration", () => {
  it("exposes locale helpers and translations through useI18n", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-i18n-demo",
      name: "I18nDemo",
      file: "I18nDemo.vue",
      handlers: [],
      async script() {
        const { useI18n } = await import("resuxjs/i18n");
        const i18n = useI18n();
        return {
          welcome: i18n.t("demo.welcome", { name: "Ada" }),
          fallback: i18n.t("demo.onlyEn"),
          locale: i18n.locale.value,
          dir: i18n.dir.value,
          toEn: i18n.switchLocalePath("en", "/ar/about"),
          toAr: i18n.switchLocalePath("ar", "/about"),
        };
      },
      template: [
        {
          type: "element",
          tag: "main",
          attrs: [],
          events: [],
          children: [
            { type: "text", value: "welcome:" },
            { type: "interpolation", expression: "welcome", bindingId: "b0" },
            { type: "text", value: "|fallback:" },
            { type: "interpolation", expression: "fallback", bindingId: "b1" },
            { type: "text", value: "|locale:" },
            { type: "interpolation", expression: "locale", bindingId: "b2" },
            { type: "text", value: "|dir:" },
            { type: "interpolation", expression: "dir", bindingId: "b3" },
            { type: "text", value: "|toEn:" },
            { type: "interpolation", expression: "toEn", bindingId: "b4" },
            { type: "text", value: "|toAr:" },
            { type: "interpolation", expression: "toAr", bindingId: "b5" },
          ],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/ar/about", params: {}, query: {} },
      runtimeConfig: createRuntimeConfig(),
    });

    expect(result.html).toContain("welcome:");
    expect(result.html).toContain("مرحبا Ada");
    expect(result.html).toContain("fallback:");
    expect(result.html).toContain("English fallback");
    expect(result.html).toContain("locale:");
    expect(result.html).toContain(">ar</span>");
    expect(result.html).toContain("dir:");
    expect(result.html).toContain(">rtl</span>");
    expect(result.html).toContain("toEn:");
    expect(result.html).toContain(">/about</span>");
    expect(result.html).toContain("toAr:");
    expect(result.html).toContain(">/ar/about</span>");
  });

  it("sets localized html attrs, localized title, and hreflang links in head output", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-i18n-head",
      name: "I18nHead",
      file: "I18nHead.vue",
      handlers: [],
      meta: {
        title: {
          en: "About",
          ar: "حول",
        },
      },
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "main",
          attrs: [],
          events: [],
          children: [{ type: "text", value: "Head" }],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: {
        path: "/ar/about",
        params: {},
        query: {},
        origin: "https://example.com",
      },
      runtimeConfig: createRuntimeConfig(),
    });

    expect(result.head.title).toBe("حول");
    expect(result.head.htmlAttrs).toEqual({
      lang: "ar",
      dir: "rtl",
    });
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "alternate",
        hreflang: "en",
        href: "https://example.com/about",
      }),
      expect.objectContaining({
        rel: "alternate",
        hreflang: "ar",
        href: "https://example.com/ar/about",
      }),
      expect.objectContaining({
        rel: "alternate",
        hreflang: "x-default",
        href: "https://example.com/about",
      }),
    ]));

    const documentHtml = renderDocument(result);
    expect(documentHtml).toContain('<html lang="ar" dir="rtl">');
    expect(documentHtml).toContain('hreflang="x-default"');
    expect(documentHtml).toContain("https://example.com/ar/about");
  });
});
