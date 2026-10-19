import { describe, it, expect } from "vitest";
import {
  parseIconName,
  normalizeIconApiProvider,
  stripTrailingSlashes,
} from "../../src/icons/normalize.js";

describe("icons normalization", () => {
  it("normalizes API providers safely", () => {
    expect(normalizeIconApiProvider("")).toBe("https://api.iconify.design");
    expect(normalizeIconApiProvider(null)).toBe("https://api.iconify.design");
    expect(normalizeIconApiProvider("//malicious.com")).toBe("https://api.iconify.design");
    expect(normalizeIconApiProvider("/internal/api/")).toBe("/internal/api");
    expect(normalizeIconApiProvider("https://icons.example.test/base///")).toBe(
      "https://icons.example.test/base"
    );
  });

  it("strips trailing slashes correctly", () => {
    expect(stripTrailingSlashes("https://example.com/")).toBe("https://example.com");
    expect(stripTrailingSlashes("https://example.com///")).toBe("https://example.com");
    expect(stripTrailingSlashes("")).toBe("");
  });

  it("parses standard collection:name format", () => {
    expect(parseIconName("lucide:arrow-right")).toEqual({
      prefix: "lucide",
      name: "arrow-right",
    });
    expect(parseIconName("material-symbols:mail")).toEqual({
      prefix: "material-symbols",
      name: "mail",
    });
  });

  it("parses slash separator format", () => {
    expect(parseIconName("lucide/arrow-right")).toEqual({
      prefix: "lucide",
      name: "arrow-right",
    });
  });

  it("parses Nuxt Icon i- prefix format", () => {
    expect(parseIconName("i-lucide:arrow-right")).toEqual({
      prefix: "lucide",
      name: "arrow-right",
    });
    expect(parseIconName("i-lucide-arrow-right")).toEqual({
      prefix: "lucide",
      name: "arrow-right",
    });
    expect(parseIconName("i-material-symbols-mail", undefined, ["material-symbols"])).toEqual({
      prefix: "material-symbols",
      name: "mail",
    });
  });

  it("resolves custom and built-in aliases", () => {
    const aliases = {
      mail: "material-symbols:mail",
      github: "i-uil-github",
    };
    expect(parseIconName("mail", aliases)).toEqual({
      prefix: "material-symbols",
      name: "mail",
    });
    expect(parseIconName("github", aliases)).toEqual({
      prefix: "uil",
      name: "github",
    });
  });

  it("returns null for invalid icon names", () => {
    expect(parseIconName("")).toBeNull();
    expect(parseIconName("   ")).toBeNull();
    expect(parseIconName("no-colon-or-prefix")).toBeNull();
  });
});
