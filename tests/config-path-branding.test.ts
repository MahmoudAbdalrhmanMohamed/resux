import { describe, expect, it } from "vitest";
import {
  normalizeResuxGeneratedPath,
  resolveResuxConfig,
} from "../src/core/config.js";

describe("Resux generated path branding", () => {
  it("rewrites Nuxt build and client asset segments to Resux names", () => {
    expect(
      normalizeResuxGeneratedPath(
        ".nuxt/dist/client/_nuxt/client-enhancements.mjs",
      ),
    ).toBe(".resux/dist/client/__resux/client-enhancements.mjs");

    expect(
      normalizeResuxGeneratedPath(
        "C:\\project\\.nuxt\\dist\\client\\_nuxt\\client-enhancements.mjs",
      ),
    ).toBe(
      "C:\\project\\.resux\\dist\\client\\__resux\\client-enhancements.mjs",
    );
  });

  it("uses .resux when a migrated config still specifies .nuxt", () => {
    expect(resolveResuxConfig({ buildDir: ".nuxt" }).buildDir).toBe(".resux");
  });

  it("preserves custom paths that do not use Nuxt-owned segments", () => {
    expect(resolveResuxConfig({ buildDir: ".cache/resux" }).buildDir).toBe(
      ".cache/resux",
    );
    expect(
      normalizeResuxGeneratedPath(
        ".resux/dist/client/__resux/client-enhancements.mjs",
      ),
    ).toBe(".resux/dist/client/__resux/client-enhancements.mjs");
  });

  it("accepts real compatibility dates and rejects impossible calendar dates", () => {
    expect(resolveResuxConfig({ compatibilityDate: "2028-02-29" }).compatibilityDate).toBe(
      "2028-02-29",
    );
    expect(resolveResuxConfig({ compatibilityDate: "2026-02-29" }).compatibilityDate).toBe(
      "2026-05-20",
    );
    expect(resolveResuxConfig({ compatibilityDate: "2026-13-01" }).compatibilityDate).toBe(
      "2026-05-20",
    );
    expect(resolveResuxConfig({ compatibilityDate: "2026-00-10" }).compatibilityDate).toBe(
      "2026-05-20",
    );
  });
});
