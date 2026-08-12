import { describe, expect, it } from "vitest";
import {
  buildLocalePath,
  createI18nHead,
  normalizeI18nRuntimeConfig,
  resolveI18nRoute,
} from "../src/i18n/shared.js";

function config(strategy: "prefix" | "prefix_except_default" | "no_prefix" = "prefix_except_default") {
  const normalized = normalizeI18nRuntimeConfig({
    defaultLocale: "en",
    fallbackLocale: "en",
    strategy,
    locales: [
      { code: "EN", name: "English", dir: "ltr" },
      { code: "ar", name: "العربية", dir: "rtl" },
      { code: "ar", name: "Duplicate Arabic", dir: "rtl" },
      { code: "pt-BR", name: "Português", dir: "ltr" },
    ],
    messages: {},
  });
  if (!normalized) throw new Error("expected i18n config");
  return normalized;
}

describe("i18n canonical route behavior", () => {
  it("keeps query/hash out of route identity while preserving them when switching locale", () => {
    const runtime = config("prefix");
    const route = resolveI18nRoute("/en/products/42?tab=reviews#top", runtime);

    expect(route.locale.code).toBe("en");
    expect(route.basePath).toBe("/products/42");
    expect(route.localizedPath).toBe("/en/products/42");
    expect(buildLocalePath("/en/products/42?tab=reviews#top", "ar", runtime))
      .toBe("/ar/products/42?tab=reviews#top");
    expect(buildLocalePath("/ar/products/42?tab=reviews#top", "en", runtime))
      .toBe("/en/products/42?tab=reviews#top");
  });

  it("canonicalizes a default-locale prefix under prefix_except_default", () => {
    const head = createI18nHead(
      "/en/about?from=legacy#section",
      "https://example.test",
      config("prefix_except_default"),
    );

    expect(head.htmlAttrs).toEqual({ lang: "en", dir: "ltr" });
    expect(head.link.find((entry) => entry.rel === "canonical")).toEqual({
      rel: "canonical",
      href: "https://example.test/about",
    });
    expect(head.link).toEqual(expect.arrayContaining([
      { rel: "alternate", hreflang: "en", href: "https://example.test/about" },
      { rel: "alternate", hreflang: "ar", href: "https://example.test/ar/about" },
      { rel: "alternate", hreflang: "pt-br", href: "https://example.test/pt-br/about" },
      { rel: "alternate", hreflang: "x-default", href: "https://example.test/about" },
    ]));
  });

  it("emits localized canonical URLs for prefix and pathname-only canonical URLs for no_prefix", () => {
    const prefixed = createI18nHead("/ar/docs/guide", undefined, config("prefix"));
    expect(prefixed.htmlAttrs).toEqual({ lang: "ar", dir: "rtl" });
    expect(prefixed.link.find((entry) => entry.rel === "canonical")?.href).toBe("/ar/docs/guide");

    const unprefixed = createI18nHead("/docs/guide", undefined, config("no_prefix"));
    expect(unprefixed.link.find((entry) => entry.rel === "canonical")?.href).toBe("/docs/guide");
  });
});
