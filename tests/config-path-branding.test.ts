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
});
