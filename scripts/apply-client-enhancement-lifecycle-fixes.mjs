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

function transformSection(input, startMarker, endMarker, label, transform) {
  const start = input.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`Could not find start of ${label}`);
  }
  const end = input.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    throw new Error(`Could not find end of ${label}`);
  }
  const section = input.slice(start, end);
  const transformed = transform(section);
  if (transformed === section) {
    throw new Error(`${label} was not changed`);
  }
  return input.slice(0, start) + transformed + input.slice(end);
}

function replaceVisibleTrigger(section, replacement, label) {
  const startMarker = '  if (trigger === "visible") {';
  const start = section.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`Could not find visible trigger in ${label}`);
  }
  const end = section.indexOf("\n  fire();", start);
  if (end < 0) {
    throw new Error(`Could not find visible trigger end in ${label}`);
  }
  return section.slice(0, start) + replacement + section.slice(end);
}

const typedGlobalsBefore = `const resuxClientEnhancements = new Map<string, ClientEnhancementSetup>();
const resuxActiveEnhancementDisposers = new Set<() => void | Promise<void>>();
const resuxBoundEnhancementTargets = new WeakSet<Element>();`;
const typedGlobalsAfter = `const resuxClientEnhancements = new Map<string, ClientEnhancementSetup>();
const resuxActiveEnhancementDisposers = new Set<() => void | Promise<void>>();
const resuxScheduledEnhancementDisposers = new Set<() => void | Promise<void>>();
const resuxBoundEnhancementTargets = new WeakSet<Element>();
const resuxVisibleEnhancementCallbacks = new Map<Element, () => void>();
let resuxVisibleEnhancementObserver: IntersectionObserver | null = null;
let resuxVisibleEnhancementPollTimer = 0;`;
source = replaceOnce(source, typedGlobalsBefore, typedGlobalsAfter, "typed enhancement globals");

const generatedGlobalsBefore = `const resuxClientEnhancements = new Map();
const resuxActiveEnhancementDisposers = new Set();
const resuxBoundEnhancementTargets = new WeakSet();
const RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS = 5000;`;
const generatedGlobalsAfter = `const resuxClientEnhancements = new Map();
const resuxActiveEnhancementDisposers = new Set();
const resuxScheduledEnhancementDisposers = new Set();
const resuxBoundEnhancementTargets = new WeakSet();
const resuxVisibleEnhancementCallbacks = new Map();
let resuxVisibleEnhancementObserver = null;
let resuxVisibleEnhancementPollTimer = 0;
const RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS = 5000;`;
source = replaceOnce(source, generatedGlobalsBefore, generatedGlobalsAfter, "generated enhancement globals");

const typedVisibilityBefore = `function isElementProbablyVisible(target: Element): boolean {
  if (!isClientRuntime()) {
    return true;
  }
  const rect = target.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.top <= window.innerHeight;
}
`;
const typedVisibilityAfter = `${typedVisibilityBefore}
function releaseVisibleEnhancementResourcesIfIdle(): void {
  if (resuxVisibleEnhancementCallbacks.size > 0) {
    return;
  }
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}

function unobserveVisibleEnhancement(target: Element, callback?: () => void): void {
  if (callback && resuxVisibleEnhancementCallbacks.get(target) !== callback) {
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
        resuxVisibleEnhancementCallbacks.get(entry.target)?.();
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, activate] of [...resuxVisibleEnhancementCallbacks]) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target, activate);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          activate();
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
  resuxVisibleEnhancementCallbacks.set(target, run);
  ensureVisibleEnhancementResources();
  resuxVisibleEnhancementObserver!.observe(target);
  return () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
  };
}
`;
source = replaceOnce(source, typedVisibilityBefore, typedVisibilityAfter, "typed visibility helper");

const generatedVisibilityBefore = `function isElementProbablyVisible(target) {
  if (!isClientRuntime()) {
    return true;
  }
  const rect = target.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.top <= window.innerHeight;
}
`;
const generatedVisibilityAfter = `${generatedVisibilityBefore}
function releaseVisibleEnhancementResourcesIfIdle() {
  if (resuxVisibleEnhancementCallbacks.size > 0) {
    return;
  }
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}

function unobserveVisibleEnhancement(target, callback) {
  if (callback && resuxVisibleEnhancementCallbacks.get(target) !== callback) {
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
        const activate = resuxVisibleEnhancementCallbacks.get(entry.target);
        if (activate) {
          activate();
        }
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, activate] of [...resuxVisibleEnhancementCallbacks]) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target, activate);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          activate();
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
  resuxVisibleEnhancementCallbacks.set(target, run);
  ensureVisibleEnhancementResources();
  resuxVisibleEnhancementObserver.observe(target);
  return () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
  };
}
`;
source = replaceOnce(source, generatedVisibilityBefore, generatedVisibilityAfter, "generated visibility helper");

source = transformSection(
  source,
  "function scheduleEnhancementTrigger(\n  name: string,",
  "\nexport function defineClientEnhancement(",
  "typed trigger scheduler",
  (section) => replaceVisibleTrigger(section, `  if (trigger === "visible") {
    if (isElementProbablyVisible(target)) {
      fire();
      return () => {};
    }
    if (typeof IntersectionObserver !== "function") {
      fire();
      return () => {};
    }
    const cancel = observeVisibleEnhancement(target, fire);
    logEnhancementDebug(\`observing visible trigger \${name}\`);
    return cancel;
  }`, "typed trigger scheduler"),
);

source = transformSection(
  source,
  "function scheduleEnhancementTrigger(name, trigger, target, activate) {",
  "\nfunction defineClientEnhancement(name, setup) {",
  "generated trigger scheduler",
  (section) => replaceVisibleTrigger(section, `  if (trigger === "visible") {
    if (isElementProbablyVisible(target)) {
      fire();
      return () => {};
    }
    if (typeof IntersectionObserver !== "function") {
      fire();
      return () => {};
    }
    const cancel = observeVisibleEnhancement(target, fire);
    logEnhancementDebug("observing visible trigger " + name);
    return cancel;
  }`, "generated trigger scheduler"),
);

source = transformSection(
  source,
  "export async function useClientEnhancement(",
  "\nexport async function disposeClientEnhancements(): Promise<void> {",
  "typed enhancement lifecycle",
  (section) => {
    section = replaceOnce(
      section,
      `  const trigger = options.trigger ?? "manual";
  let idleWarningTimer = 0;
  if (trigger !== "manual") {`,
      `  const trigger = options.trigger ?? "manual";
  let idleWarningTimer = 0;
  const shouldWarnIfIdle = trigger === "immediate" || trigger === "idle";
  if (shouldWarnIfIdle) {`,
      "typed idle warning gate",
    );
    section = replaceOnce(
      section,
      `      teardown = await setup(target, setupPayload);
      setEnhancementStatus(target, "active");`,
      `      teardown = await setup(target, setupPayload);
      if (disposed) {
        if (typeof teardown === "function") {
          await teardown();
        }
        teardown = undefined;
        return;
      }
      setEnhancementStatus(target, "active");`,
      "typed async setup disposal guard",
    );
    section = replaceOnce(
      section,
      `    disposed = true;
    if (idleWarningTimer) {`,
      `    disposed = true;
    resuxScheduledEnhancementDisposers.delete(dispose);
    resuxBoundEnhancementTargets.delete(target);
    target.removeAttribute("data-rx-enhancement-bound");
    if (idleWarningTimer) {`,
      "typed disposer registration cleanup",
    );
    section = replaceOnce(
      section,
      `  };

  return {
    ready: activated,`,
      `  };

  resuxScheduledEnhancementDisposers.add(dispose);

  return {
    ready: activated,`,
      "typed disposer registration",
    );
    return section;
  },
);

source = transformSection(
  source,
  "async function useClientEnhancement(name, options = {}) {",
  "\nexport {\n  useLazyPackage,",
  "generated enhancement lifecycle",
  (section) => {
    section = replaceOnce(
      section,
      `  const trigger = options.trigger || "manual";
  let idleWarningTimer = 0;

  if (trigger !== "manual") {`,
      `  const trigger = options.trigger || "manual";
  let idleWarningTimer = 0;
  const shouldWarnIfIdle = trigger === "immediate" || trigger === "idle";

  if (shouldWarnIfIdle) {`,
      "generated idle warning gate",
    );
    section = replaceOnce(
      section,
      `      teardown = await setup(target, setupPayload);
      setEnhancementStatus(target, "active");`,
      `      teardown = await setup(target, setupPayload);
      if (disposed) {
        if (typeof teardown === "function") {
          await teardown();
        }
        teardown = undefined;
        return;
      }
      setEnhancementStatus(target, "active");`,
      "generated async setup disposal guard",
    );
    section = replaceOnce(
      section,
      `    disposed = true;
    if (idleWarningTimer) {`,
      `    disposed = true;
    resuxScheduledEnhancementDisposers.delete(dispose);
    resuxBoundEnhancementTargets.delete(target);
    target.removeAttribute("data-rx-enhancement-bound");
    if (idleWarningTimer) {`,
      "generated disposer registration cleanup",
    );
    section = replaceOnce(
      section,
      `  };

  return {
    ready: activated,`,
      `  };

  resuxScheduledEnhancementDisposers.add(dispose);

  return {
    ready: activated,`,
      "generated disposer registration",
    );
    return section;
  },
);

const typedDisposeStart = "export async function disposeClientEnhancements(): Promise<void> {";
const typedDisposeEnd = "\nexport function hasClientEnhancement(name: string): boolean {";
source = transformSection(source, typedDisposeStart, typedDisposeEnd, "typed global enhancement disposal", () => `${typedDisposeStart}
  const scheduledDisposers = [...resuxScheduledEnhancementDisposers];
  resuxScheduledEnhancementDisposers.clear();
  for (const dispose of scheduledDisposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  resuxVisibleEnhancementCallbacks.clear();
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}
`);

const generatedDisposeStart = "async function disposeClientEnhancements() {";
const generatedDisposeEnd = "\nfunction hasClientEnhancement(name) {";
source = transformSection(source, generatedDisposeStart, generatedDisposeEnd, "generated global enhancement disposal", () => `${generatedDisposeStart}
  const scheduledDisposers = [...resuxScheduledEnhancementDisposers];
  resuxScheduledEnhancementDisposers.clear();
  for (const dispose of scheduledDisposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  resuxVisibleEnhancementCallbacks.clear();
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}
`);

source = transformSection(
  source,
  "async function activateDeclaredClientEnhancements(root: ParentNode = document): Promise<void> {",
  "\nfunction uniqueArray<T>(items: T[]): T[] {",
  "typed enhancement scan",
  (section) => {
    section = replaceOnce(
      section,
      `  logEnhancementDebug("scanning DOM");
  const elements = root.querySelectorAll("[data-resux-enhancement], [use-client-enhancement]");
  for (const element of elements) {`,
      `  logEnhancementDebug("scanning DOM");
  const selector = "[data-resux-enhancement], [use-client-enhancement]";
  const elements: Element[] = [];
  const rootElement = root as Element;
  if (typeof rootElement.matches === "function" && rootElement.matches(selector)) {
    elements.push(rootElement);
  }
  elements.push(...Array.from(root.querySelectorAll(selector)));
  for (const element of elements) {`,
      "typed root-aware scan",
    );
    section = replaceOnce(
      section,
      `    } catch (error) {
      const message = getEnhancementErrorMessage(error);`,
      `    } catch (error) {
      resuxBoundEnhancementTargets.delete(element);
      element.removeAttribute("data-rx-enhancement-bound");
      const message = getEnhancementErrorMessage(error);`,
      "typed failed binding reset",
    );
    return section;
  },
);

source = transformSection(
  source,
  "async function activateDeclaredClientEnhancements(root = document) {",
  "\nfunction uniqueArray(items) {",
  "generated enhancement scan",
  (section) => {
    section = replaceOnce(
      section,
      `  logEnhancementDebug("scanning DOM");
  const elements = root.querySelectorAll("[data-resux-enhancement], [use-client-enhancement]");
  for (const element of elements) {`,
      `  logEnhancementDebug("scanning DOM");
  const selector = "[data-resux-enhancement], [use-client-enhancement]";
  const elements = [];
  if (typeof root.matches === "function" && root.matches(selector)) {
    elements.push(root);
  }
  elements.push(...Array.from(root.querySelectorAll(selector)));
  for (const element of elements) {`,
      "generated root-aware scan",
    );
    section = replaceOnce(
      section,
      `    } catch (error) {
      const message = getEnhancementErrorMessage(error);`,
      `    } catch (error) {
      resuxBoundEnhancementTargets.delete(element);
      element.removeAttribute("data-rx-enhancement-bound");
      const message = getEnhancementErrorMessage(error);`,
      "generated failed binding reset",
    );
    return section;
  },
);

await writeFile(runtimePath, source, "utf8");
console.log("Applied client enhancement lifecycle performance fixes.");
