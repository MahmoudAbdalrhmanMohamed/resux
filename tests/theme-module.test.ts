import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import themeModule, {
  createThemeColorMetas,
  createThemeCss,
  createThemeScript,
  forceTheme,
  resolveThemeConfig,
} from "../src/theme/index.js";
import { renderDocument } from "../src/runtime/index.js";

function runSetup(options: Record<string, unknown> = {}) {
  const heads: any[] = [];
  const runtime: any[] = [];
  themeModule.setup?.(options as any, {
    addHead(head: any) { heads.push(head); },
    extendRuntimeConfig(config: any) { runtime.push(config); },
  } as any);
  return { heads, runtime };
}

describe("theme module config", () => {
  it("uses system default, light fallback, class attribute and localStorage key by default", () => {
    expect(resolveThemeConfig()).toMatchObject({
      defaultTheme: "system",
      fallback: "light",
      storageKey: "resux-theme",
      attribute: "class",
      colorScheme: true,
      disableTransition: false,
    });
  });

  it("ignores invalid option values instead of passing them through", () => {
    const config = resolveThemeConfig({ defaultTheme: "purple" as any, fallback: "system" as any, attribute: "style" as any, storageKey: "  " });
    expect(config.defaultTheme).toBe("system");
    expect(config.fallback).toBe("light");
    expect(config.attribute).toBe("class");
    expect(config.storageKey).toBe("resux-theme");
  });
});

describe("theme CSS variables and theme-color", () => {
  it("emits light values on :root and dark values on the dark selector", () => {
    const css = createThemeCss(resolveThemeConfig({ colors: { light: { bg: "#fff" }, dark: { "--bg": "#000" } } }));
    expect(css).toBe(":root{--bg:#fff}\n:root.dark{--bg:#000}");
    const dataCss = createThemeCss(resolveThemeConfig({ attribute: "data-theme", colors: { dark: { bg: "#000" } } }));
    expect(dataCss).toBe(':root[data-theme="dark"]{--bg:#000}');
  });

  it("drops names and values that could break out of the style rule", () => {
    const css = createThemeCss(resolveThemeConfig({
      colors: { light: { "bad name": "red", ok: "red}</style><script>", fine: "#123" } },
    }));
    expect(css).toBe(":root{--fine:#123}");
  });

  it("renders one theme-color meta per configured mode with its media query", () => {
    const metas = createThemeColorMetas(resolveThemeConfig({ themeColor: { light: "#ffffff", dark: "#0b0b0b" } }));
    expect(metas).toEqual([
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)", "data-resux-theme-color": "light" },
      { name: "theme-color", content: "#0b0b0b", media: "(prefers-color-scheme: dark)", "data-resux-theme-color": "dark" },
    ]);
    expect(createThemeColorMetas(resolveThemeConfig({ themeColor: { dark: "red;}" } }))).toEqual([]);
  });
});

describe("theme module head output", () => {
  it("adds the pre-paint script, variables and metas through addHead and exposes config", () => {
    const { heads, runtime } = runSetup({ colors: { dark: { bg: "#000" } }, themeColor: { dark: "#000" } });
    expect(heads).toHaveLength(1);
    expect(heads[0].script[0].innerHTML).toContain("__RESUX_THEME__");
    expect(heads[0].style[0].css).toContain(":root.dark{--bg:#000}");
    expect(heads[0].meta).toHaveLength(1);
    expect(runtime[0].public.theme).toMatchObject({ defaultTheme: "system", storage: "resux-theme" });
  });

  it("the pre-paint script is plain inline JS that carries the settings and reads only localStorage", () => {
    const script = createThemeScript(resolveThemeConfig({ storageKey: "my-theme", defaultTheme: "dark" }));
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('"k":"my-theme"');
    expect(script).toContain('"d":"dark"');
    expect(script).not.toMatch(/document\.cookie/);
    expect(script.length).toBeLessThan(3500);
  });

  it("puts the CSP nonce on the inline theme script and style", () => {
    const { heads } = runSetup({ colors: { light: { bg: "#fff" } } });
    const html = renderDocument({
      html: "<main>x</main>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: heads[0],
    } as any, "T", { nonce: "n0nce" } as any);
    expect(html).toMatch(/<script[^>]*data-resux-theme="true"[^>]*nonce="n0nce"|<script[^>]*nonce="n0nce"[^>]*data-resux-theme="true"/);
    expect(html).toMatch(/<style[^>]*nonce="n0nce"[^>]*>:root\{--bg:#fff\}|<style[^>]*>:root\{--bg:#fff\}/);
  });

  it("forceTheme returns an htmlAttrs entry and falls back to light for bad input", () => {
    expect(forceTheme("dark")).toEqual({ htmlAttrs: { "data-theme-forced": "dark" } });
    expect(forceTheme("pink" as any)).toEqual({ htmlAttrs: { "data-theme-forced": "light" } });
  });
});

describe("theme entry stays tree-shakeable", () => {
  it("marks its default export pure in the built dist", () => {
    const source = readFileSync(new URL("../dist/theme/index.js", import.meta.url), "utf8");
    expect(source).toMatch(/var \w+_default = \/\* @__PURE__ \*\/\s*defineResuxModule\(/);
  });
});
