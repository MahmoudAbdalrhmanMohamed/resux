import { describe, expect, it } from "vitest";
import fontsModule from "../src/fonts/index.js";
import { createMockResux } from "./helpers/fonts-fixtures.js";

describe("fonts module", () => {
  it("includes fallback aliases in generated CSS variable when fallbacks are specified", async () => {
    const { headList, resux } = createMockResux();
    await fontsModule.setup(
      {
        families: [
          {
            name: "Inter",
            variable: "--font-inter",
            fallbacks: ["Arial", "sans-serif"],
            faces: [{ src: "/fonts/inter.woff2" }]
          }
        ]
      },
      resux as any
    );
    const css = headList[0].style?.[0]?.children ?? headList[0].style?.[0]?.css ?? "";
    expect(css).toContain(':root { --font-inter: "Inter", "Inter fallback: Arial", "Inter fallback: sans-serif"; }');
  });

  it("generates fallback font metric overrides to eliminate layout shift", async () => {
    const { headList, resux } = createMockResux();
    await fontsModule.setup(
      {
        families: [
          {
            name: "Inter",
            src: "/fonts/inter.woff2",
            fallbacks: ["Arial", "sans-serif"]
          }
        ]
      },
      resux as any
    );
    const style = headList[0].style?.[0]?.css;
    expect(style).toContain('font-family: "Inter"');
    expect(style).toContain('font-family: "Inter fallback: Arial"');
    expect(style).toContain('src: local("Arial")');
    expect(style).toContain("ascent-override:");
    expect(style).toContain("descent-override:");
    expect(style).toContain("size-adjust:");
  });

  it("generates fallback font metric overrides for Google fonts", async () => {
    const { headList, resux } = createMockResux();
    await fontsModule.setup(
      {
        google: [
          {
            name: "Roboto",
            weights: [400],
            fallbacks: ["Arial", "sans-serif"]
          }
        ]
      },
      resux as any
    );
    const style = headList[0].style?.[0]?.css;
    expect(style).toContain('font-family: "Roboto fallback: Arial"');
    expect(style).toContain('src: local("Arial")');
    expect(style).toContain("ascent-override:");
    expect(style).toContain("size-adjust:");
    expect(headList[0].link?.some((l) => l.href?.includes("family=Roboto"))).toBe(true);
  });

  it("gracefully ignores fallback generation if primary font metrics are unavailable", async () => {
    const { headList, resux } = createMockResux();
    await fontsModule.setup(
      {
        families: [
          {
            name: "NonExistentFontXYZ",
            src: "/fonts/unknown.woff2",
            fallbacks: ["Arial"]
          }
        ]
      },
      resux as any
    );
    const style = headList[0].style?.[0]?.css;
    expect(style).toContain('font-family: "NonExistentFontXYZ"');
    expect(style).not.toContain("fallback:");
  });

  it("sanitizes control characters in fallback font names", async () => {
    const { headList, resux } = createMockResux();
    await fontsModule.setup(
      {
        families: [
          {
            name: "Inter",
            src: "/fonts/inter.woff2",
            fallbacks: ["Arial\x00", "\x1f"]
          }
        ]
      },
      resux as any
    );
    const style = headList[0].style?.[0]?.css;
    expect(style).toContain('font-family: "Inter fallback: Arial"');
    expect(style).toContain('src: local("Arial")');
    expect(style).not.toContain("\x00");
    expect(style).not.toContain("\x1f");
  });
});
