import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { afterEach, describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";
import { installTestWindow } from "./helpers/install-test-window";

let importCounter = 0;
let restoreGlobals: (() => void) | undefined;

afterEach(() => {
  restoreGlobals?.();
  restoreGlobals = undefined;
});

function nextImportQuery(): string {
  importCounter += 1;
  return `${Date.now()}-${importCounter}`;
}

async function createRuntimeWithEnhancements() {
  const tempDir = path.join(os.tmpdir(), `resux-shared-target-${Date.now()}-${importCounter}`);
  await mkdir(tempDir, { recursive: true });
  const runtimeFile = path.join(tempDir, "runtime-client.mjs");
  const firstPluginFile = path.join(tempDir, "first.mjs");
  const secondPluginFile = path.join(tempDir, "second.mjs");
  const manifestFile = path.join(tempDir, "client-enhancements.mjs");
  await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

  const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextImportQuery()}`;
  await writeFile(
    firstPluginFile,
    `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};\ndefineClientEnhancement("first-visible", async (target) => { target.setAttribute("data-first-enhanced", "true"); });\n`,
    "utf8",
  );
  await writeFile(
    secondPluginFile,
    `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};\ndefineClientEnhancement("second-visible", async (target) => { target.setAttribute("data-second-enhanced", "true"); });\n`,
    "utf8",
  );
  await writeFile(
    manifestFile,
    `import ${JSON.stringify(pathToFileURL(firstPluginFile).href)};\nimport ${JSON.stringify(pathToFileURL(secondPluginFile).href)};\nexport const clientEnhancements = ["first-visible", "second-visible"];\n`,
    "utf8",
  );

  return {
    runtimeImportUrl,
    manifestUrl: pathToFileURL(manifestFile).href,
  };
}

async function waitForCondition(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for shared-target enhancement condition.");
}

function offscreenRect(): DOMRect {
  return {
    x: 0,
    y: 1800,
    top: 1800,
    left: 0,
    right: 320,
    bottom: 1920,
    width: 320,
    height: 120,
    toJSON: () => "",
  } as unknown as DOMRect;
}

describe("shared visible enhancement targets", () => {
  it("activates every pending enhancement registered on the same element", async () => {
    const runtime = await createRuntimeWithEnhancements();
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<section id="shared"></section>';
    const target = window.document.getElementById("shared") as HTMLElement;
    target.getBoundingClientRect = () => offscreenRect();

    let observerInstances = 0;
    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    const observed = new Set<Element>();
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerInstances += 1;
        observerCallback = callback;
      }
      observe(element: Element) {
        observed.add(element);
      }
      unobserve(element: Element) {
        observed.delete(element);
      }
      disconnect() {
        observed.clear();
      }
    }

    restoreGlobals = installTestWindow(window, runtime.manifestUrl, { IntersectionObserver: MockIntersectionObserver });
    const runtimeModule = await import(runtime.runtimeImportUrl);

    await runtimeModule.useClientEnhancement("first-visible", { target, trigger: "visible" });
    await runtimeModule.useClientEnhancement("second-visible", { target, trigger: "visible" });

    expect(observerInstances).toBe(1);
    expect(observed.size).toBe(1);

    observerCallback?.([{ target, isIntersecting: true, intersectionRatio: 1 }]);
    await waitForCondition(() => (
      target.dataset.firstEnhanced === "true"
      && target.dataset.secondEnhanced === "true"
    ));

    expect(target.dataset.firstEnhanced).toBe("true");
    expect(target.dataset.secondEnhanced).toBe("true");
    await runtimeModule.disposeClientEnhancements();
  });
});
