import { describe, expect, it } from "vitest";
import fontsModule from "../src/fonts/index.js";

describe("fonts module", () => {
  it("registers fontless Vite plugin when autoScan is enabled by default", () => {
    const plugins: any[] = [];
    const resux = {
      addVitePlugin(plugin: any) { plugins.push(plugin); },
      addHead() {},
      extendRuntimeConfig() {}
    };
    fontsModule.setup({}, resux as any);
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.some((p: any) => p.name === "vite-plugin-fontless")).toBe(true);
  });

  it("does not register fontless Vite plugin when autoScan is explicitly false", () => {
    const plugins: any[] = [];
    const resux = {
      addVitePlugin(plugin: any) { plugins.push(plugin); },
      addHead() {},
      extendRuntimeConfig() {}
    };
    fontsModule.setup({ autoScan: false }, resux as any);
    expect(plugins).toHaveLength(0);
  });

  it("does not throw when addVitePlugin is not provided on resux", () => {
    const resux = {
      addHead() {},
      extendRuntimeConfig() {}
    };
    expect(() => fontsModule.setup({}, resux as any)).not.toThrow();
  });

  it("passes devtools, defaults, providers and mapped families to fontless", () => {
    const plugins: any[] = [];
    const resux = {
      addVitePlugin(plugin: any) { plugins.push(plugin); },
      addHead() {},
      extendRuntimeConfig() {}
    };
    fontsModule.setup(
      {
        devtools: false,
        defaults: {
          preload: true,
          subsets: ["latin"],
          weights: [400, 700]
        },
        providers: {
          google: true,
          bunny: false
        },
        families: [
          { name: "Inter", provider: "google", weights: [400, 700] },
          { name: "Custom", src: "/fonts/custom.woff2", fallbacks: ["Arial"] }
        ]
      },
      resux as any
    );
    expect(plugins.length).toBeGreaterThan(0);
    const fontlessPlugin = plugins.find((p: any) => p.name === "vite-plugin-fontless");
    expect(fontlessPlugin).toBeDefined();
    expect(fontlessPlugin.devtools).toBeUndefined();
  });

  it("registers Vite plugin and populates head links simultaneously", () => {
    const plugins: any[] = [];
    const headList: any[] = [];
    const resux = {
      addVitePlugin(plugin: any) { plugins.push(plugin); },
      addHead(head: any) { headList.push(head); },
      extendRuntimeConfig() {}
    };
    fontsModule.setup(
      {
        google: [{ name: "Roboto", weights: [400] }]
      },
      resux as any
    );
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.some((p: any) => p.name === "vite-plugin-fontless")).toBe(true);
    expect(headList).toHaveLength(1);
    expect(headList[0].link.some((l: any) => l.href?.includes("family=Roboto"))).toBe(true);
  });
});
