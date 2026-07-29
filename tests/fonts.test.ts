import { describe, expect, it } from "vitest";
import fontsModule from "../src/fonts/index.js";

function createMockResux() {
  const headList: Array<{ link?: any[]; script?: any[] }> = [];
  const runtimeConfigs: any[] = [];

  return {
    headList,
    runtimeConfigs,
    resux: {
      addHead(head: { link?: any[]; script?: any[] }) {
        headList.push(head);
      },
      extendRuntimeConfig(config: any) {
        runtimeConfigs.push(config);
      }
    }
  };
}

describe("fonts module", () => {
  it("defaults to eager loading for all fonts", () => {
    const { headList, runtimeConfigs, resux } = createMockResux();
    fontsModule.setup(
      {
        google: [
          { name: "Inter", weights: [400, 700] },
          { name: "Alexandria", weights: [300, 600] }
        ]
      },
      resux as any
    );

    expect(headList).toHaveLength(1);
    expect(headList[0].link).toEqual([
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap"
      }
    ]);
    expect(headList[0].script ?? []).toEqual([]);

    expect(runtimeConfigs[0].public.fonts.families).toEqual(["Inter", "Alexandria"]);
    expect(runtimeConfigs[0].public.fonts.familyConfigs).toEqual([
      { name: "Inter", strategy: "eager", deferUntilPageLoad: false },
      { name: "Alexandria", strategy: "eager", deferUntilPageLoad: false }
    ]);
  });

  it("supports global lazy strategy for all fonts", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        strategy: "lazy",
        google: [
          { name: "Inter", weights: [400, 700] },
          { name: "Alexandria", weights: [300, 600] }
        ]
      },
      resux as any
    );

    expect(headList[0].link).toEqual([
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap"
      }
    ]);
    expect(headList[0].script).toHaveLength(1);
    expect(headList[0].script![0].innerHTML).toContain("window.addEventListener('load',loadFonts)");
  });

  it("allows mixing eager and lazy fonts with per-font control", () => {
    const { headList, runtimeConfigs, resux } = createMockResux();
    fontsModule.setup(
      {
        strategy: "lazy",
        deferUntilPageLoad: true,
        google: [
          { name: "Inter", weights: [400, 500, 700], strategy: "eager" },
          { name: "Alexandria", weights: [300, 400, 600], display: "swap" }
        ]
      },
      resux as any
    );

    expect(headList).toHaveLength(1);
    // Preconnect links inserted only once
    const links = headList[0].link!;
    expect(links.filter((l) => l.rel === "preconnect")).toHaveLength(2);

    // Eager stylesheet link for Inter
    expect(links).toContainEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
    });

    // Lazy preloaded link for Alexandria
    expect(links).toContainEqual({
      rel: "preload",
      as: "style",
      href: "https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;600&display=swap"
    });

    // Deferral script for Alexandria
    expect(headList[0].script).toHaveLength(1);
    expect(headList[0].script![0].innerHTML).toContain(
      "https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;600&display=swap"
    );

    expect(runtimeConfigs[0].public.fonts.familyConfigs).toEqual([
      { name: "Inter", strategy: "eager", deferUntilPageLoad: false },
      { name: "Alexandria", strategy: "lazy", deferUntilPageLoad: true }
    ]);
  });

  it("allows per-font deferUntilPageLoad: false to override global deferUntilPageLoad", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        deferUntilPageLoad: true,
        google: [
          { name: "Inter", weights: [400], deferUntilPageLoad: false },
          { name: "Alexandria", weights: [400] }
        ]
      },
      resux as any
    );

    const links = headList[0].link!;
    expect(links).toContainEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
    });
    expect(links).toContainEqual({
      rel: "preload",
      as: "style",
      href: "https://fonts.googleapis.com/css2?family=Alexandria:wght@400&display=swap"
    });
  });

  it("supports per-font strategy: 'preload'", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        google: [
          { name: "Inter", weights: [400], strategy: "preload" }
        ]
      },
      resux as any
    );

    const links = headList[0].link!;
    expect(links).toContainEqual({
      rel: "preload",
      as: "style",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
    });
    expect(links).toContainEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
    });
  });

  it("suppresses preconnect links when preconnect is false", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        preconnect: false,
        google: [{ name: "Inter", weights: [400] }]
      },
      resux as any
    );

    const links = headList[0].link!;
    expect(links.some((l) => l.rel === "preconnect")).toBe(false);
  });
});
