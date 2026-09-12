import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { scheduleBrowserEnhancement } from "../src/runtime/core.js";
import {
  isLocalClientNavigation,
  navigateClient,
  normalizeClientPath,
} from "../src/runtime/router.js";
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

  it("blocks executable URL schemes before full-page navigation", () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const assigned: string[] = [];
    const replaced: string[] = [];
    const fakeWindow = {
      location: {
        href: "https://resux.dev/docs/guide",
        assign(to: string) {
          assigned.push(to);
        },
        replace(to: string) {
          replaced.push(to);
        },
      },
      history: {
        pushState() {},
        replaceState() {},
      },
      dispatchEvent() {
        return true;
      },
    } as unknown as Window;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: fakeWindow,
    });

    try {
      navigateClient("javascript:alert(document.domain)");
      navigateClient("javascript:alert(document.domain)", { replace: true });
      expect(assigned).toEqual([]);
      expect(replaced).toEqual([]);
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
      else delete (globalThis as { window?: unknown }).window;
    }
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

  it("supports hover intent without eagerly activating enhancements", () => {
    const registrations: Array<{ type: string; listener: EventListener }> = [];
    const target = {
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (typeof listener === "function") registrations.push({ type, listener });
      },
      removeEventListener() {},
    } as unknown as Element;
    let activations = 0;

    const scheduled = scheduleBrowserEnhancement(target, () => {
      activations += 1;
    }, { trigger: "hover" });

    expect(registrations.map(({ type }) => type)).toEqual(["pointerenter", "focusin"]);
    expect(activations).toBe(0);
    registrations[0]?.listener({} as Event);
    expect(activations).toBe(1);
    registrations[1]?.listener({} as Event);
    expect(activations).toBe(1);
    scheduled.dispose();
  });

  it("supports timer activation and validates timer delays", () => {
    vi.useFakeTimers();
    try {
      const target = {
        addEventListener() {},
        removeEventListener() {},
      } as unknown as Element;
      let activations = 0;

      scheduleBrowserEnhancement(target, () => {
        activations += 1;
      }, { trigger: "timer", timerMs: 50 });

      vi.advanceTimersByTime(49);
      expect(activations).toBe(0);
      vi.advanceTimersByTime(1);
      expect(activations).toBe(1);

      expect(() => scheduleBrowserEnhancement(target, () => {}, {
        trigger: "timer",
        timerMs: -1,
      })).toThrow("timerMs must be a finite non-negative number");
      expect(() => scheduleBrowserEnhancement(target, () => {}, {
        trigger: "timer",
        timerMs: 2_147_483_648,
      })).toThrow("timerMs must be a finite non-negative number no greater than 2147483647");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the configured idle timeout when requestIdleCallback is unavailable", () => {
    vi.useFakeTimers();
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    let scheduledDelay: number | undefined;
    const fakeWindow = {
      setTimeout(callback: () => void, delay?: number) {
        scheduledDelay = delay;
        return globalThis.setTimeout(callback, delay) as unknown as number;
      },
      clearTimeout(id: number) {
        globalThis.clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
      },
    } as unknown as Window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: fakeWindow,
    });
    const target = {
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Element;
    let activations = 0;

    try {
      scheduleBrowserEnhancement(target, () => {
        activations += 1;
      }, { trigger: "idle", idleTimeoutMs: 75 });

      expect(scheduledDelay).toBe(75);
      vi.advanceTimersByTime(74);
      expect(activations).toBe(0);
      vi.advanceTimersByTime(1);
      expect(activations).toBe(1);
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
      else delete (globalThis as { window?: unknown }).window;
      vi.useRealTimers();
    }
  });

  it("activates media-query enhancements only after the query matches", () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;
    let removed = 0;
    const media = {
      matches: false,
      media: "(min-width: 60rem)",
      onchange: null,
      addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
        mediaListener = listener;
      },
      removeEventListener() {
        removed += 1;
      },
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return true;
      },
    } as unknown as MediaQueryList;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: { matchMedia: () => media },
    });
    const target = {
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Element;
    let activations = 0;

    try {
      scheduleBrowserEnhancement(target, () => {
        activations += 1;
      }, { trigger: "media-query", mediaQuery: "(min-width: 60rem)" });

      expect(activations).toBe(0);
      mediaListener?.({ matches: true } as MediaQueryListEvent);
      expect(activations).toBe(1);
      expect(removed).toBe(1);
      mediaListener?.({ matches: true } as MediaQueryListEvent);
      expect(activations).toBe(1);
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it("validates media-query configuration before registering resources", () => {
    const target = {
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Element;
    let abortRegistrations = 0;
    const signal = {
      aborted: false,
      addEventListener() {
        abortRegistrations += 1;
      },
      removeEventListener() {},
    } as unknown as AbortSignal;

    expect(() => scheduleBrowserEnhancement(target, () => {}, {
      trigger: "media-query",
      signal,
    })).toThrow("mediaQuery must be provided for the media-query trigger");
    expect(abortRegistrations).toBe(0);
  });

  it("keeps never-triggered enhancements permanently static", () => {
    const target = {
      addEventListener() {
        throw new Error("never must not register listeners");
      },
      removeEventListener() {},
    } as unknown as Element;
    let activations = 0;

    const scheduled = scheduleBrowserEnhancement(target, () => {
      activations += 1;
    }, { trigger: "never" });

    scheduled.trigger();
    expect(activations).toBe(0);
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
