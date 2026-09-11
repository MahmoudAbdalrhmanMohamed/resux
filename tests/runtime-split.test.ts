import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { scheduleBrowserEnhancement } from "../src/runtime/core.js";
import { isLocalClientNavigation, normalizeClientPath } from "../src/runtime/router.js";
import { ref, computed, isComputed } from "../src/runtime/reactivity.js";

interface LocalModuleSource {
  url: URL;
  source: string;
}

/** Reads the complete local ESM import/export closure for one TypeScript entrypoint. */
async function readLocalModuleClosure(entry: URL): Promise<LocalModuleSource[]> {
  const visited = new Set<string>();
  const modules: LocalModuleSource[] = [];

  /** Visits one local module once and follows its static and dynamic relative imports. */
  async function visit(url: URL): Promise<void> {
    if (visited.has(url.href)) return;
    visited.add(url.href);

    const source = await readFile(url, "utf8");
    modules.push({ url, source });

    const staticSpecifierPattern = /(?:from\s+|import\s*)["'](\.[^"']+)["']/g;
    const dynamicSpecifierPattern = /import\(\s*["'](\.[^"']+)["']\s*\)/g;
    const specifiers = [
      ...source.matchAll(staticSpecifierPattern),
      ...source.matchAll(dynamicSpecifierPattern),
    ]
      .map((match) => match[1])
      .filter((specifier): specifier is string => Boolean(specifier));

    for (const specifier of specifiers) {
      const sourceSpecifier = specifier.endsWith(".js")
        ? `${specifier.slice(0, -3)}.ts`
        : specifier;
      await visit(new URL(sourceSpecifier, url));
    }
  }

  await visit(entry);
  return modules;
}

describe("split browser runtime", () => {
  it("keeps lightweight entries independent from the monolithic runtime and optional features", async () => {
    const forbiddenModulePaths = [
      "/src/runtime/index.ts",
      "/src/i18n/",
      "/src/ui/",
      "/src/icons/",
      "/src/fonts/",
    ];

    for (const file of ["core.ts", "router.ts", "reactivity.ts"]) {
      const graph = await readLocalModuleClosure(new URL(`../src/runtime/${file}`, import.meta.url));
      const importedPaths = graph.map(({ url }) => url.pathname.replaceAll("\\", "/"));

      for (const forbiddenPath of forbiddenModulePaths) {
        expect(importedPaths.some((path) => path.includes(forbiddenPath))).toBe(false);
      }
    }
  });

  it("keeps navigation helpers small and origin-safe", () => {
    expect(isLocalClientNavigation("/docs", "https://resux.dev/docs/guide")).toBe(true);
    expect(isLocalClientNavigation("https://example.com", "https://resux.dev/docs/guide")).toBe(false);
    expect(isLocalClientNavigation("blob:https://resux.dev/id", "https://resux.dev/docs/guide")).toBe(false);
    expect(normalizeClientPath("/docs?q=1#api", "https://resux.dev/docs/guide")).toBe("/docs?q=1#api");
    expect(normalizeClientPath("#api", "https://resux.dev/docs/guide?q=1")).toBe("/docs/guide?q=1#api");
    expect(normalizeClientPath("?q=2", "https://resux.dev/docs/guide?q=1#old")).toBe("/docs/guide?q=2");
  });

  it("falls back to immediate activation when visibility observation is unavailable", async () => {
    const target = {
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Element;
    let activations = 0;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "IntersectionObserver");
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      scheduleBrowserEnhancement(target, () => {
        activations += 1;
      }, { trigger: "visible" });
      await Promise.resolve();
      expect(activations).toBe(1);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "IntersectionObserver", descriptor);
      else delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
    }
  });

  it("registers interaction activation in the capture phase", () => {
    const registrations: Array<{ type: string; options: AddEventListenerOptions | boolean | undefined }> = [];
    const target = {
      addEventListener(type: string, _listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) {
        registrations.push({ type, options });
      },
      removeEventListener() {},
    } as unknown as Element;

    const scheduled = scheduleBrowserEnhancement(target, () => {}, { trigger: "interaction" });
    expect(registrations).toHaveLength(3);
    expect(registrations.every(({ options }) => typeof options === "object" && options.capture === true)).toBe(true);
    scheduled.dispose();
  });

  it("does not register trigger resources for an already-aborted schedule", () => {
    const controller = new AbortController();
    controller.abort();
    let registrations = 0;
    let activations = 0;
    const target = {
      addEventListener() {
        registrations += 1;
      },
      removeEventListener() {},
    } as unknown as Element;

    const scheduled = scheduleBrowserEnhancement(target, () => {
      activations += 1;
    }, { trigger: "interaction", signal: controller.signal });

    scheduled.trigger();
    expect(registrations).toBe(0);
    expect(activations).toBe(0);
  });

  it("routes async activation failures through the scheduler error path", async () => {
    const target = {
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Element;
    const failure = new Error("activation failed");
    let reported: unknown;

    scheduleBrowserEnhancement(target, async () => {
      throw failure;
    }, {
      trigger: "immediate",
      onError(error) {
        reported = error;
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(reported).toBe(failure);
  });

  it("exposes reactivity without importing the full runtime", () => {
    const count = ref(2);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(4);
    expect(isComputed(doubled)).toBe(true);
  });
});
