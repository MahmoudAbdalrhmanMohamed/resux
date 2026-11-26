import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";
import { nextRuntimeImportQuery, waitForCondition } from "./helpers/runtime-fixtures.js";

describe("client resume loader: enhancements", () => {
  it("activates visible client enhancements immediately when the target is already visible", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-visible-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("swiper-carousel", async (target) => {
  target.setAttribute("data-enhanced", "true");
  return () => {
    target.setAttribute("data-cleaned", "true");
  };
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["swiper-carousel"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="slider" data-resux-enhancement="swiper-carousel" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("slider") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 500,
      bottom: 200,
      width: 500,
      height: 200,
      toJSON: () => "",
    }) as unknown as DOMRect;

    let observedCount = 0;
    class MockIntersectionObserver {
      constructor() {
        observedCount++;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    const lifecycleEvents: string[] = [];
    for (const eventName of ["found", "triggered", "loading", "ready", "cleanup-ready"]) {
      window.addEventListener(`resux:enhancement:${eventName}`, () => {
        lifecycleEvents.push(eventName);
      });
    }

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");

    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(observedCount).toBe(0);
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
    expect(lifecycleEvents).toEqual(expect.arrayContaining(["found", "triggered", "loading", "ready", "cleanup-ready"]));
  });

  it("supports enhancement alias attributes and executes cleanup disposers", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-alias-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("alias-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
  return () => {
    target.setAttribute("data-cleaned", "true");
  };
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["alias-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="alias-target" use-client-enhancement="alias-demo" data-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("alias-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 160,
      width: 400,
      height: 160,
      toJSON: () => "",
    }) as unknown as DOMRect;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    const runtimeModule = await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");
    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-rx-enhancement")).toBe("alias-demo");

    await runtimeModule.disposeClientEnhancements();
    expect(target.getAttribute("data-cleaned")).toBe("true");
  });

  it("activates visible enhancements after IntersectionObserver reports intersection", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-observed-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("observed-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["observed-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="observed-target" data-resux-enhancement="observed-demo" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("observed-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 1400,
      top: 1400,
      left: 0,
      right: 300,
      bottom: 1500,
      width: 300,
      height: 100,
      toJSON: () => "",
    }) as unknown as DOMRect;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => typeof observerCallback === "function");
    expect(target.getAttribute("data-enhanced")).toBeNull();
    expect(observerCallback).toBeTypeOf("function");

    observerCallback?.([{ target, isIntersecting: true, intersectionRatio: 1 }]);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");

    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("activates visible enhancements when visibility polling detects an already-visible element", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-visible-poll-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("poll-visible-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["poll-visible-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="poll-target" data-resux-enhancement="poll-visible-demo" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("poll-target") as HTMLElement;

    let isVisible = false;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: isVisible ? 0 : 1600,
      top: isVisible ? 0 : 1600,
      left: 0,
      right: 320,
      bottom: isVisible ? 120 : 1720,
      width: 320,
      height: 120,
      toJSON: () => "",
    }) as unknown as DOMRect;

    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    setTimeout(() => {
      isVisible = true;
    }, 300);

    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");
    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("supports immediate client enhancement trigger", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-immediate-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("immediate-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["immediate-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="immediate-target" data-resux-enhancement="immediate-demo" data-resux-trigger="immediate"></section>
      </div>
    `;
    const target = window.document.getElementById("immediate-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 2500,
      top: 2500,
      left: 0,
      right: 300,
      bottom: 2600,
      width: 300,
      height: 100,
      toJSON: () => "",
    }) as unknown as DOMRect;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");
    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("supports page-load client enhancement trigger after window load", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-page-load-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("page-load-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["page-load-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="page-load-target" data-resux-enhancement="page-load-demo" data-resux-trigger="page-load"></section>
      </div>
    `;
    const target = window.document.getElementById("page-load-target") as HTMLElement;

    Object.defineProperty(window.document, "readyState", {
      configurable: true,
      value: "interactive",
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "found");
    expect(target.getAttribute("data-enhanced")).toBeNull();

    window.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true");

    expect(target.getAttribute("data-enhanced")).toBe("true");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("passes parsed data-resux-options to client enhancements", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-options-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("options-demo", async (target, options) => {
  target.setAttribute("data-options-foo", String(options?.foo ?? ""));
  target.setAttribute("data-options-copy", String(options?.options?.foo ?? ""));
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["options-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section
          id="options-target"
          data-resux-enhancement="options-demo"
          data-resux-trigger="immediate"
          data-resux-options='{"foo":"bar"}'
        ></section>
      </div>
    `;
    const target = window.document.getElementById("options-target") as HTMLElement;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "active");

    expect(target.getAttribute("data-options-foo")).toBe("bar");
    expect(target.getAttribute("data-options-copy")).toBe("bar");
    expect(target.getAttribute("data-resux-options")).toBe('{"foo":"bar"}');
  });

  it("reports parse errors when data-resux-options contains invalid JSON", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-options-error-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("options-error-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["options-error-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section
          id="options-error-target"
          data-resux-enhancement="options-error-demo"
          data-resux-trigger="immediate"
          data-resux-options='{"foo":'
        ></section>
      </div>
    `;
    const target = window.document.getElementById("options-error-target") as HTMLElement;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "error");

    expect(target.getAttribute("data-enhanced")).toBeNull();
    expect(target.getAttribute("data-rx-enhancement-error")).toContain("Failed to parse options");
    expect(target.getAttribute("data-rx-enhancement-error")).toContain("data-resux-options");
  });

  it("marks missing client enhancements with friendly errors instead of staying pending", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-missing-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(manifestFile, "export const clientEnhancements = [];\n", "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="missing-target" data-resux-enhancement="missing-enhancement" data-resux-trigger="visible"></section>
      </div>
    `;
    const target = window.document.getElementById("missing-target") as HTMLElement;
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 120,
      width: 320,
      height: 120,
      toJSON: () => "",
    }) as unknown as DOMRect;

    let enhancementError = "";
    window.addEventListener("resux:enhancement:error", (event) => {
      enhancementError = String((event as CustomEvent).detail?.error ?? "");
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "error");

    expect(target.getAttribute("data-resux-enhancement-status")).toBe("error");
    expect(target.getAttribute("data-rx-enhancement-error")).toContain('Client enhancement "missing-enhancement" was used but not registered.');
    expect(target.getAttribute("data-rx-enhancement-error")).toContain("client-enhancements/missing-enhancement.client.ts");
    expect(enhancementError).toContain("missing-enhancement");
  });

  it("supports keyboard interaction trigger for client enhancements", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-interaction-keyboard-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("interaction-keyboard-demo", async (target) => {
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["interaction-keyboard-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section
          id="keyboard-target"
          tabindex="0"
          data-resux-enhancement="interaction-keyboard-demo"
          data-resux-trigger="interaction"
        ></section>
      </div>
    `;
    const target = window.document.getElementById("keyboard-target") as HTMLElement;

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "found");

    target.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "active");
    expect(target.getAttribute("data-resux-enhancement-status")).toBe("active");
  });

  it("emits package loading/loaded/css events when a client package enhancement resolves", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-package-events-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const packageFile = path.join(tempDir, "demo-package.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    const packageSpecifier = pathToFileURL(packageFile).href;
    await writeFile(
      runtimeFile,
      getClientRuntimeSource({
        packageRegistry: {
          importers: [packageSpecifier],
          declared: [packageSpecifier],
        },
      }),
      "utf8",
    );
    await writeFile(packageFile, "export const ready = true;\nexport default { ready };\n", "utf8");

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement, useClientPackage } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("package-events-demo", async (target) => {
  await useClientPackage(${JSON.stringify(packageSpecifier)}, {
    preferDefault: false,
    css: ["/assets/demo-package.css"]
  });
  target.setAttribute("data-enhanced", "true");
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["package-events-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="package-events-target" data-resux-enhancement="package-events-demo" data-resux-trigger="immediate"></section>
      </div>
    `;
    const target = window.document.getElementById("package-events-target") as HTMLElement;
    const packageEvents: string[] = [];
    const cssEntries: string[] = [];
    window.addEventListener("resux:package:loading", () => packageEvents.push("loading"));
    window.addEventListener("resux:package:loaded", () => packageEvents.push("loaded"));
    window.addEventListener("resux:package-css:loaded", (event) => {
      cssEntries.push(String((event as CustomEvent).detail?.entry ?? ""));
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-enhanced") === "true", 15000);

    expect(packageEvents).toEqual(expect.arrayContaining(["loading", "loaded"]));
    expect(cssEntries).toContain("/assets/demo-package.css");
  });

  it("emits package error events when a configured client package is missing from the generated registry", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-enhancement-package-error-events-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const pluginFile = path.join(tempDir, "enhancement.mjs");
    const manifestFile = path.join(tempDir, "client-enhancements.mjs");
    const missingPackage = "resux-missing-registry-package";
    await writeFile(
      runtimeFile,
      getClientRuntimeSource({
        packageRegistry: {
          declared: [missingPackage],
        },
      }),
      "utf8",
    );

    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
    await writeFile(
      pluginFile,
      `import { defineClientEnhancement, useClientPackage } from ${JSON.stringify(runtimeImportUrl)};
defineClientEnhancement("package-error-demo", async () => {
  await useClientPackage(${JSON.stringify(missingPackage)});
});
`,
      "utf8",
    );
    await writeFile(
      manifestFile,
      `import ${JSON.stringify(pathToFileURL(pluginFile).href)};
export const clientEnhancements = ["package-error-demo"];
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <section id="package-error-target" data-resux-enhancement="package-error-demo" data-resux-trigger="immediate"></section>
      </div>
    `;
    const target = window.document.getElementById("package-error-target") as HTMLElement;
    let packageErrorDetail = "";
    window.addEventListener("resux:package:error", (event) => {
      packageErrorDetail = String((event as CustomEvent).detail?.error ?? "");
    });

    (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__ = pathToFileURL(manifestFile).href;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-resux-enhancement-status") === "error");
    expect(packageErrorDetail).toContain(missingPackage);
    expect(packageErrorDetail).toContain("generated client registry");
  });
});
