
const scopeCache = new Map();
const routePayloadCache = new Map();
const mountedVueIslands = new Map();
const pendingAsyncDataControllers = globalThis.__RESUX_PENDING_ASYNC_DATA_CONTROLLERS__ ||= new Set();
let devImportRevision = 0;
let routeTransitionToken = 0;
let routeTransitionHideTimer = 0;
let routeTransitionShowTimer = 0;
let routeTransitionProgressTimer = 0;
let routeTransitionStartedAt = 0;
let routeTransitionVisible = false;
let routeTransitionIndicator = null;
const lazyImageObservers = new Map();
const lazyVideoObservers = new Map();
const clientPluginIds = new Set();
const clientMiddlewareById = new Map();
const clientProvides = globalThis.__RESUX_PROVIDES__ ||= {};
const RESUX_LAZY_PLACEHOLDER_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const RESUX_DEFAULT_PLACEHOLDER_SRC = "/__resux/resux-placeholder.svg";
const observedLazyImages = new Set();
const observedLazyVideos = new Set();
const lazyImageObserverByElement = new WeakMap();
const lazyVideoObserverByElement = new WeakMap();
const failedMediaSources = new Set();
const initializedVideoControlShells = new WeakSet();
const managedVideoControlSyncByShell = new WeakMap();
const managedVideoControlCleanupByShell = new WeakMap();
const managedVideoControlShells = new Set();
let managedVideoFullscreenListenersReady = false;
const registeredDelegatedEvents = new Set();
let managedPageLoadReady = typeof document !== "undefined"
  ? document.readyState === "complete"
  : true;
const resuxLazyPackageCache = new Map();
const resuxLoadedPackages = new Set();
const resuxInjectedPackageCss = new Set();
const resuxClientEnhancements = new Map();
const resuxActiveEnhancementDisposers = new Set();
const resuxBoundEnhancementTargets = new WeakSet();
const RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS = 5000;
let resuxClientEnhancementManifestPromise = null;
const resuxPackageImporters = {

};
const resuxPackageCssImports = {};
const resuxDeclaredPackages = new Set([]);
const ROUTER_IGNORED_EVENT_TARGET_SELECTOR = "video,source,img,picture,audio,[data-rx-video-controls],[data-rx-video-zone],[data-resux-video-zone],button,select,option,input,label";
const MEDIA_NAVIGATION_BLOCK_TARGET_SELECTOR = "[data-resux-media], [data-rx-video-shell], [data-rx-video-controls], video, source, img, picture, audio";
const MEDIA_URL_SCHEME_RE = /^(javascript:|data:|blob:|mailto:|tel:)/i;
const MEDIA_STATIC_EXTENSION_RE = /\.(avif|gif|ico|jpe?g|m4v|mov|mp3|mp4|ogg|pdf|png|svg|wav|webm|webp)$/i;
let activeResuxError = null;

const __rxFlags = {
  isReactive: "__v_isReactive",
  isReadonly: "__v_isReadonly",
  raw: "__v_raw",
  isRef: "__v_isRef"
};
const __rxTargetMap = new WeakMap();
const __rxReactiveMap = new WeakMap();
const __rxReadonlyMap = new WeakMap();
let __rxActiveEffect;
let __rxShouldTrack = true;
const __rxTrackStack = [];
const __rxQueue = new Set();
let __rxFlushing = false;
const __rxResolvedPromise = Promise.resolve();
let __rxFlushPromise = null;

function createError(input) {
  if (typeof input === "string") {
    const error = new Error(input);
    error.name = "ResuxError";
    return error;
  }
  const message = input && typeof input.message === "string" ? input.message : "Resux error";
  const error = new Error(message);
  error.name = input && typeof input.name === "string" ? input.name : "ResuxError";
  if (input && typeof input.statusCode === "number") {
    error.statusCode = input.statusCode;
  }
  if (input && typeof input.fatal === "boolean") {
    error.fatal = input.fatal;
  }
  if (input && "data" in input) {
    error.data = input.data;
  }
  return error;
}

function showError(input) {
  const error = createError(input);
  useActiveResuxError().value = error;
  dispatchRuntimeErrorEvent("resux:app-error", error);
  throw error;
}

function clearError() {
  useActiveResuxError().value = null;
  dispatchRuntimeErrorEvent("resux:app-error-cleared", null);
}

function dispatchRuntimeErrorEvent(name, error) {
  if (typeof window === "undefined" || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent(name, { detail: { error } }));
}

function useActiveResuxError() {
  if (!activeResuxError) {
    activeResuxError = ref(null);
  }
  return activeResuxError;
}

function isClientRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function uniqueArray(items) {
  return [...new Set(items)];
}

function isEnhancementDebugEnabled() {
  if (!isClientRuntime()) {
    return false;
  }
  const queryFlag = /(?:\?|&)resux-enhancement-debug=1(?:&|$)/.test(window.location.search);
  const globalFlag = Boolean(window.__RESUX_ENHANCEMENT_DEBUG__);
  const envFlag = Boolean(import.meta && import.meta.env && import.meta.env.DEV);
  return envFlag || queryFlag || globalFlag;
}

function logEnhancementDebug(message) {
  if (!isEnhancementDebugEnabled()) {
    return;
  }
  console.info("[resux:enhancement] " + message);
}

function dispatchEnhancementEvent(eventName, detail) {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:enhancement:" + eventName, { detail }));
}

function dispatchPackageEvent(eventName, detail) {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:package:" + eventName, { detail }));
}

function dispatchPackageCssLoaded(detail) {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:package-css:loaded", { detail }));
}

function readEnhancementElementId(target) {
  if (!target) {
    return undefined;
  }
  const id = target.getAttribute("id");
  if (typeof id === "string" && id.trim()) {
    return id.trim();
  }
  const dataId = target.getAttribute("data-resux-enhancement-id");
  return typeof dataId === "string" && dataId.trim() ? dataId.trim() : undefined;
}

function setEnhancementStatus(target, status) {
  target.setAttribute("data-resux-enhancement-status", status);
  target.setAttribute("data-rx-enhancement-status", status);
}

function getEnhancementErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isEnhancementOptionsObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertEnhancementOptionsSerializable(value, path, seen) {
  if (value === null) {
    return;
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return;
  }
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("[resux] Enhancement options contain a non-finite number at \"" + path + "\".");
    }
    return;
  }
  if (valueType === "undefined" || valueType === "function" || valueType === "symbol" || valueType === "bigint") {
    throw new Error("[resux] Options for client enhancement must be JSON-serializable. Unsupported value at \"" + path + "\" (" + valueType + ").");
  }
  if (valueType !== "object") {
    return;
  }
  const objectValue = value;
  if (typeof Node !== "undefined" && objectValue instanceof Node) {
    throw new Error("[resux] Options for client enhancement cannot include DOM nodes (\"" + path + "\").");
  }
  if (seen.has(objectValue)) {
    throw new Error("[resux] Options for client enhancement contain a circular reference at \"" + path + "\".");
  }
  seen.add(objectValue);
  if (Array.isArray(objectValue)) {
    for (let index = 0; index < objectValue.length; index += 1) {
      assertEnhancementOptionsSerializable(objectValue[index], path + "[" + index + "]", seen);
    }
    return;
  }
  const prototype = Object.getPrototypeOf(objectValue);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("[resux] Options for client enhancement must use plain objects and arrays. Invalid value at \"" + path + "\".");
  }
  for (const [key, nestedValue] of Object.entries(objectValue)) {
    assertEnhancementOptionsSerializable(nestedValue, path + "." + key, seen);
  }
}

function normalizeEnhancementOptionsInput(name, options) {
  if (options === undefined || options === null) {
    return {};
  }
  if (!isEnhancementOptionsObject(options)) {
    throw new Error("[resux] Options for \"" + name + "\" must be a JSON-serializable plain object.");
  }
  assertEnhancementOptionsSerializable(options, "$", new WeakSet());
  return options;
}

function createEnhancementSetupPayload(trigger, options) {
  const payloadOptions = { ...options };
  return {
    ...payloadOptions,
    trigger,
    options: payloadOptions,
    __resux: {
      trigger,
      options: payloadOptions,
    },
  };
}

function isElementProbablyVisible(target) {
  if (!isClientRuntime()) {
    return true;
  }
  const rect = target.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.top <= window.innerHeight;
}

async function ensureClientEnhancementManifestLoaded() {
  if (!isClientRuntime()) {
    return;
  }
  if (!resuxClientEnhancementManifestPromise) {
    logEnhancementDebug("runtime loaded");
    resuxClientEnhancementManifestPromise = (async () => {
      try {
        const manifestUrl = window.__RESUX_CLIENT_ENHANCEMENTS_SRC__ || "/__resux/client-enhancements.mjs";
        await import(/* @vite-ignore */ manifestUrl);
        logEnhancementDebug("manifest loaded");
      } catch (error) {
        const message = getEnhancementErrorMessage(error);
        if (isEnhancementDebugEnabled()) {
          console.warn("[resux:enhancement] failed to load manifest: " + message);
        }
      }
    })();
  }
  await resuxClientEnhancementManifestPromise;
}

function packageCacheKey(name, options = {}) {
  const exportName = typeof options.exportName === "string" ? options.exportName : "";
  const preferDefault = options.preferDefault === false ? "named" : "default";
  const mode = normalizePackageMode(options.mode, options.clientOnly ? "clientOnly" : "ssr");
  const css = Array.isArray(options.css) ? options.css.join(",") : String(options.css || "");
  return [name, exportName, preferDefault, mode, css].join("::");
}

function normalizePackageCssInput(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function readRuntimePackagesConfig() {
  try {
    const runtimeConfig = useRuntimeConfig();
    const direct = (runtimeConfig.public && runtimeConfig.public.packages) || runtimeConfig.packages;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct;
    }
  } catch {
    // useRuntimeConfig is not always available in pure client helpers.
  }
  return {};
}

function normalizePackageMode(value, fallback = "ssr") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (normalized === "ssr" || normalized === "clientOnly" || normalized === "serverOnly" || normalized === "progressive") {
    return normalized;
  }
  return fallback;
}

function resolvePackageMode(name, options = {}, config = {}) {
  if (options && options.clientOnly === true) {
    return "clientOnly";
  }
  if (options && options.mode) {
    return normalizePackageMode(options.mode, "ssr");
  }
  const configuredModes = config && typeof config.mode === "object" ? config.mode : null;
  if (configuredModes && name in configuredModes) {
    return normalizePackageMode(configuredModes[name], "ssr");
  }
  const serverOnlyList = Array.isArray(config.serverOnly) ? config.serverOnly : [];
  if (serverOnlyList.includes(name)) {
    return "serverOnly";
  }
  const clientOnlyList = Array.isArray(config.clientOnly) ? config.clientOnly : [];
  if (clientOnlyList.includes(name)) {
    return "clientOnly";
  }
  return "ssr";
}

function isClientRuntimePackageMode(mode) {
  return mode === "clientOnly" || mode === "progressive";
}

function isClientPackageCssHref(value) {
  return /^([a-z]+:)?\/\//i.test(value)
    || value.startsWith("/")
    || value.startsWith("./")
    || value.startsWith("../")
    || value.startsWith("#");
}

function resolveRegisteredPackageImporter(name) {
  if (!name) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(resuxPackageImporters, name)) {
    return undefined;
  }
  const importer = resuxPackageImporters[name];
  return typeof importer === "function" ? importer : undefined;
}

async function injectClientPackageCss(cssEntries, packageName) {
  if (!isClientRuntime()) {
    return;
  }
  const configuredEntries = Array.isArray(resuxPackageCssImports[packageName])
    ? resuxPackageCssImports[packageName]
    : [];
  const allEntries = uniqueArray([
    ...configuredEntries,
    ...(Array.isArray(cssEntries) ? cssEntries : []),
  ]);
  const styleImports = [];
  for (const href of allEntries) {
    if (!href || resuxInjectedPackageCss.has(href)) {
      continue;
    }
    if (isClientPackageCssHref(href)) {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", href);
      link.setAttribute("data-resux-package-css", href);
      document.head.appendChild(link);
      resuxInjectedPackageCss.add(href);
      dispatchPackageCssLoaded({
        name: packageName,
        entry: href,
      });
      continue;
    }
    const importer = resolveRegisteredPackageImporter(href);
    if (!importer) {
      throw new Error(
        "Failed to load CSS entry \"" + href + "\" for package \"" + packageName + "\": "
        + "no static importer was generated. Add it to packages.css or a detected useClientPackage/useLazyPackage call.",
      );
    }
    styleImports.push(
      importer().then(() => {
        dispatchPackageCssLoaded({
          name: packageName,
          entry: href,
        });
      }).catch((error) => {
        throw new Error(
          "Failed to load CSS entry \"" + href + "\" for package \"" + packageName + "\": " + (error instanceof Error ? error.message : String(error)),
        );
      }),
    );
    resuxInjectedPackageCss.add(href);
  }
  if (styleImports.length > 0) {
    await Promise.all(styleImports);
  }
}

function packageImportError(name, mode, cause) {
  const reason = cause instanceof Error ? cause.message : String(cause);
  if (isClientRuntimePackageMode(mode) && !isClientRuntime()) {
    return new Error(
      "Package \"" + name + "\" appears to be browser-only and was imported during SSR. "
      + "Use useClientPackage(\"" + name + "\") or useLazyPackage(\"" + name + "\", { mode: \"clientOnly\" }) inside onMounted() or a client enhancement.",
    );
  }
  if (mode === "serverOnly" && isClientRuntime()) {
    return new Error(
      "Package \"" + name + "\" is marked serverOnly and cannot run in the browser. "
      + "Load it on the server or change its packages.mode entry.",
    );
  }
  if (/Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|failed to resolve/i.test(reason)) {
    return new Error(
      "Package \"" + name + "\" is not installed. Run \"npm install " + name + "\" or remove this integration.",
    );
  }
  return new Error("Failed to load package \"" + name + "\": " + reason);
}

async function useLazyPackage(name, options = {}) {
  const packageName = String(name || "").trim();
  if (!packageName) {
    throw new Error("useLazyPackage(name) needs a package name.");
  }

  const packageConfig = readRuntimePackagesConfig();
  const mode = resolvePackageMode(packageName, options, packageConfig);
  if (isClientRuntimePackageMode(mode) && !isClientRuntime()) {
    throw packageImportError(packageName, mode, new Error("client-only package requested on server"));
  }
  if (mode === "serverOnly" && isClientRuntime()) {
    throw packageImportError(packageName, mode, new Error("server-only package requested on client"));
  }

  const cssFromConfig = Array.isArray(packageConfig.css)
    ? packageConfig.css
    : packageConfig.css && typeof packageConfig.css === "object"
      ? packageConfig.css[packageName]
      : [];
  const css = uniqueArray([
    ...normalizePackageCssInput(cssFromConfig),
    ...normalizePackageCssInput(options.css),
  ]);
  await injectClientPackageCss(css, packageName);

  const key = packageCacheKey(packageName, { ...options, mode, css });
  const cached = resuxLazyPackageCache.get(key);
  if (cached) {
    return cached;
  }

  const loader = (async () => {
    dispatchPackageEvent("loading", {
      name: packageName,
      mode,
    });
    try {
      const importer = resolveRegisteredPackageImporter(packageName);
      if (!importer) {
        if (resuxDeclaredPackages.has(packageName)) {
          throw new Error(
            "Package \"" + packageName + "\" is configured for client loading but is unavailable in the generated client registry. "
            + "Run \"npm install " + packageName + "\" or remove it from packages config/usages.",
          );
        }
        throw new Error(
          "Package \"" + packageName + "\" is not registered for lazy loading. "
          + "Add it to packages.lazy/packages.clientOnly/packages.css or use it via a detected Resux package integration call.",
        );
      }
      const imported = await importer();
      resuxLoadedPackages.add(packageName);
      dispatchPackageEvent("loaded", {
        name: packageName,
        mode,
      });
      if (options.exportName) {
        const selected = imported[options.exportName];
        if (selected === undefined) {
          throw new Error("Export \"" + options.exportName + "\" was not found in package \"" + packageName + "\".");
        }
        return selected;
      }
      if (options.preferDefault === false) {
        return imported;
      }
      return imported.default ?? imported;
    } catch (error) {
      dispatchPackageEvent("error", {
        name: packageName,
        mode,
        error: getEnhancementErrorMessage(error),
      });
      throw packageImportError(packageName, mode, error);
    }
  })();

  resuxLazyPackageCache.set(key, loader);
  return loader;
}

async function useClientPackage(name, options = {}) {
  return useLazyPackage(name, { ...options, mode: "clientOnly", clientOnly: true });
}

function usePackageReady(name) {
  return resuxLoadedPackages.has(String(name || "").trim());
}

function defineLazyPackage(name, options = {}) {
  return () => useLazyPackage(name, options);
}

function defineClientOnlyPackage(name, options = {}) {
  return () => useClientPackage(name, options);
}

function readEnhancementPayloadOptions(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const record = payload;
  if (isEnhancementOptionsObject(record.options)) {
    return { ...record.options };
  }
  const { trigger: _trigger, options: _options, __resux: _meta, ...directOptions } = record;
  return directOptions;
}

function definePackageAdapter(definition) {
  const enhancementName = String(definition && definition.name || "").trim();
  if (!enhancementName) {
    throw new Error("[resux] definePackageAdapter requires a non-empty adapter name.");
  }
  if (!definition || typeof definition.enhance !== "function") {
    throw new Error("[resux] definePackageAdapter(\"" + enhancementName + "\") requires an enhance() function.");
  }

  const packageName = String(definition.packageName || enhancementName).trim();
  const mode = normalizePackageMode(definition.mode, "progressive");
  const imports = uniqueArray([
    packageName,
    ...(Array.isArray(definition.imports) ? definition.imports.map((entry) => String(entry || "").trim()) : []),
  ].filter((entry) => entry.length > 0));
  const css = normalizePackageCssInput(definition.css);
  const defaults = definition.defaults && isEnhancementOptionsObject(definition.defaults)
    ? { ...definition.defaults }
    : {};

  return defineClientEnhancement(enhancementName, async (target, payload) => {
    const userOptions = readEnhancementPayloadOptions(payload);
    const mergedOptions = { ...defaults, ...userOptions };
    try {
      assertEnhancementOptionsSerializable(mergedOptions, "$", new WeakSet());
    } catch (error) {
      throw new Error(
        "[resux] Adapter \"" + enhancementName + "\" received non-serializable options. "
        + getEnhancementErrorMessage(error),
      );
    }

    if (typeof definition.validateOptions === "function") {
      definition.validateOptions(mergedOptions);
    }

    const modules = imports.length
      ? await Promise.all(imports.map((specifier, index) => useLazyPackage(specifier, {
        mode,
        clientOnly: mode === "clientOnly",
        preferDefault: false,
        css: index === 0 ? css : [],
      })))
      : [];

    return definition.enhance(target, mergedOptions, {
      packageName,
      mode,
      modules,
    });
  });
}

function scheduleEnhancementTrigger(name, trigger, target, activate) {
  const fire = () => {
    void activate().catch(() => {
      // useClientEnhancement already reports error status/events.
    });
  };
  if (trigger === "manual") {
    return () => {};
  }
  if (trigger === "immediate") {
    queueMicrotask(() => {
      fire();
    });
    return () => {};
  }
  if (trigger === "interaction") {
    const handler = () => {
      fire();
      target.removeEventListener("click", handler, true);
      target.removeEventListener("pointerdown", handler, true);
      target.removeEventListener("touchstart", handler, true);
      target.removeEventListener("focusin", handler, true);
      target.removeEventListener("keydown", handler, true);
    };
    target.addEventListener("click", handler, true);
    target.addEventListener("pointerdown", handler, true);
    target.addEventListener("touchstart", handler, true);
    target.addEventListener("focusin", handler, true);
    target.addEventListener("keydown", handler, true);
    return () => {
      target.removeEventListener("click", handler, true);
      target.removeEventListener("pointerdown", handler, true);
      target.removeEventListener("touchstart", handler, true);
      target.removeEventListener("focusin", handler, true);
      target.removeEventListener("keydown", handler, true);
    };
  }
  if (trigger === "idle") {
    const idle = window;
    if (typeof idle.requestIdleCallback === "function") {
      const id = idle.requestIdleCallback(() => {
        fire();
      });
      return () => {
        if (typeof idle.cancelIdleCallback === "function") {
          idle.cancelIdleCallback(id);
        }
      };
    }
    const timeoutId = window.setTimeout(() => {
      fire();
    }, 32);
    return () => window.clearTimeout(timeoutId);
  }
  if (trigger === "page-load") {
    if (document.readyState === "complete") {
      fire();
      return () => {};
    }
    const onLoad = () => {
      window.removeEventListener("load", onLoad);
      fire();
    };
    window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("load", onLoad);
    };
  }
  if (trigger === "visible") {
    if (isElementProbablyVisible(target)) {
      fire();
      return () => {};
    }
    if (typeof IntersectionObserver !== "function") {
      fire();
      return () => {};
    }
    let settled = false;
    let visibilityPollId = 0;
    let visibilityPollStopId = 0;
    const settleAndRun = (observer) => {
      if (settled) {
        return;
      }
      settled = true;
      if (visibilityPollId) {
        window.clearInterval(visibilityPollId);
        visibilityPollId = 0;
      }
      if (visibilityPollStopId) {
        window.clearTimeout(visibilityPollStopId);
        visibilityPollStopId = 0;
      }
      if (observer) {
        observer.disconnect();
      }
      fire();
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        settleAndRun(observer);
      }
    }, { rootMargin: "200px 0px" });
    observer.observe(target);
    visibilityPollId = window.setInterval(() => {
      if (isElementProbablyVisible(target)) {
        settleAndRun(observer);
      }
    }, 200);
    visibilityPollStopId = window.setTimeout(() => {
      if (visibilityPollId) {
        window.clearInterval(visibilityPollId);
        visibilityPollId = 0;
      }
    }, RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS);
    logEnhancementDebug("observing visible trigger " + name);
    return () => {
      settled = true;
      if (visibilityPollId) {
        window.clearInterval(visibilityPollId);
      }
      if (visibilityPollStopId) {
        window.clearTimeout(visibilityPollStopId);
      }
      observer.disconnect();
    };
  }
  fire();
  return () => {};
}

function defineClientEnhancement(name, setup) {
  const normalized = String(name || "").trim();
  if (!normalized) {
    throw new Error("[resux] defineClientEnhancement requires a string name.");
  }
  if (typeof setup !== "function") {
    throw new Error("[resux] defineClientEnhancement(\"" + normalized + "\") requires a setup function.");
  }
  resuxClientEnhancements.set(normalized, setup);
  logEnhancementDebug("registered " + normalized);
  return { name: normalized, setup };
}

function resolveEnhancementTarget(input) {
  if (!isClientRuntime()) {
    return null;
  }
  if (!input) {
    return document.body;
  }
  if (typeof input === "string") {
    return document.querySelector(input);
  }
  return input;
}

async function useClientEnhancement(name, options = {}) {
  if (!isClientRuntime()) {
    return {
      ready: false,
      activate: async () => {},
      dispose: async () => {},
    };
  }
  await ensureClientEnhancementManifestLoaded();

  const target = resolveEnhancementTarget(options.target);
  if (!target) {
    throw new Error("Client enhancement \"" + String(name || "").trim() + "\" did not find a target element.");
  }

  const normalized = String(name || "").trim();
  const setup = resuxClientEnhancements.get(normalized);
  if (!setup) {
    const message = "[resux] Client enhancement \"" + normalized + "\" was used but not registered.\n"
      + "Create one of:\n"
      + "- client-enhancements/" + normalized + ".client.ts\n"
      + "- enhancements/" + normalized + ".client.ts\n"
      + "or call defineClientEnhancement(\"" + normalized + "\", setup) from a loaded client plugin.";
    setEnhancementStatus(target, "error");
    target.setAttribute("data-rx-enhancement-error", message);
    dispatchEnhancementEvent("error", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      error: message,
    });
    throw new Error(message);
  }

  let normalizedEnhancementOptions = {};
  try {
    normalizedEnhancementOptions = normalizeEnhancementOptionsInput(normalized, options.options);
  } catch (error) {
    const message = getEnhancementErrorMessage(error);
    setEnhancementStatus(target, "error");
    target.setAttribute("data-rx-enhancement-error", message);
    dispatchEnhancementEvent("error", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      error: message,
    });
    throw error instanceof Error ? error : new Error(message);
  }

  let activated = false;
  let disposed = false;
  let teardown;
  const trigger = options.trigger || "manual";
  let idleWarningTimer = 0;

  if (trigger !== "manual") {
    idleWarningTimer = window.setTimeout(() => {
      if (activated || disposed) {
        return;
      }
      const warning = "[resux] Enhancement \"" + normalized + "\" stayed idle for 5s. Check data-resux-trigger, IntersectionObserver, and whether the element is visible.";
      if (isEnhancementDebugEnabled()) {
        console.warn(warning);
      }
      setEnhancementStatus(target, "error");
      target.setAttribute("data-rx-enhancement-error", warning);
      dispatchEnhancementEvent("error", {
        name: normalized,
        elementId: readEnhancementElementId(target),
        error: warning,
      });
    }, RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS);
  }

  const activate = async () => {
    if (disposed || activated) {
      return;
    }
    activated = true;
    if (idleWarningTimer) {
      window.clearTimeout(idleWarningTimer);
      idleWarningTimer = 0;
    }
    setEnhancementStatus(target, "triggered");
    dispatchEnhancementEvent("triggered", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      trigger,
    });
    logEnhancementDebug("trigger fired " + normalized);
    setEnhancementStatus(target, "loading");
    dispatchEnhancementEvent("loading", {
      name: normalized,
      elementId: readEnhancementElementId(target),
    });
    try {
      const setupPayload = createEnhancementSetupPayload(trigger, normalizedEnhancementOptions);
      teardown = await setup(target, setupPayload);
      setEnhancementStatus(target, "active");
      dispatchEnhancementEvent("ready", {
        name: normalized,
        elementId: readEnhancementElementId(target),
      });
      logEnhancementDebug("setup complete");
      if (typeof teardown === "function") {
        resuxActiveEnhancementDisposers.add(teardown);
        dispatchEnhancementEvent("cleanup-ready", {
          name: normalized,
          elementId: readEnhancementElementId(target),
        });
        logEnhancementDebug("cleanup registered");
      }
    } catch (error) {
      const message = getEnhancementErrorMessage(error);
      setEnhancementStatus(target, "error");
      target.setAttribute("data-rx-enhancement-error", message);
      dispatchEnhancementEvent("error", {
        name: normalized,
        elementId: readEnhancementElementId(target),
        error: message,
      });
      throw error;
    }
  };

  const cancelTrigger = scheduleEnhancementTrigger(normalized, trigger, target, activate);
  const dispose = async () => {
    if (disposed) {
      return;
    }
    disposed = true;
    if (idleWarningTimer) {
      window.clearTimeout(idleWarningTimer);
      idleWarningTimer = 0;
    }
    cancelTrigger();
    if (typeof teardown === "function") {
      resuxActiveEnhancementDisposers.delete(teardown);
      await teardown();
    }
  };

  return {
    ready: activated,
    activate,
    dispose,
  };
}

export {
  useLazyPackage,
  useClientPackage,
  usePackageReady,
  defineLazyPackage,
  defineClientOnlyPackage,
  definePackageAdapter,
  defineClientEnhancement,
  useClientEnhancement,
  hasClientEnhancement,
  getClientEnhancement,
  scanClientEnhancements,
  disposeClientEnhancements,
};

async function disposeClientEnhancements() {
  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }
}

function hasClientEnhancement(name) {
  const normalized = String(name || "").trim();
  return normalized.length > 0 && resuxClientEnhancements.has(normalized);
}

function getClientEnhancement(name) {
  const normalized = String(name || "").trim();
  return normalized ? resuxClientEnhancements.get(normalized) : undefined;
}

async function scanClientEnhancements(root = document) {
  if (isClientRuntime() && document.readyState === "loading") {
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }
  await ensureClientEnhancementManifestLoaded();
  await activateDeclaredClientEnhancements(root);
}

function normalizeEnhancementTrigger(value, fallback = "visible") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (normalized === "visible" || normalized === "interaction" || normalized === "idle" || normalized === "immediate" || normalized === "page-load" || normalized === "manual") {
    return normalized;
  }
  return fallback;
}

function parseEnhancementOptions(value, name) {
  if (!value || !value.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { options: parsed };
    }
    return {
      error: "[resux] Options for \"" + name + "\" must be a JSON object.",
    };
  } catch (error) {
    return {
      error: "[resux] Failed to parse options for \"" + name + "\". Ensure data-resux-options is valid JSON. " + getEnhancementErrorMessage(error),
    };
  }
}

async function activateDeclaredClientEnhancements(root = document) {
  if (!isClientRuntime() || !root || typeof root.querySelectorAll !== "function") {
    return;
  }
  logEnhancementDebug("scanning DOM");
  const elements = root.querySelectorAll("[data-resux-enhancement], [use-client-enhancement]");
  for (const element of elements) {
    if (!element || typeof element.getAttribute !== "function") {
      continue;
    }
    if (resuxBoundEnhancementTargets.has(element)) {
      continue;
    }
    const enhancementName = String(
      element.getAttribute("data-resux-enhancement")
      || element.getAttribute("use-client-enhancement")
      || "",
    ).trim();
    if (!enhancementName) {
      continue;
    }
    const trigger = normalizeEnhancementTrigger(
      element.getAttribute("data-resux-trigger")
      || element.getAttribute("data-trigger")
      || element.getAttribute("trigger"),
      "visible",
    );
    const optionsAttributeValue = (
      element.getAttribute("data-resux-options")
      || element.getAttribute("data-resux-enhancement-options")
      || element.getAttribute("data-enhancement-options")
      || element.getAttribute("data-options")
    );
    const parsedOptions = parseEnhancementOptions(optionsAttributeValue, enhancementName);
    if (optionsAttributeValue !== null) {
      element.setAttribute("data-resux-options", optionsAttributeValue);
    }
    if (parsedOptions.error) {
      setEnhancementStatus(element, "error");
      element.setAttribute("data-rx-enhancement-error", parsedOptions.error);
      dispatchEnhancementEvent("error", {
        name: enhancementName,
        trigger,
        elementId: readEnhancementElementId(element),
        error: parsedOptions.error,
      });
      continue;
    }
    const options = parsedOptions.options;
    resuxBoundEnhancementTargets.add(element);
    element.setAttribute("data-resux-enhancement", enhancementName);
    element.setAttribute("data-resux-trigger", trigger);
    element.setAttribute("data-rx-enhancement", enhancementName);
    element.setAttribute("data-rx-enhancement-trigger", trigger);
    setEnhancementStatus(element, "found");
    dispatchEnhancementEvent("found", {
      name: enhancementName,
      trigger,
      elementId: readEnhancementElementId(element),
    });
    logEnhancementDebug("found element " + enhancementName + " trigger=" + trigger);
    try {
      await useClientEnhancement(enhancementName, {
        target: element,
        trigger,
        options,
      });
      element.setAttribute("data-rx-enhancement-bound", "true");
      element.removeAttribute("data-rx-enhancement-error");
    } catch (error) {
      const message = getEnhancementErrorMessage(error);
      setEnhancementStatus(element, "error");
      element.setAttribute(
        "data-rx-enhancement-error",
        message,
      );
      dispatchEnhancementEvent("error", {
        name: enhancementName,
        trigger,
        elementId: readEnhancementElementId(element),
        error: message,
      });
    }
  }
}

function __rxIsObject(value) {
  return value !== null && typeof value === "object";
}

function __rxHasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}

function __rxQueueJob(job) {
  __rxQueue.add(job);
  if (__rxFlushing) {
    return;
  }
  __rxFlushing = true;
  __rxFlushPromise = __rxResolvedPromise.then(() => {
    try {
      for (const queued of __rxQueue) {
        queued();
      }
    } finally {
      __rxQueue.clear();
      __rxFlushing = false;
      __rxFlushPromise = null;
    }
  });
}

function nextTick(fn) {
  const promise = __rxFlushPromise || __rxResolvedPromise;
  return fn ? promise.then(fn) : promise;
}

class __rxReactiveEffect {
  constructor(fn, scheduler, onStop) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.onStop = onStop;
    this.active = true;
    this.deps = [];
  }

  run() {
    if (!this.active) {
      return this.fn();
    }
    const previous = __rxActiveEffect;
    __rxActiveEffect = this;
    __rxTrackStack.push(__rxShouldTrack);
    __rxShouldTrack = true;
    try {
      return this.fn();
    } finally {
      __rxShouldTrack = __rxTrackStack.pop() ?? true;
      __rxActiveEffect = previous;
    }
  }

  stop() {
    if (!this.active) {
      return;
    }
    for (const dep of this.deps) {
      dep.delete(this);
    }
    this.deps.length = 0;
    if (typeof this.onStop === "function") {
      this.onStop();
    }
    this.active = false;
  }
}

function effect(fn, options = {}) {
  const _effect = new __rxReactiveEffect(fn, options.scheduler, options.onStop);
  if (!options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

function __rxTrack(target, key) {
  if (!__rxShouldTrack || !__rxActiveEffect) {
    return;
  }
  let depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    __rxTargetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  if (dep.has(__rxActiveEffect)) {
    return;
  }
  dep.add(__rxActiveEffect);
  __rxActiveEffect.deps.push(dep);
}

function __rxTrigger(target, key) {
  const depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  for (const reactiveEffect of [...dep]) {
    if (reactiveEffect.scheduler) {
      reactiveEffect.scheduler();
    } else {
      reactiveEffect.run();
    }
  }
}

function reactive(target) {
  return __rxCreateReactiveObject(target, false, __rxReactiveMap, false);
}

function readonly(target) {
  return __rxCreateReactiveObject(target, true, __rxReadonlyMap, false);
}

function __rxCreateReactiveObject(target, isReadonlyValue, proxyMap, isShallow) {
  if (!__rxIsObject(target)) {
    return target;
  }
  const existing = proxyMap.get(target);
  if (existing) {
    return existing;
  }
  const proxy = new Proxy(target, {
    get(rawTarget, key, receiver) {
      if (key === __rxFlags.isReactive) {
        return !isReadonlyValue;
      }
      if (key === __rxFlags.isReadonly) {
        return isReadonlyValue;
      }
      if (key === __rxFlags.raw) {
        return rawTarget;
      }
      const value = Reflect.get(rawTarget, key, receiver);
      if (!isReadonlyValue) {
        __rxTrack(rawTarget, key);
      }
      if (isShallow || !__rxIsObject(value)) {
        return value;
      }
      return isReadonlyValue ? readonly(value) : reactive(value);
    },
    set(rawTarget, key, value, receiver) {
      if (isReadonlyValue) {
        return true;
      }
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && __rxHasChanged(value, oldValue)) {
        __rxTrigger(rawTarget, key);
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
    }
  });
  proxyMap.set(target, proxy);
  return proxy;
}

function isReactive(value) {
  return Boolean(__rxIsObject(value) && value[__rxFlags.isReactive]);
}

function isReadonly(value) {
  return Boolean(__rxIsObject(value) && value[__rxFlags.isReadonly]);
}

class __rxRefImpl {
  constructor(value) {
    this.__v_isRef = true;
    this._rawValue = value;
    this._value = __rxIsObject(value) ? reactive(value) : value;
    this.dep = new Set();
  }

  get value() {
    if (__rxShouldTrack && __rxActiveEffect) {
      if (!this.dep.has(__rxActiveEffect)) {
        this.dep.add(__rxActiveEffect);
        __rxActiveEffect.deps.push(this.dep);
      }
    }
    return this._value;
  }

  set value(newValue) {
    if (!__rxHasChanged(newValue, this._rawValue)) {
      return;
    }
    this._rawValue = newValue;
    this._value = __rxIsObject(newValue) ? reactive(newValue) : newValue;
    for (const reactiveEffect of [...this.dep]) {
      if (reactiveEffect.scheduler) {
        reactiveEffect.scheduler();
      } else {
        reactiveEffect.run();
      }
    }
  }
}

function ref(value) {
  return isRef(value) ? value : new __rxRefImpl(value);
}

function isRef(value) {
  return Boolean(value && typeof value === "object" && value[__rxFlags.isRef] === true);
}

function unref(value) {
  return isRef(value) ? value.value : value;
}

class __rxObjectRef {
  constructor(object, key, defaultValue) {
    this.__v_isRef = true;
    this.object = object;
    this.key = key;
    this.defaultValue = defaultValue;
  }

  get value() {
    const value = this.object[this.key];
    return value === undefined ? this.defaultValue : value;
  }

  set value(newValue) {
    this.object[this.key] = newValue;
  }
}

function toRef(object, key, defaultValue) {
  const value = object[key];
  return isRef(value) ? value : new __rxObjectRef(object, key, defaultValue);
}

function toRefs(object) {
  const output = {};
  for (const key of Object.keys(object)) {
    output[key] = toRef(object, key);
  }
  return output;
}

function computed(getterOrOptions) {
  const getter = typeof getterOrOptions === "function"
    ? getterOrOptions
    : getterOrOptions.get;
  const setter = typeof getterOrOptions === "function"
    ? undefined
    : getterOrOptions.set;
  const dep = new Set();
  let dirty = true;
  let value;
  const runner = effect(getter, {
    lazy: true,
    scheduler: () => {
      if (!dirty) {
        dirty = true;
        for (const reactiveEffect of [...dep]) {
          if (reactiveEffect.scheduler) {
            reactiveEffect.scheduler();
          } else {
            reactiveEffect.run();
          }
        }
      }
    }
  });

  return {
    __v_isRef: true,
    __v_isReadonly: true,
    get value() {
      if (__rxShouldTrack && __rxActiveEffect && !dep.has(__rxActiveEffect)) {
        dep.add(__rxActiveEffect);
        __rxActiveEffect.deps.push(dep);
      }
      if (dirty) {
        dirty = false;
        value = runner();
      }
      return value;
    },
    set value(newValue) {
      if (setter) {
        setter(newValue);
      }
    }
  };
}

const __rxInitialWatchValue = Symbol("initial-watch-value");

function watch(source, callback, options = {}) {
  return __rxDoWatch(source, callback, options);
}

function watchEffect(effectFn, options = {}) {
  return __rxDoWatch(effectFn, null, options);
}

function __rxDoWatch(source, callback, options) {
  const deep = options.deep === true;
  const immediate = options.immediate === true;
  const flush = options.flush ?? "post";
  let cleanup;
  const onCleanup = (fn) => {
    cleanup = fn;
  };

  let getter;
  if (callback === null) {
    getter = () => {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
      source(onCleanup);
    };
  } else {
    getter = () => __rxResolveWatchSource(source);
  }

  if (deep) {
    const baseGetter = getter;
    getter = () => __rxTraverse(baseGetter());
  }

  let oldValue = __rxInitialWatchValue;

  const job = () => {
    if (callback === null) {
      runner();
      return;
    }
    const newValue = runner();
    if (deep || oldValue === __rxInitialWatchValue || __rxHasChanged(newValue, oldValue)) {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
      callback(newValue, oldValue === __rxInitialWatchValue ? undefined : oldValue, onCleanup);
      oldValue = newValue;
    }
  };

  const scheduler = flush === "sync"
    ? job
    : () => __rxQueueJob(job);

  const runner = effect(getter, {
    scheduler,
    lazy: callback !== null
  });

  if (callback) {
    if (immediate) {
      job();
    } else {
      oldValue = runner();
    }
  }

  return () => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    runner.effect.stop();
  };
}

function __rxResolveWatchSource(source) {
  if (Array.isArray(source)) {
    return source.map((entry) => __rxResolveWatchEntry(entry));
  }
  return __rxResolveWatchEntry(source);
}

function __rxResolveWatchEntry(source) {
  if (isRef(source)) {
    return source.value;
  }
  if (isReactive(source)) {
    return source;
  }
  if (typeof source === "function") {
    return source();
  }
  return source;
}

function __rxTraverse(value, seen = new Set()) {
  if (!__rxIsObject(value) || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Object.keys(value)) {
    __rxTraverse(value[key], seen);
  }
  return value;
}

export function defineResuxPlugin(plugin) {
  return plugin;
}

export function defineResuxRouteMiddleware(middleware) {
  return middleware;
}

export function defineClientRouteRedirect(to, options = {}) {
  return {
    type: "redirect",
    to,
    statusCode: options.statusCode
  };
}

export function defineClientRouteAbort(message, options = {}) {
  return {
    type: "abort",
    message,
    statusCode: options.statusCode
  };
}

export function useResuxApp() {
  return getClientResuxApp();
}

export function useResuxImage() {
  const app = getClientResuxApp();
  return createClientImageBuilder(app.route, app.$config);
}

function getClientResuxApp(routeOverride) {
  const payload = globalThis.__RESUX__ ?? {
    route: routeOverride ?? { path: "/", params: {}, query: {} },
    scopes: {},
    modules: {},
    config: { public: {} }
  };
  const route = routeOverride ?? payload.route ?? { path: "/", params: {}, query: {} };
  const config = payload.config ?? { public: {} };
  let app = globalThis.__RESUX_APP__;

  if (!app) {
    app = {
      route,
      payload,
      $config: config,
      provides: clientProvides,
      provide(key, value) {
        clientProvides[key] = value;
        this["$" + key] = value;
      },
      vueApp: {
        component(name, component) {
          return component;
        },
        directive(name, directive) {
          return directive;
        },
        use(plugin, ...options) {
          return this;
        },
        mixin(mixin) {
          return this;
        },
        provide(key, value) {
          return this;
        },
        config: {
          globalProperties: {}
        }
      }
    };
    for (const [key, value] of Object.entries(clientProvides)) {
      app["$" + key] = value;
    }
    globalThis.__RESUX_APP__ = app;
  } else {
    app.route = route;
    app.payload = payload;
    app.$config = config;
    app.provides = clientProvides;
  }

  return app;
}

function createClientImageBuilder(route, runtimeConfig) {
  return (src, options = {}) => {
    const normalizedSrc = normalizeClientImageSource(src, route);
    const imageConfig = readClientImageConfig(runtimeConfig);
    const providerName = String(options.provider || imageConfig.provider || "resux").trim().toLowerCase();
    const providerConfig = imageConfig.providers[providerName] || {};
    const baseURL = providerConfig.baseURL || (providerName === "vercel" ? "/_vercel/image" : "/__resux/image");
    const cacheOption = normalizeClientImageCacheValue(options.cache ?? imageConfig.cache);
    const modifiers = {
      ...(providerConfig.modifiers || {}),
      ...(Number.isFinite(imageConfig.quality) ? { quality: Math.round(imageConfig.quality) } : {}),
      ...(typeof imageConfig.format === "string" ? { format: imageConfig.format } : {}),
      ...(options.modifiers || {}),
      ...(Number.isFinite(options.width) ? { width: Math.round(options.width) } : {}),
      ...(Number.isFinite(options.height) ? { height: Math.round(options.height) } : {}),
      ...(Number.isFinite(options.quality) ? { quality: Math.round(options.quality) } : {}),
      ...(typeof options.fit === "string" ? { fit: options.fit } : {}),
      ...(typeof options.format === "string" ? { format: options.format } : {})
    };
    const normalizedFormat = normalizeClientImageOutputFormat(
      typeof modifiers.format === "string" ? modifiers.format : undefined
    );

    if (baseURL.includes("{src}")) {
      let resolved = baseURL.replaceAll("{src}", encodeURIComponent(normalizedSrc));
      for (const [key, value] of Object.entries(modifiers)) {
        resolved = resolved.replaceAll("{" + key + "}", encodeURIComponent(String(value)));
      }
      return resolved;
    }

    const query = new URLSearchParams();
    const sourceDescriptor = providerName === "vercel"
      ? { publicSource: normalizedSrc }
      : rewriteClientImageSourceForDisplayFormat(normalizedSrc, normalizedFormat);
    const useGeneratedCache = providerName === "resux" && typeof cacheOption === "string" && cacheOption.length > 0;

    if (providerName === "vercel") {
      query.set("url", normalizedSrc);
    } else {
      query.set("src", sourceDescriptor.publicSource);
      if (sourceDescriptor.originalSource) {
        query.set("original", sourceDescriptor.originalSource);
      }
    }

    const width = Number(modifiers.width);
    const height = Number(modifiers.height);
    const quality = Number(modifiers.quality);
    if (Number.isFinite(width) && width > 0) query.set("w", String(Math.round(width)));
    if (Number.isFinite(height) && height > 0) query.set("h", String(Math.round(height)));
    if (Number.isFinite(quality) && quality > 0) query.set("q", String(Math.round(quality)));
    if (typeof modifiers.fit === "string" && modifiers.fit) query.set("fit", modifiers.fit);
    if (normalizedFormat) {
      query.set("f", normalizedFormat);
    } else if (typeof modifiers.format === "string" && modifiers.format) {
      query.set("f", modifiers.format);
    }

    for (const [key, value] of Object.entries(modifiers)) {
      if (["width", "height", "quality", "fit", "format"].includes(key)) continue;
      if (value === undefined || value === null || value === false) continue;
      query.set(key, String(value));
    }

    if (useGeneratedCache) {
      query.set("cache", cacheOption);
      const generatedPath = createClientGeneratedImageRoutePath(
        sourceDescriptor.publicSource,
        sourceDescriptor.originalSource,
        normalizedFormat,
        modifiers,
      );
      const queryString = query.toString();
      return queryString ? generatedPath + "?" + queryString : generatedPath;
    }

    const separator = baseURL.includes("?") ? "&" : "?";
    return query.toString() ? baseURL + separator + query.toString() : baseURL;
  };
}

function normalizeClientImageCacheValue(value) {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }
  if (value === true) {
    return "1d";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return String(Math.round(value));
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
      return "1d";
    }
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
      return undefined;
    }
    return normalized;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["maxAge", "expiresIn", "ttl"]) {
      const normalized = normalizeClientImageCacheValue(value[key]);
      if (normalized) {
        return normalized;
      }
    }
  }
  return undefined;
}

function createClientGeneratedImageRoutePath(source, originalSource, normalizedFormat, modifiers) {
  const extension =
    normalizedFormat
    || inferClientImageExtensionFromSource(source)
    || inferClientImageExtensionFromSource(originalSource)
    || "bin";
  const signature = createClientImageTransformSignature(source, originalSource, normalizedFormat, modifiers);
  const digest = hashClientImageSignature(signature);
  return "/_resux/generated/images/" + digest + "." + extension;
}

function createClientImageTransformSignature(source, originalSource, normalizedFormat, modifiers) {
  const entries = ["src=" + source];
  if (originalSource) {
    entries.push("original=" + originalSource);
  }

  const width = Number(modifiers.width);
  if (Number.isFinite(width) && width > 0) {
    entries.push("w=" + Math.round(width));
  }
  const height = Number(modifiers.height);
  if (Number.isFinite(height) && height > 0) {
    entries.push("h=" + Math.round(height));
  }
  if (typeof modifiers.fit === "string" && modifiers.fit) {
    entries.push("fit=" + modifiers.fit);
  }
  if (normalizedFormat) {
    entries.push("f=" + normalizedFormat);
  }
  const quality = Number(modifiers.quality);
  if (Number.isFinite(quality) && quality > 0) {
    entries.push("q=" + Math.round(quality));
  }

  const extraKeys = Object.keys(modifiers)
    .filter((key) => !["width", "height", "quality", "fit", "format", "cache"].includes(key))
    .sort();
  for (const key of extraKeys) {
    const value = modifiers[key];
    if (value === undefined || value === null || value === false) {
      continue;
    }
    entries.push(key + "=" + String(value));
  }

  return entries.join("&");
}

function hashClientImageSignature(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function inferClientImageExtensionFromSource(value) {
  if (!value) {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("data:")) {
    const mimeMatch = /^data:image\/([a-zA-Z0-9.+-]+);/i.exec(trimmed);
    if (!mimeMatch) {
      return undefined;
    }
    const normalized = mimeMatch[1].toLowerCase();
    return normalized === "jpg" ? "jpeg" : normalized;
  }

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const dotIndex = withoutQuery.lastIndexOf(".");
  if (dotIndex < 0) {
    return undefined;
  }
  const extension = withoutQuery.slice(dotIndex + 1).toLowerCase();
  if (!extension) {
    return undefined;
  }
  return extension === "jpg" ? "jpeg" : extension;
}

function normalizeClientImageOutputFormat(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized === "jpg" ? "jpeg" : normalized;
}

function rewriteClientImageSourceForDisplayFormat(src, normalizedFormat) {
  if (!normalizedFormat) {
    return { publicSource: src };
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return { publicSource: src };
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const sourceUrl = new URL(src);
      const rewrittenPathname = rewriteClientImagePathExtension(sourceUrl.pathname, normalizedFormat);
      if (rewrittenPathname === sourceUrl.pathname) {
        return { publicSource: src };
      }
      sourceUrl.pathname = rewrittenPathname;
      return { publicSource: sourceUrl.toString(), originalSource: src };
    } catch {
      return { publicSource: src };
    }
  }

  const [pathPart, suffix = ""] = src.split(/(?=[?#])/);
  const rewrittenPath = rewriteClientImagePathExtension(pathPart, normalizedFormat);
  if (rewrittenPath === pathPart) {
    return { publicSource: src };
  }

  return { publicSource: rewrittenPath + suffix, originalSource: src };
}

function rewriteClientImagePathExtension(pathname, extension) {
  if (!pathname) {
    return pathname;
  }
  const normalizedExtension = extension.startsWith(".")
    ? extension.slice(1)
    : extension;
  const lastSlash = pathname.lastIndexOf("/");
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot > lastSlash) {
    return pathname.slice(0, lastDot + 1) + normalizedExtension;
  }
  return pathname + "." + normalizedExtension;
}

function normalizeClientImageSource(src, route) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("file:")) {
    return value;
  }
  if (value.startsWith("/")) return value;
  const basePath = route && typeof route.path === "string" && route.path.startsWith("/") ? route.path : "/";
  const directory = basePath.endsWith("/") ? basePath : basePath.slice(0, Math.max(basePath.lastIndexOf("/") + 1, 1));
  const resolved = new URL(value, "https://resux.local" + directory);
  return resolved.pathname + resolved.search + resolved.hash;
}

function readClientImageConfig(runtimeConfig) {
  const config = runtimeConfig && runtimeConfig.public ? runtimeConfig.public : {};
  const image = config.image || config.resuxImage || {};
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    return { providers: {} };
  }
  const providers = image.providers && typeof image.providers === "object" && !Array.isArray(image.providers)
    ? image.providers
    : {};
  const densities = Array.isArray(image.densities)
    ? image.densities.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry) && entry > 0).map((entry) => Math.round(entry))
    : undefined;
  return {
    provider: typeof image.provider === "string" ? image.provider : undefined,
    quality: Number.isFinite(image.quality)
      ? Math.min(100, Math.max(1, Math.round(Number(image.quality) || 1)))
      : undefined,
    format: typeof image.format === "string" ? image.format : undefined,
    cache: normalizeClientImageCacheValue(image.cache),
    densities: densities && densities.length ? densities : undefined,
    providers
  };
}

async function ensureClientPlugins(payload) {
  if (!payload || !Array.isArray(payload.plugins)) {
    return;
  }
  const app = getClientResuxApp(payload.route);

  for (const entry of payload.plugins) {
    if (!entry || entry.mode === "server" || typeof entry.id !== "string" || typeof entry.src !== "string") {
      continue;
    }
    if (clientPluginIds.has(entry.id)) {
      continue;
    }
    const imported = await import(/* @vite-ignore */ entry.src);
    const plugin = imported?.default ?? imported;
    if (typeof plugin === "function") {
      await plugin(app);
      getClientResuxApp(payload.route);
    }
    clientPluginIds.add(entry.id);
  }
}

async function ensureClientMiddleware(payload) {
  if (!payload || !Array.isArray(payload.middleware)) {
    return;
  }

  for (const entry of payload.middleware) {
    if (!entry || entry.mode !== "client" || typeof entry.id !== "string" || typeof entry.src !== "string") {
      continue;
    }
    if (clientMiddlewareById.has(entry.id)) {
      continue;
    }
    const imported = await import(/* @vite-ignore */ entry.src);
    const handler = imported?.default ?? imported;
    if (typeof handler === "function") {
      clientMiddlewareById.set(entry.id, {
        id: entry.id,
        name: String(entry.name ?? ""),
        global: Boolean(entry.global),
        handler
      });
    }
  }
}

function normalizeMiddlewareNames(value) {
  if (!value) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]).map((name) => String(name));
}

function normalizeClientMiddlewareResult(result) {
  if (result === undefined || result === null) {
    return null;
  }
  if (result === false) {
    return { type: "abort", statusCode: 403, message: "Navigation aborted" };
  }
  if (typeof result === "string") {
    return { type: "redirect", to: result, statusCode: 302 };
  }
  if (result.type === "redirect") {
    return {
      type: "redirect",
      to: result.to,
      statusCode: result.statusCode ?? 302
    };
  }
  if (result.type === "abort") {
    return {
      type: "abort",
      message: result.message ?? "Navigation aborted",
      statusCode: result.statusCode ?? 403
    };
  }
  if (typeof result.redirect === "string") {
    return { type: "redirect", to: result.redirect, statusCode: 302 };
  }
  if (result.redirect && typeof result.redirect === "object" && typeof result.redirect.to === "string") {
    return {
      type: "redirect",
      to: result.redirect.to,
      statusCode: result.redirect.statusCode ?? 302
    };
  }
  return null;
}

async function runClientRouteMiddleware(payload, fromRoute) {
  await ensureClientMiddleware(payload);
  const toRoute = payload?.route ?? fromRoute ?? { path: "/", params: {}, query: {} };
  const from = fromRoute ?? { path: "", params: {}, query: {} };
  const names = normalizeMiddlewareNames(payload?.pageMeta?.middleware);
  const allEntries = [...clientMiddlewareById.values()];
  const selected = [
    ...allEntries.filter((entry) => entry.global),
    ...names
      .map((name) => allEntries.find((entry) => entry.name === name))
      .filter(Boolean)
  ];

  for (const entry of selected) {
    const result = await entry.handler(toRoute, from);
    const normalized = normalizeClientMiddlewareResult(result);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function createClientComponent(definition) {
  return {
    async createScope(serializedScope, route) {
      const stateRefs = {};
      const asyncDataRefs = {};
      const pendingCompletions = [];
      const mountedCallbacks = [];
      const props = serializedScope.props ?? {};
      const setupContext = {
        props,
        ref,
        reactive,
        computed,
        watch,
        watchEffect,
        readonly,
        toRef,
        toRefs,
        unref,
        isRef,
        isReactive,
        isReadonly,
        nextTick,
        useState(key, factory) {
          if (!stateRefs[key]) {
            const hasValue = serializedScope.state && Object.prototype.hasOwnProperty.call(serializedScope.state, key);
            stateRefs[key] = ref(hasValue ? serializedScope.state[key] : factory?.());
          }
          return stateRefs[key];
        },
        useAsyncData(key, handler) {
          if (!asyncDataRefs[key]) {
            const snapshot = serializedScope.asyncData ? serializedScope.asyncData[key] : undefined;
            const resource = createAsyncDataResource(
              snapshot?.value,
              snapshot?.pending ?? false,
              snapshot?.error ?? null
            );
            asyncDataRefs[key] = resource;
            if (resource.pending.value && typeof handler === "function") {
              const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
              if (controller) {
                pendingAsyncDataControllers.add(controller);
                resource.abortController = controller;
              }
              const completion = settleAsyncDataResource(resource, handler, key, controller ? controller.signal : undefined)
                .finally(() => {
                  if (controller) {
                    pendingAsyncDataControllers.delete(controller);
                  }
                  resource.abortController = null;
                });
              resource.setCompletion(completion);
              pendingCompletions.push(completion);
            }
          }
          return asyncDataRefs[key];
        },
        defineProps() {
          return props;
        },
        useRoute() {
          return route;
        },
        useRouter() {
          return createClientRouter();
        },
        useHead() {
          // Head updates are server-rendered by Resux.
        },
        useSeoMeta() {
          // SEO meta updates are server-rendered by Resux.
        },
        useRuntimeConfig() {
          return getClientResuxApp(route).$config;
        },
        useResuxApp() {
          return getClientResuxApp(route);
        },
        useResuxImage() {
          return createClientImageBuilder(route, getClientResuxApp(route).$config);
        },
        apiURL(url) {
          return url;
        },
        useFetch(url, init) {
          const key = 