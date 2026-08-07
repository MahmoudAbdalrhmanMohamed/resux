import { Window } from "happy-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useLazyPackage } from "../src/runtime/index.js";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalLocation = globalThis.location;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalDocument === undefined) {
    delete (globalThis as Record<string, unknown>).document;
  } else {
    globalThis.document = originalDocument;
  }
  if (originalLocation === undefined) {
    delete (globalThis as Record<string, unknown>).location;
  } else {
    globalThis.location = originalLocation;
  }
});

describe("lazy package runtime regressions", () => {
  it("removes failed package imports from the cache so a later call retries", async () => {
    const window = new Window({ url: "https://example.com/" });
    Object.assign(globalThis, {
      window,
      document: window.document,
      location: window.location,
    });

    let errorEvents = 0;
    window.addEventListener("resux:package:error", () => {
      errorEvents += 1;
    });

    const packageName = "resux-definitely-missing-audit-package";
    await expect(useLazyPackage(packageName, { mode: "clientOnly" })).rejects.toThrow();
    await expect(useLazyPackage(packageName, { mode: "clientOnly" })).rejects.toThrow();

    expect(errorEvents).toBe(2);
  });

  it("retries failed package CSS instead of marking it loaded forever", async () => {
    const window = new Window({ url: "https://example.com/" });
    Object.assign(globalThis, {
      window,
      document: window.document,
      location: window.location,
    });

    const options = {
      mode: "clientOnly" as const,
      css: ["resux-definitely-missing-audit-css"],
    };

    await expect(useLazyPackage("vue", options)).rejects.toThrow("Failed to load CSS entry");
    await expect(useLazyPackage("vue", options)).rejects.toThrow("Failed to load CSS entry");
  });
});
