import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { afterEach, describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";
import { installTestWindow } from "./helpers/install-test-window";

let runtimeImportCounter = 0;
let restoreGlobals: (() => void) | undefined;

afterEach(() => {
  restoreGlobals?.();
  restoreGlobals = undefined;
});

function nextRuntimeImportQuery(): string {
  runtimeImportCounter += 1;
  return `${Date.now()}-${runtimeImportCounter}`;
}

async function createEnhancementRuntime(name: string, setupBody: string) {
  const tempDir = path.join(os.tmpdir(), `resux-enhancement-lifecycle-${name}-${Date.now()}-${runtimeImportCounter}`);
  await mkdir(tempDir, { recursive: true });
  const runtimeFile = path.join(tempDir, "runtime-client.mjs");
  const pluginFile = path.join(tempDir, "enhancement.mjs");
  const manifestFile = path.join(tempDir, "client-enhancements.mjs");
  await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

  const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;
  await writeFile(
    pluginFile,
    `import { defineClientEnhancement } from ${JSON.stringify(runtimeImportUrl)};\ndefineClientEnhancement(${JSON.stringify(name)}, async (target, options) => {\n${setupBody}\n});\n`,
    "utf8",
  );
  await writeFile(
    manifestFile,
    `import ${JSON.stringify(pathToFileURL(pluginFile).href)};\nexport const clientEnhancements = [${JSON.stringify(name)}];\n`,
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
  throw new Error("Timed out waiting for enhancement lifecycle condition.");
}

function offscreenRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: 320,
    bottom: top + 120,
    width: 320,
    height: 120,
    toJSON: () => "",
  } as unknown as DOMRect;
}

describe("client enhancement lifecycle performance", () => {
  it("shares one visibility observer across pending enhancements", async () => {
    const runtime = await createEnhancementRuntime(
      "shared-visible",
      '  target.setAttribute("data-enhanced", "true");',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <main>
        <section id="first" data-resux-enhancement="shared-visible" data-resux-trigger="visible"></section>
        <section id="second" data-resux-enhancement="shared-visible" data-resux-trigger="visible"></section>
      </main>
    `;

    const first = window.document.getElementById("first") as HTMLElement;
    const second = window.document.getElementById("second") as HTMLElement;
    first.getBoundingClientRect = () => offscreenRect(1800);
    second.getBoundingClientRect = () => offscreenRect(2200);

    let observerInstances = 0;
    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    const observed = new Set<Element>();
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerInstances += 1;
        observerCallback = callback;
      }
      observe(target: Element) {
        observed.add(target);
      }
      unobserve(target: Element) {
        observed.delete(target);
      }
      disconnect() {
        observed.clear();
      }
    }

    restoreGlobals = installTestWindow(window, runtime.manifestUrl, { IntersectionObserver: MockIntersectionObserver });
    const runtimeModule = await import(runtime.runtimeImportUrl);

    await waitForCondition(() => observed.size === 2);
    expect(observerInstances).toBe(1);

    observerCallback?.([
      { target: first, isIntersecting: true, intersectionRatio: 1 },
      { target: second, isIntersecting: true, intersectionRatio: 1 },
    ]);
    await waitForCondition(() => first.dataset.enhanced === "true" && second.dataset.enhanced === "true");

    expect(first.dataset.enhanced).toBe("true");
    expect(second.dataset.enhanced).toBe("true");
    await runtimeModule.disposeClientEnhancements();
  });

  it("cancels pending interaction triggers during global cleanup", async () => {
    const runtime = await createEnhancementRuntime(
      "pending-interaction",
      '  target.setAttribute("data-enhanced", "true");',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <button id="pending" data-resux-enhancement="pending-interaction" data-resux-trigger="interaction">Run</button>
    `;
    const target = window.document.getElementById("pending") as HTMLButtonElement;

    restoreGlobals = installTestWindow(window, runtime.manifestUrl);
    const runtimeModule = await import(runtime.runtimeImportUrl);
    await waitForCondition(() => target.getAttribute("data-rx-enhancement-bound") === "true");

    await runtimeModule.disposeClientEnhancements();
    target.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(target.getAttribute("data-enhanced")).toBeNull();
    expect(target.getAttribute("data-rx-enhancement-bound")).toBeNull();
  });

  it("scans the supplied root element itself", async () => {
    const runtime = await createEnhancementRuntime(
      "root-element",
      '  target.setAttribute("data-enhanced", String(options?.marker ?? "true"));',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = "<main id=\"app\"></main>";

    restoreGlobals = installTestWindow(window, runtime.manifestUrl);
    const runtimeModule = await import(runtime.runtimeImportUrl);

    const root = window.document.createElement("section");
    root.setAttribute("data-resux-enhancement", "root-element");
    root.setAttribute("data-resux-trigger", "immediate");
    root.setAttribute("data-resux-options", '{"marker":"root"}');
    window.document.getElementById("app")!.appendChild(root);

    await runtimeModule.scanClientEnhancements(root);
    await waitForCondition(() => root.getAttribute("data-enhanced") === "root");

    expect(root.getAttribute("data-enhanced")).toBe("root");
    expect(root.dataset.rxEnhancementBound).toBe("true");
    await runtimeModule.disposeClientEnhancements();
    expect(root.dataset.rxEnhancementBound).toBeUndefined();
  });
});
