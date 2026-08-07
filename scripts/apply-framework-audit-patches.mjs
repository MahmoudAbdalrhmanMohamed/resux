import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) {
    throw new Error(`Patch target not found: ${label}`);
  }
  if (source.indexOf(search, first + search.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceCount(source, search, replacement, expected, label) {
  const count = source.split(search).length - 1;
  if (count !== expected) {
    throw new Error(`Patch target count mismatch for ${label}: expected ${expected}, found ${count}`);
  }
  return source.split(search).join(replacement);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Patch regex count mismatch for ${label}: expected 1, found ${matches.length}`);
  }
  return source.replace(pattern, replacement);
}

async function patchRuntime() {
  const file = path.join(root, "src/runtime/index.ts");
  let source = await readFile(file, "utf8");

  source = replaceRegexOnce(
    source,
    /type ComponentProps = Record<string, unknown>;\nlet activeResuxApp: ResuxAppLike \| null = null;\nconst activeResuxError = ref<ResuxError \| null>\(null\);\n\nasync function withActiveResuxApp<T>\(resuxApp: ResuxAppLike, run: \(\) => Promise<T> \| T\): Promise<T> \{[\s\S]*?\n\}\n\nexport function defineComponent/g,
    `type ComponentProps = Record<string, unknown>;
type ResuxAsyncContextStorage = {
  getStore(): ResuxAppLike | undefined;
  run<T>(store: ResuxAppLike, callback: () => T): T;
};

let activeResuxApp: ResuxAppLike | null = null;
const fallbackResuxError = ref<ResuxError | null>(null);
const resuxErrorByApp = new WeakMap<ResuxAppLike, Ref<ResuxError | null>>();
const resuxAsyncContextStorage = createResuxAsyncContextStorage();

function createResuxAsyncContextStorage(): ResuxAsyncContextStorage | null {
  const maybeProcess = typeof process !== "undefined"
    ? process as typeof process & { getBuiltinModule?: (id: string) => unknown }
    : undefined;
  const getBuiltinModule = maybeProcess?.getBuiltinModule;
  if (typeof getBuiltinModule !== "function") {
    return null;
  }

  try {
    const asyncHooks = getBuiltinModule.call(maybeProcess, "node:async_hooks") as {
      AsyncLocalStorage?: new () => ResuxAsyncContextStorage;
    } | undefined;
    const AsyncLocalStorage = asyncHooks?.AsyncLocalStorage;
    return AsyncLocalStorage ? new AsyncLocalStorage() : null;
  } catch {
    return null;
  }
}

function readActiveResuxApp(): ResuxAppLike | null {
  return resuxAsyncContextStorage?.getStore()
    ?? activeResuxApp
    ?? (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__
    ?? null;
}

function readActiveResuxError(): Ref<ResuxError | null> {
  const app = readActiveResuxApp();
  if (!app) {
    return fallbackResuxError;
  }
  const existing = resuxErrorByApp.get(app);
  if (existing) {
    return existing;
  }
  const errorRef = ref<ResuxError | null>(null);
  resuxErrorByApp.set(app, errorRef);
  return errorRef;
}

async function withActiveResuxApp<T>(resuxApp: ResuxAppLike, run: () => Promise<T> | T): Promise<T> {
  if (resuxAsyncContextStorage) {
    return await resuxAsyncContextStorage.run(resuxApp, () => Promise.resolve(run()));
  }

  const previous = activeResuxApp;
  activeResuxApp = resuxApp;
  const previousGlobal = (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__;
  (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__ = resuxApp;
  try {
    return await run();
  } finally {
    activeResuxApp = previous;
    (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__ = previousGlobal;
  }
}

export function defineComponent`,
    "request-local Resux app context",
  );

  source = replaceRegexOnce(
    source,
    /export function useResuxApp\(\): ResuxAppLike \{[\s\S]*?\n\}\n\nexport interface DeviceInfo/g,
    `export function useResuxApp(): ResuxAppLike {
  const app = readActiveResuxApp();
  if (app) {
    return app;
  }

  console.error("useResuxApp error trace:");
  console.trace();

  throw new Error("useResuxApp() is only available while executing a Resux setup or middleware context.");
}

export interface DeviceInfo`,
    "request-local useResuxApp",
  );

  source = replaceOnce(
    source,
    `export function useDevice(): DeviceInfo {
  const app = activeResuxApp || (globalThis as any).__RESUX_APP__;
  const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return parseUserAgent(ua);
}`,
    `export function useDevice(): DeviceInfo {
  const app = readActiveResuxApp();
  const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return parseUserAgent(ua);
}`,
    "request-local useDevice",
  );

  source = replaceOnce(
    source,
    `export function useError(): Ref<ResuxError | null> {
  return activeResuxError;
}

export function showError(input: string | Partial<ResuxError>): never {
  const error = createError(input);
  activeResuxError.value = error;
  dispatchRuntimeErrorEvent("resux:app-error", error);
  throw error;
}

export function clearError(): void {
  activeResuxError.value = null;
  dispatchRuntimeErrorEvent("resux:app-error-cleared", null);
}`,
    `export function useError(): Ref<ResuxError | null> {
  return readActiveResuxError();
}

export function showError(input: string | Partial<ResuxError>): never {
  const error = createError(input);
  readActiveResuxError().value = error;
  dispatchRuntimeErrorEvent("resux:app-error", error);
  throw error;
}

export function clearError(): void {
  readActiveResuxError().value = null;
  dispatchRuntimeErrorEvent("resux:app-error-cleared", null);
}`,
    "request-local useError",
  );

  source = replaceOnce(
    source,
    `    return renderTemplateNodes(definition.template, {
      scope,
      scopeId,
      moduleId: definition.id,
      styleScopeId: definition.styleScopeId,
      route: this.route,
      runtimeConfig: this.runtimeConfig,
      components: this.components,
      layouts: {},
      pageMeta: definition.meta ?? {},
      addHeadEntry: (entry) => insertHeadEntryWithPriority(this.headEntries, entry),
      renderPage,
      renderSlot
    });`,
    `    return withActiveResuxApp(this.resuxApp, () => renderTemplateNodes(definition.template, {
      scope,
      scopeId,
      moduleId: definition.id,
      styleScopeId: definition.styleScopeId,
      route: this.route,
      runtimeConfig: this.runtimeConfig,
      components: this.components,
      layouts: {},
      pageMeta: definition.meta ?? {},
      addHeadEntry: (entry) => insertHeadEntryWithPriority(this.headEntries, entry),
      renderPage,
      renderSlot
    }));`,
    "request-local template rendering",
  );

  source = replaceOnce(
    source,
    `function setRegistryValue<T>(registry: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

export function createServerSetupContext`,
    `function setRegistryValue<T>(registry: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function createFetchAsyncDataKey(url: string, init?: RequestInit): string {
  return \`fetch:\${hashFetchIdentity(serializeFetchRequestIdentity(url, init))}\`;
}

function serializeFetchRequestIdentity(url: string, init?: RequestInit): string {
  const headers: Array<[string, string]> = [];
  if (typeof Headers !== "undefined") {
    try {
      new Headers(init?.headers).forEach((value, key) => headers.push([key, value]));
      headers.sort(([left], [right]) => left.localeCompare(right));
    } catch {
      // Invalid headers will be reported by fetch itself; keep the cache key deterministic.
    }
  }
  const extended = (init ?? {}) as RequestInit & { duplex?: string; priority?: string };
  return JSON.stringify({
    url,
    method: String(init?.method ?? "GET").toUpperCase(),
    headers,
    body: serializeFetchRequestBody(init?.body),
    cache: init?.cache ?? "",
    credentials: init?.credentials ?? "",
    integrity: init?.integrity ?? "",
    keepalive: init?.keepalive ?? false,
    mode: init?.mode ?? "",
    redirect: init?.redirect ?? "",
    referrer: init?.referrer ?? "",
    referrerPolicy: init?.referrerPolicy ?? "",
    duplex: extended.duplex ?? "",
    priority: extended.priority ?? ""
  });
}

function serializeFetchRequestBody(body: BodyInit | null | undefined): unknown {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return ["string", body];
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return ["url-search-params", body.toString()];
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return ["form-data", ...Array.from(body.entries()).map(([key, value]) => [
      key,
      typeof value === "string"
        ? ["string", value]
        : ["file", value.name, value.size, value.type, value.lastModified]
    ])];
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    const file = body as Blob & { name?: string; lastModified?: number };
    return ["blob", file.name ?? "", body.size, body.type, file.lastModified ?? 0];
  }
  if (body instanceof ArrayBuffer) {
    return ["array-buffer", ...new Uint8Array(body)];
  }
  if (ArrayBuffer.isView(body)) {
    return ["array-buffer-view", ...new Uint8Array(body.buffer, body.byteOffset, body.byteLength)];
  }
  return ["body", Object.prototype.toString.call(body)];
}

function hashFetchIdentity(value: string): string {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
}

export function createServerSetupContext`,
    "request-aware useFetch key helpers",
  );

  source = replaceOnce(
    source,
    `    useFetch<T>(url: string, init?: RequestInit): AsyncDataResource<T> {
      const key = \`fetch:\${url}\`;
      if (hasOwnRegistryKey(asyncDataRefs, key)) {`,
    `    useFetch<T>(url: string, init?: RequestInit): AsyncDataResource<T> {
      const key = createFetchAsyncDataKey(url, init);
      if (hasOwnRegistryKey(asyncDataRefs, key)) {`,
    "server useFetch request identity",
  );

  source = replaceOnce(
    source,
    `    useDevice(): DeviceInfo {
      return useDevice();
    },
    $device: useDevice(),`,
    `    useDevice(): DeviceInfo {
      return parseUserAgent(route.userAgent);
    },
    $device: parseUserAgent(route.userAgent),`,
    "server setup device isolation",
  );

  source = replaceOnce(
    source,
    `  (globalThis as any).$t = ctx.$t;
  (globalThis as any).$tm = ctx.$tm;`,
    `  (globalThis as any).$t = (key: string, params?: Record<string, unknown>): string => {
    const app = useResuxApp();
    const normalizedI18n = normalizeI18nRuntimeConfig(app.$config.public?.i18n);
    if (!normalizedI18n) return key;
    const locale = resolveI18nRoute(app.route.path, normalizedI18n).locale.code;
    return translateText(normalizedI18n, locale, key, params as any);
  };
  (globalThis as any).$tm = (key: string): unknown => {
    const app = useResuxApp();
    const normalizedI18n = normalizeI18nRuntimeConfig(app.$config.public?.i18n);
    if (!normalizedI18n) return key;
    const locale = resolveI18nRoute(app.route.path, normalizedI18n).locale.code;
    return translateRaw(normalizedI18n, locale, key);
  };`,
    "request-local server translation globals",
  );

  source = replaceOnce(
    source,
    `function __rxIsObject(value) {
  return value !== null && typeof value === "object";
}`,
    `const __rxIterateKey = Symbol("iterate");

function __rxIsObject(value) {
  return value !== null && typeof value === "object";
}`,
    "generated iteration dependency key",
  );

  source = replaceRegexOnce(
    source,
    /function __rxQueueJob\(job\) \{[\s\S]*?\n\}\n\nfunction nextTick/g,
    `function __rxQueueJob(job) {
  __rxQueue.add(job);
  if (__rxFlushing) {
    return;
  }
  __rxFlushing = true;
  __rxFlushPromise = __rxResolvedPromise.then(__rxFlushJobs);
}

function __rxFlushJobs() {
  let didError = false;
  let firstError;
  const executionCounts = new Map();
  try {
    while (__rxQueue.size > 0) {
      const currentQueue = [...__rxQueue];
      __rxQueue.clear();
      for (const job of currentQueue) {
        const count = executionCounts.get(job) || 0;
        if (count >= 100) {
          if (!didError) {
            didError = true;
            firstError = new Error("Resux scheduler stopped a recursively queued job after 100 executions.");
          }
          continue;
        }
        executionCounts.set(job, count + 1);
        try {
          job();
        } catch (error) {
          if (!didError) {
            didError = true;
            firstError = error;
          }
        }
      }
    }
  } finally {
    __rxFlushing = false;
    __rxFlushPromise = null;
  }
  if (didError) {
    throw firstError;
  }
}

function nextTick`,
    "generated scheduler parity",
  );

  source = replaceRegexOnce(
    source,
    /function __rxTrigger\(target, key\) \{[\s\S]*?\n\}\n\nfunction reactive/g,
    `function __rxTrigger(target, key, type = "set") {
  const depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    return;
  }
  const effects = new Set();
  const addEffects = (dep) => {
    if (!dep) return;
    for (const effect of dep) effects.add(effect);
  };
  addEffects(depsMap.get(key));
  if (type === "add" || type === "delete") {
    addEffects(depsMap.get(__rxIterateKey));
  }
  __rxTriggerEffects(effects);
}

function reactive`,
    "generated iteration trigger",
  );

  source = replaceOnce(
    source,
    `function __rxCreateReactiveObject(target, isReadonlyValue, proxyMap, isShallow) {
  if (!__rxIsObject(target)) {
    return target;
  }`,
    `function __rxCanUseBaseProxyHandlers(target) {
  const rawType = Object.prototype.toString.call(target);
  return rawType === "[object Object]" || rawType === "[object Array]";
}

function __rxCreateReactiveObject(target, isReadonlyValue, proxyMap, isShallow) {
  if (!__rxIsObject(target) || !__rxCanUseBaseProxyHandlers(target)) {
    return target;
  }`,
    "generated native proxy safety",
  );

  source = replaceOnce(
    source,
    `    set(rawTarget, key, value, receiver) {
      if (isReadonlyValue) {
        return true;
      }
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const oldLength = Array.isArray(rawTarget) ? rawTarget.length : 0;
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && __rxHasChanged(value, oldValue)) {
        __rxTrigger(rawTarget, key);
        if (
          Array.isArray(rawTarget)
          && key !== "length"
          && /^(?:0|[1-9]\\d*)$/.test(String(key))
          && Number(key) >= oldLength
          && Number(key) < 4294967295
        ) {
          __rxTrigger(rawTarget, "length");
        }
      }
      return success;
    },
    deleteProperty(rawTarget, key) {
      if (isReadonlyValue) {
        return true;
      }
      const hadKey = Reflect.has(rawTarget, key);
      const success = Reflect.deleteProperty(rawTarget, key);
      if (hadKey && success) {
        __rxTrigger(rawTarget, key);
      }
      return success;
    }`,
    `    set(rawTarget, key, value, receiver) {
      if (isReadonlyValue) {
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(rawTarget, key);
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const oldLength = Array.isArray(rawTarget) ? rawTarget.length : 0;
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && __rxHasChanged(value, oldValue)) {
        __rxTrigger(rawTarget, key, hadKey ? "set" : "add");
        if (
          Array.isArray(rawTarget)
          && key !== "length"
          && /^(?:0|[1-9]\\d*)$/.test(String(key))
          && Number(key) >= oldLength
          && Number(key) < 4294967295
        ) {
          __rxTrigger(rawTarget, "length");
        }
      }
      return success;
    },
    ownKeys(rawTarget) {
      if (!isReadonlyValue) {
        __rxTrack(rawTarget, __rxIterateKey);
      }
      return Reflect.ownKeys(rawTarget);
    },
    deleteProperty(rawTarget, key) {
      if (isReadonlyValue) {
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(rawTarget, key);
      const success = Reflect.deleteProperty(rawTarget, key);
      if (hadKey && success) {
        __rxTrigger(rawTarget, key, "delete");
      }
      return success;
    }`,
    "generated proxy iteration handlers",
  );

  source = replaceOnce(
    source,
    `function toRefs(object) {
  const output = {};
  for (const key of Object.keys(object)) {
    output[key] = toRef(object, key);
  }
  return output;
}`,
    `function toRefs(object) {
  const output = Array.isArray(object) ? new Array(object.length) : {};
  for (const key of Object.keys(object)) {
    output[key] = toRef(object, key);
  }
  return output;
}`,
    "generated toRefs array shape",
  );

  source = replaceOnce(
    source,
    `function __rxTraverse(value, seen = new Set()) {
  if (!__rxIsObject(value) || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Object.keys(value)) {
    __rxTraverse(value[key], seen);
  }
  return value;
}`,
    `function __rxTraverse(value, seen = new Set()) {
  if (!__rxIsObject(value) || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.enumerable) {
      __rxTraverse(value[key], seen);
    }
  }
  return value;
}`,
    "generated deep watch symbol traversal",
  );

  source = replaceOnce(
    source,
    `function setRegistryValue(registry, key, value) {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

export function createClientComponent`,
    `function setRegistryValue(registry, key, value) {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function createFetchAsyncDataKey(url, init) {
  return "fetch:" + hashFetchIdentity(serializeFetchRequestIdentity(url, init));
}

function serializeFetchRequestIdentity(url, init) {
  const headers = [];
  if (typeof Headers !== "undefined") {
    try {
      new Headers(init?.headers).forEach((value, key) => headers.push([key, value]));
      headers.sort(([left], [right]) => left.localeCompare(right));
    } catch {
      // Invalid headers will be reported by fetch itself; keep the cache key deterministic.
    }
  }
  return JSON.stringify({
    url,
    method: String(init?.method ?? "GET").toUpperCase(),
    headers,
    body: serializeFetchRequestBody(init?.body),
    cache: init?.cache ?? "",
    credentials: init?.credentials ?? "",
    integrity: init?.integrity ?? "",
    keepalive: init?.keepalive ?? false,
    mode: init?.mode ?? "",
    redirect: init?.redirect ?? "",
    referrer: init?.referrer ?? "",
    referrerPolicy: init?.referrerPolicy ?? "",
    duplex: init?.duplex ?? "",
    priority: init?.priority ?? ""
  });
}

function serializeFetchRequestBody(body) {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return ["string", body];
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return ["url-search-params", body.toString()];
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return ["form-data", ...Array.from(body.entries()).map(([key, value]) => [
      key,
      typeof value === "string"
        ? ["string", value]
        : ["file", value.name, value.size, value.type, value.lastModified]
    ])];
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return ["blob", body.name ?? "", body.size, body.type, body.lastModified ?? 0];
  }
  if (body instanceof ArrayBuffer) {
    return ["array-buffer", ...new Uint8Array(body)];
  }
  if (ArrayBuffer.isView(body)) {
    return ["array-buffer-view", ...new Uint8Array(body.buffer, body.byteOffset, body.byteLength)];
  }
  return ["body", Object.prototype.toString.call(body)];
}

function hashFetchIdentity(value) {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
}

export function createClientComponent`,
    "generated useFetch key helpers",
  );

  source = replaceOnce(
    source,
    `        useFetch(url, init) {
          const key = "fetch:" + url;
          return setupContext.useAsyncData(key, () => setupContext.$fetch(url, init));
        },`,
    `        useFetch(url, init) {
          const key = createFetchAsyncDataKey(url, init);
          return setupContext.useAsyncData(key, () => setupContext.$fetch(url, init));
        },`,
    "generated useFetch request identity",
  );

  await writeFile(file, source, "utf8");
}

async function patchCli() {
  const file = path.join(root, "src/cli.ts");
  let source = await readFile(file, "utf8");
  source = replaceOnce(
    source,
    `import { createResux } from "./core/resux.js";`,
    `import { createResux } from "./core/resux.js";\nimport { normalizeResuxGeneratedPath } from "./core/config.js";`,
    "CLI path normalization import",
  );
  source = replaceCount(
    source,
    `const resolvedBuildDir = await resolveConfiguredBuildDir(appRoot);`,
    `const resolvedBuildDir = normalizeResuxGeneratedPath(await resolveConfiguredBuildDir(appRoot));`,
    3,
    "CLI configured build directory normalization",
  );
  await writeFile(file, source, "utf8");
}

async function patchCompiler() {
  const file = path.join(root, "src/compiler/index.ts");
  let source = await readFile(file, "utf8");
  source = replaceOnce(
    source,
    `        let webPath = importPath;
        if (absolutePath.startsWith(projectRoot)) {
          const relativeToRoot = path.relative(projectRoot, absolutePath);
          webPath = "/" + relativeToRoot.replace(/\\\\/g, "/");
        }`,
    `        let webPath = importPath;
        const relativeToRoot = path.relative(projectRoot, absolutePath);
        const isInsideProject = relativeToRoot === ""
          || (relativeToRoot !== ".."
            && !relativeToRoot.startsWith(\`..\${path.sep}\`)
            && !path.isAbsolute(relativeToRoot));
        if (isInsideProject) {
          webPath = "/" + relativeToRoot.replace(/\\\\/g, "/");
        }`,
    "compiler project path containment",
  );
  await writeFile(file, source, "utf8");
}

async function patchUi() {
  const file = path.join(root, "src/ui/index.ts");
  let source = await readFile(file, "utf8");
  source = replaceOnce(
    source,
    `export const vAnime = {
  mounted(el: HTMLElement, binding: { value?: string | AnimateOptions }) {
    if (typeof window === "undefined" || isReducedMotion()) return;

    const config: AnimateOptions =
      typeof binding.value === "string"
        ? { type: binding.value }
        : binding.value || { type: "fade-up" };

    el.style.opacity = "0";

    const triggerAnimation = () => {
      useAnimate(el, config);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerAnimation();
            observer.unobserve(el);
          }
        },
        { rootMargin: "50px" }
      );
      observer.observe(el);
    } else {
      triggerAnimation();
    }
  }
};`,
    `const animeDirectiveState = new WeakMap<HTMLElement, {
  observer?: IntersectionObserver;
  animation?: Animation;
}>();

export const vAnime = {
  mounted(el: HTMLElement, binding: { value?: string | AnimateOptions }) {
    if (typeof window === "undefined" || isReducedMotion()) return;

    const config: AnimateOptions =
      typeof binding.value === "string"
        ? { type: binding.value }
        : binding.value || { type: "fade-up" };
    const state: { observer?: IntersectionObserver; animation?: Animation } = {};
    animeDirectiveState.set(el, state);

    const triggerAnimation = () => {
      const animation = useAnimate(el, { ...config, fill: config.fill ?? "both" });
      if (animation) {
        state.animation = animation;
      }
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerAnimation();
            observer.unobserve(el);
            state.observer = undefined;
          }
        },
        { rootMargin: "50px" }
      );
      state.observer = observer;
      observer.observe(el);
    } else {
      triggerAnimation();
    }
  },
  unmounted(el: HTMLElement) {
    const state = animeDirectiveState.get(el);
    state?.observer?.disconnect();
    state?.animation?.cancel();
    animeDirectiveState.delete(el);
  }
};`,
    "animation directive visibility and cleanup",
  );

  source = replaceOnce(
    source,
    `export const RxDatePicker = defineComponent({
  name: "RxDatePicker",
  props: {
    modelValue: { type: [String, Date], default: "" },
    placeholder: { type: String, default: "Select date" },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    const formattedValue = typeof props.modelValue === "object" && props.modelValue instanceof Date
      ? props.modelValue.toISOString().split("T")[0]
      : String(props.modelValue || "");
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-input", "rx-datepicker", attrs.class].filter(Boolean).join(" ");
      return h("input", {
        ...attrs,
        type: "date",
        value: formattedValue,
        placeholder: props.placeholder,
        class: classes,
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value)
      });
    };
  }
});`,
    `function formatDatePickerValue(value: string | Date): string {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().split("T")[0] : "";
  }
  return String(value || "");
}

export const RxDatePicker = defineComponent({
  name: "RxDatePicker",
  props: {
    modelValue: { type: [String, Date], default: "" },
    placeholder: { type: String, default: "Select date" },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-input", "rx-datepicker", attrs.class].filter(Boolean).join(" ");
      return h("input", {
        ...attrs,
        type: "date",
        value: formatDatePickerValue(props.modelValue),
        placeholder: props.placeholder,
        class: classes,
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value)
      });
    };
  }
});`,
    "reactive safe date picker value",
  );

  await writeFile(file, source, "utf8");
}

await patchRuntime();
await patchCli();
await patchCompiler();
await patchUi();

await rm(path.join(root, "scripts/apply-framework-audit-patches.mjs"), { force: true });
await rm(path.join(root, ".github/workflows/framework-audit-patch.yml"), { force: true });
