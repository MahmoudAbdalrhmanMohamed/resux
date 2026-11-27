import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { createThemeScript, resolveThemeConfig } from "../src/theme/index.js";

function runScript(storage: Record<string, unknown>) {
  const classes = new Set<string>();
  const documentElement = {
    classList: {
      toggle(name: string, on: boolean) { if (on) classes.add(name); else classes.delete(name); },
      contains: (name: string) => classes.has(name),
    },
    style: {},
    getAttribute: () => null,
    setAttribute: () => {},
    dispatchEvent: () => true,
    offsetHeight: 0,
  };
  const window: Record<string, any> = {
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    addEventListener: () => {},
  };
  const context = {
    window,
    document: { documentElement, querySelectorAll: () => [], currentScript: null },
    matchMedia: window.matchMedia,
    localStorage: storage,
    CustomEvent: class { constructor(public type: string, public init: unknown) {} },
  };
  vm.runInNewContext(createThemeScript(resolveThemeConfig({ defaultTheme: "light" })), context);
  return { theme: window.__RESUX_THEME__, classes };
}

describe("theme script without usable localStorage", () => {
  it("keeps the chosen mode in memory when storage throws", () => {
    const blocked = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
    };
    const { theme, classes } = runScript(blocked);
    expect(theme.state().resolved).toBe("light");
    theme.set("dark");
    expect(theme.state().preference).toBe("dark");
    expect(classes.has("dark")).toBe(true);
  });
});
