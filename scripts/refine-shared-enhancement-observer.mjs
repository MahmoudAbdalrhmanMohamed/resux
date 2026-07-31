import { readFile, writeFile } from "node:fs/promises";

const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
let source = await readFile(runtimePath, "utf8");

function replaceOnce(input, before, after, label) {
  const index = input.indexOf(before);
  if (index < 0) {
    throw new Error(`Could not find ${label}`);
  }
  if (input.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Expected one ${label}, found multiple`);
  }
  return input.slice(0, index) + after + input.slice(index + before.length);
}

function replaceSection(input, startMarker, endMarker, replacement, label) {
  const start = input.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`Could not find start of ${label}`);
  }
  const end = input.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    throw new Error(`Could not find end of ${label}`);
  }
  return input.slice(0, start) + replacement + input.slice(end);
}

source = replaceOnce(
  source,
  "const resuxVisibleEnhancementCallbacks = new Map<Element, () => void>();",
  "const resuxVisibleEnhancementCallbacks = new Map<Element, Set<() => void>>();",
  "typed visible callback registry",
);

const typedHelpers = `function unobserveVisibleEnhancement(target: Element, callback?: () => void): void {
  const callbacks = resuxVisibleEnhancementCallbacks.get(target);
  if (!callbacks) {
    return;
  }
  if (callback) {
    callbacks.delete(callback);
  } else {
    callbacks.clear();
  }
  if (callbacks.size > 0) {
    return;
  }
  resuxVisibleEnhancementCallbacks.delete(target);
  resuxVisibleEnhancementObserver?.unobserve(target);
  releaseVisibleEnhancementResourcesIfIdle();
}

function ensureVisibleEnhancementResources(): void {
  if (!resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
          continue;
        }
        const callbacks = resuxVisibleEnhancementCallbacks.get(entry.target);
        if (!callbacks) {
          continue;
        }
        for (const activate of [...callbacks]) {
          activate();
        }
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, callbacks] of [...resuxVisibleEnhancementCallbacks]) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          for (const activate of [...callbacks]) {
            activate();
          }
        }
      }
    }, 200);
  }
}

function observeVisibleEnhancement(target: Element, activate: () => void): () => void {
  let settled = false;
  const run = () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
    if (target.isConnected) {
      activate();
    }
  };
  let callbacks = resuxVisibleEnhancementCallbacks.get(target);
  if (!callbacks) {
    callbacks = new Set<() => void>();
    resuxVisibleEnhancementCallbacks.set(target, callbacks);
    ensureVisibleEnhancementResources();
    resuxVisibleEnhancementObserver!.observe(target);
  }
  callbacks.add(run);
  return () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
  };
}
`;

source = replaceSection(
  source,
  "function unobserveVisibleEnhancement(target: Element, callback?: () => void): void {",
  "\nasync function ensureClientEnhancementManifestLoaded(): Promise<void> {",
  typedHelpers,
  "typed visible enhancement helpers",
);

const generatedHelpers = `function unobserveVisibleEnhancement(target, callback) {
  const callbacks = resuxVisibleEnhancementCallbacks.get(target);
  if (!callbacks) {
    return;
  }
  if (callback) {
    callbacks.delete(callback);
  } else {
    callbacks.clear();
  }
  if (callbacks.size > 0) {
    return;
  }
  resuxVisibleEnhancementCallbacks.delete(target);
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.unobserve(target);
  }
  releaseVisibleEnhancementResourcesIfIdle();
}

function ensureVisibleEnhancementResources() {
  if (!resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
          continue;
        }
        const callbacks = resuxVisibleEnhancementCallbacks.get(entry.target);
        if (!callbacks) {
          continue;
        }
        for (const activate of [...callbacks]) {
          activate();
        }
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, callbacks] of [...resuxVisibleEnhancementCallbacks]) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          for (const activate of [...callbacks]) {
            activate();
          }
        }
      }
    }, 200);
  }
}

function observeVisibleEnhancement(target, activate) {
  let settled = false;
  const run = () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
    if (target.isConnected) {
      activate();
    }
  };
  let callbacks = resuxVisibleEnhancementCallbacks.get(target);
  if (!callbacks) {
    callbacks = new Set();
    resuxVisibleEnhancementCallbacks.set(target, callbacks);
    ensureVisibleEnhancementResources();
    resuxVisibleEnhancementObserver.observe(target);
  }
  callbacks.add(run);
  return () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
  };
}
`;

source = replaceSection(
  source,
  "function unobserveVisibleEnhancement(target, callback) {",
  "\nasync function ensureClientEnhancementManifestLoaded() {",
  generatedHelpers,
  "generated visible enhancement helpers",
);

await writeFile(runtimePath, source, "utf8");
console.log("Refined shared visible enhancement observer for multiple callbacks per target.");
