import { describe, expect, it } from "vitest";
import fontsModule from "../src/fonts/index.js";

function createMockResux() {
  const headList: Array<{ link?: any[]; style?: any[]; script?: any[]; noscript?: any[] }> = [];
  const runtimeConfigs: any[] = [];

  return {
    headList,
    runtimeConfigs,
    resux: {
      addHead(head: { link?: any[]; script?: any[]; noscript?: any[] }) {
        headList.push(head);
      },
      extendRuntimeConfig(config: any) {
        runtimeConfigs.push(config);
      }
    }
  };
}

describe("fonts module", () => {
  it("defaults to non-blocking preload loading for all fonts", () => {
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
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap"
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap",
        media: "print",
        onload: "this.media='all'",
        "data-resux-font-async": "true"
      }
    ]);
    expect(headList[0].script ?? []).toEqual([]);
    expect(headList[0].noscript).toEqual([
      {
        link: [{
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap"
        }]
      }
    ]);

    expect(runtimeConfigs[0].public.fonts.families).toEqual(["Inter", "Alexandria"]);
    expect(runtimeConfigs[0].public.fonts.familyConfigs).toEqual([
      { name: "Inter", strategy: "preload", deferUntilPageLoad: false },
      { name: "Alexandria", strategy: "preload", deferUntilPageLoad: false }
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
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap",
        media: "print",
        "data-resux-font-lazy": "true"
      }
    ]);
    expect(headList[0].script).toHaveLength(1);
    expect(headList[0].script![0]["data-resux-font-loader"]).toBe("true");
    expect(headList[0].script![0].innerHTML).toContain("window.addEventListener('load',loadFonts,{once:true})");
    expect(headList[0].noscript?.[0]?.link?.[0]).toEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Alexandria:wght@300;600&display=swap"
    });
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

    // Lazy stylesheet stays non-blocking until the page-load activator runs.
    expect(links).toContainEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;600&display=swap",
      media: "print",
      "data-resux-font-lazy": "true"
    });
    expect(headList[0].script).toHaveLength(1);
    expect(headList[0].script![0]["data-resux-font-loader"]).toBe("true");

    expect(runtimeConfigs[0].public.fonts.familyConfigs).toEqual([
      { name: "Inter", strategy: "eager", deferUntilPageLoad: false },
      { name: "Alexandria", strategy: "lazy", deferUntilPageLoad: true }
    ]);
  });

  it("allows per-font deferUntilPageLoad: false to override global lazy strategy", () => {
    const { headList, runtimeConfigs, resux } = createMockResux();
    fontsModule.setup(
      {
        strategy: "lazy",
        google: [
          { name: "Inter", weights: [400], deferUntilPageLoad: false },
          { name: "Alexandria", weights: [400] }
        ]
      },
      resux as any
    );

    expect(headList[0].link).toContainEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
    });
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
      rel: "preload",
      as: "style",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
    });
    expect(links).toContainEqual({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap",
      media: "print",
      onload: "this.media='all'",
      "data-resux-font-async": "true"
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
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap",
      media: "print",
      onload: "this.media='all'",
      "data-resux-font-async": "true"
    });
    expect(headList[0].noscript?.[0]?.link?.[0]).toEqual({
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

  it("generates self-hosted font faces and efficient font preloads", () => {
    const { headList, runtimeConfigs, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          {
            name: "Ideal Sans",
            provider: "local",
            variable: "--font-ideal",
            faces: [
              { src: "/fonts/ideal-sans-regular.woff2", weight: 400, preload: true },
              { src: "/fonts/ideal-sans-bold.woff2", weight: 700 }
            ]
          }
        ]
      },
      resux as any
    );

    expect(headList).toHaveLength(1);
    expect(headList[0].link).toContainEqual({
      rel: "preload",
      as: "font",
      href: "/fonts/ideal-sans-regular.woff2",
      crossorigin: "",
      type: "font/woff2"
    });
    const css = headList[0].style?.[0]?.children ?? "";
    expect(css).toContain('@font-face { font-family: "Ideal Sans"');
    expect(css).toContain('url("/fonts/ideal-sans-regular.woff2") format("woff2")');
    expect(css).toContain("font-weight: 700");
    expect(css).toContain(':root { --font-ideal: "Ideal Sans"; }');
    expect(runtimeConfigs[0].public.fonts.provider).toBe("local");
  });

  it("supports remote font files without adding Google preconnects", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          {
            name: "Brand Font",
            provider: "remote",
            src: "https://cdn.example.test/brand.woff2",
            weight: "400..700",
            style: "normal"
          }
        ]
      },
      resux as any
    );

    const links = headList[0].link!;
    expect(links.some((link) => link.rel === "preconnect")).toBe(false);
    expect(links).toContainEqual({
      rel: "preload",
      as: "font",
      href: "https://cdn.example.test/brand.woff2",
      crossorigin: "",
      type: "font/woff2"
    });
    expect(headList[0].style?.[0]?.children).toContain("font-weight: 400 700");
  });

  it("mixes Google and self-hosted families without changing the legacy Google contract", () => {
    const { runtimeConfigs, resux } = createMockResux();
    fontsModule.setup(
      {
        google: [{ name: "Inter", weights: [400, 700] }],
        families: [
          { name: "Alexandria Local", provider: "local", src: "/fonts/alexandria.woff2" }
        ]
      },
      resux as any
    );

    expect(runtimeConfigs[0].public.fonts.provider).toBe("mixed");
    expect(runtimeConfigs[0].public.fonts.providers).toEqual(["google", "local"]);
    expect(runtimeConfigs[0].public.fonts.families).toEqual(["Inter", "Alexandria Local"]);
    expect(runtimeConfigs[0].public.fonts.familyConfigs[0]).toEqual({
      name: "Inter",
      strategy: "preload",
      deferUntilPageLoad: false
    });
  });

  it("keeps custom font CSS available to client head updates", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          { name: "Ideal Sans", provider: "local", src: "/fonts/ideal.woff2" }
        ]
      },
      resux as any
    );

    const style = headList[0].style?.[0];
    expect(style.id).toBe("resux-custom-font-faces");
    expect(style.css).toContain('@font-face { font-family: "Ideal Sans"');
    expect(style.children).toBe(style.css);
  });

  it("defers lazy custom faces until the page load loader runs", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          {
            name: "Deferred Sans",
            provider: "local",
            src: "/fonts/deferred.woff2",
            strategy: "lazy"
          }
        ]
      },
      resux as any
    );

    expect(headList[0].style).toBeUndefined();
    expect(headList[0].link).toEqual([]);
    const loader = headList[0].script?.find((entry: any) => entry["data-resux-font-lazy-custom-loader"] === "true");
    expect(loader?.innerHTML).toContain("data-resux-font-lazy-runtime");
    expect(loader?.innerHTML).toContain("@font-face");
    expect(loader?.innerHTML).toContain("/fonts/deferred.woff2");
  });

  it("orders sources and preloads the same preferred face", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          {
            name: "Ordered Sans",
            provider: "local",
            faces: [{
              src: [
                { url: "/fonts/ordered.woff", format: "woff" },
                { url: "/fonts/ordered.woff2", format: "woff2" }
              ],
              preload: true
            }]
          }
        ]
      },
      resux as any
    );

    const css = headList[0].style?.[0]?.children ?? "";
    expect(css.indexOf("ordered.woff2")).toBeLessThan(css.indexOf("ordered.woff"));
    expect(headList[0].link).toContainEqual({
      rel: "preload",
      as: "font",
      href: "/fonts/ordered.woff2",
      crossorigin: "",
      type: "font/woff2"
    });
  });

  it("rejects invalid unicode ranges instead of widening a font face", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          {
            name: "Subset Sans",
            provider: "local",
            src: "/fonts/subset.woff2",
            unicodeRange: "U+?A"
          }
        ]
      },
      resux as any
    );

    expect(headList).toHaveLength(0);
  });

  it("rejects unsafe custom font URLs", () => {
    const { headList, resux } = createMockResux();
    fontsModule.setup(
      {
        families: [
          { name: "Unsafe", provider: "remote", src: "javascript:alert(1)" }
        ]
      },
      resux as any
    );

    expect(headList).toHaveLength(0);
  });
});
