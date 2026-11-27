// Client runtime source, part 2 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart02 = String.raw`
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
const __rxProxyToRaw = new WeakMap();
let __rxActiveEffect;
let __rxShouldTrack = true;
const __rxTrackStack = [];
const __rxQueue = new Set();
const __rxPostFlushQueue = new Set();
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

function setEnhancementBound(target, bound) {
  if (bound) {
    target.dataset.rxEnhancementBound = "true";
  } else {
    delete target.dataset.rxEnhancementBound;
  }
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
        for (const activate of callbacks) {
          activate();
        }
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, callbacks] of resuxVisibleEnhancementCallbacks) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          for (const activate of callbacks) {
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
  const isNewTarget = callbacks === undefined;
  callbacks ??= new Set();
  if (isNewTarget) {
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
  const css = normalizePackageCssInput(options.css).sort().join(",");
  const exportName = typeof options.exportName === "string" ? options.exportName : "";
  const mode = normalizePackageMode(options.mode, options.clientOnly ? "clientOnly" : "ssr");
  const preferDefault = options.preferDefault === false ? "0" : "1";
  return name + "::" + mode + "::" + preferDefault + "::" + exportName + "::" + css;
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
  void loader.catch(() => {
    if (resuxLazyPackageCache.get(key) === loader) {
      resuxLazyPackageCache.delete(key);
    }
  });
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
    const cancel = observeVisibleEnhancement(target, fire);
    logEnhancementDebug("observing visible trigger " + name);
    return cancel;
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
  const shouldWarnIfIdle = trigger === "immediate" || trigger === "idle";

  if (shouldWarnIfIdle) {
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
      if (disposed) {
        if (typeof teardown === "function") {
          await teardown();
        }
        teardown = undefined;
        return;
      }
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
    resuxScheduledEnhancementDisposers.delete(dispose);
    resuxBoundEnhancementTargets.delete(target);
    resuxDeclaredEnhancementActivators.delete(target);
    setEnhancementBound(target, false);
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

  resuxScheduledEnhancementDisposers.add(dispose);

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
  useViewTransition,
};

async function disposeClientEnhancements() {
  const scheduledDisposers = [...resuxScheduledEnhancementDisposers];
  resuxScheduledEnhancementDisposers.clear();
  for (const dispose of scheduledDisposers) {
    try {
      await dispose();
    } catch {
    }
  }

  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
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

function collectDeclaredClientEnhancementElements(root) {
  const selector = "[data-resux-enhancement], [use-client-enhancement]";
  const elements = [...root.querySelectorAll(selector)];
  if (typeof root.matches === "function" && root.matches(selector)) {
    elements.unshift(root);
  }
  return elements;
}

function readDeclaredClientEnhancement(element) {
  const name = (
    element.getAttribute("data-resux-enhancement")
    ?? element.getAttribute("use-client-enhancement")
    ?? ""
  ).trim();
  if (!name) {
    return null;
  }

  const trigger = normalizeEnhancementTrigger(
    element.getAttribute("data-resux-trigger")
    ?? element.getAttribute("data-trigger")
    ?? element.getAttribute("trigger"),
    "visible",
  );
  const optionsAttributeValue = (
    element.getAttribute("data-resux-options")
    ?? element.getAttribute("data-resux-enhancement-options")
    ?? element.getAttribute("data-enhancement-options")
    ?? element.getAttribute("data-options")
  );
  const parsedOptions = parseEnhancementOptions(optionsAttributeValue, name);
  if (optionsAttributeValue !== null) {
    element.setAttribute("data-resux-options", optionsAttributeValue);
  }
  return {
    name,
    trigger,
    options: parsedOptions.options,
    error: parsedOptions.error,
  };
}

function reportDeclaredClientEnhancementError(element, declaration, error) {
  setEnhancementStatus(element, "error");
  element.setAttribute("data-rx-enhancement-error", error);
  dispatchEnhancementEvent("error", {
    name: declaration.name,
    trigger: declaration.trigger,
    elementId: readEnhancementElementId(element),
    error,
  });
}

function prepareDeclaredClientEnhancement(element, declaration) {
  resuxBoundEnhancementTargets.add(element);
  element.setAttribute("data-resux-enhancement", declaration.name);
  element.setAttribute("data-resux-trigger", declaration.trigger);
  element.setAttribute("data-rx-enhancement", declaration.name);
  element.setAttribute("data-rx-enhancement-trigger", declaration.trigger);
  setEnhancementStatus(element, "found");
  dispatchEnhancementEvent("found", {
    name: declaration.name,
    trigger: declaration.trigger,
    elementId: readEnhancementElementId(element),
  });
  logEnhancementDebug("found element " + declaration.name + " trigger=" + declaration.trigger);
}

async function activateDeclaredClientEnhancement(element, forceActivate = false) {
  if (resuxBoundEnhancementTargets.has(element)) {
    if (forceActivate) {
      const activate = resuxDeclaredEnhancementActivators.get(element);
      if (activate) await activate();
    }
    return;
  }
  const declaration = readDeclaredClientEnhancement(element);
  if (!declaration) {
    return;
  }
  if (declaration.error) {
    reportDeclaredClientEnhancementError(element, declaration, declaration.error);
    return;
  }

  prepareDeclaredClientEnhancement(element, declaration);
  try {
    const enhancement = await useClientEnhancement(declaration.name, {
      target: element,
      trigger: declaration.trigger,
      options: declaration.options,
    });
    resuxDeclaredEnhancementActivators.set(element, enhancement.activate);
    setEnhancementBound(element, true);
    if (forceActivate) {
      await enhancement.activate();
    }
    element.removeAttribute("data-rx-enhancement-error");
  } catch (error) {
    resuxBoundEnhancementTargets.delete(element);
    resuxDeclaredEnhancementActivators.delete(element);
    setEnhancementBound(element, false);
    reportDeclaredClientEnhancementError(
      element,
      declaration,
      getEnhancementErrorMessage(error),
    );
  }
}

async function activateDeclaredClientEnhancements(root = document) {
  if (!isClientRuntime() || !root || typeof root.querySelectorAll !== "function") {
    return;
  }
  logEnhancementDebug("scanning DOM");
  for (const element of collectDeclaredClientEnhancementElements(root)) {
    await activateDeclaredClientEnhancement(element);
  }
}


const __rxIterateKey = Symbol("iterate");
const __rxMapKeyIterateKey = Symbol("Map key iterate");

function __rxIsObject(value) {
  return value !== null && typeof value === "object";
}

function __rxHasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}

function __rxStartFlush() {
  if (__rxFlushing) {
    return;
  }
  __rxFlushing = true;
  __rxFlushPromise = __rxResolvedPromise.then(__rxFlushJobs);
  // Mark the flush as handled so fire-and-forget queued jobs do not produce
  // an unhandled rejection; nextTick awaiters still observe it (mirrors the
  // server scheduler).
  __rxFlushPromise.catch(__rxNoopErrorObserver);
}

function __rxNoopErrorObserver() {
  // Intentionally empty: the rejection remains visible through nextTick().
}

function __rxQueueJob(job) {
  __rxQueue.add(job);
  __rxStartFlush();
}

function __rxQueuePostFlushCb(job) {
  __rxPostFlushQueue.add(job);
  __rxStartFlush();
}

function __rxFlushJobs() {
  let didError = false;
  let firstError;
  const executionCounts = new Map();
  const runJobs = (jobs) => {
    for (const job of jobs) {
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
  };
  try {
    let hasJobs = true;
    while (hasJobs) {
      hasJobs = false;
      if (__rxQueue.size > 0) {
        const currentQueue = [...__rxQueue];
        __rxQueue.clear();
        runJobs(currentQueue);
        hasJobs = true;
      }
      if (__rxPostFlushQueue.size > 0) {
        const currentPostQueue = [...__rxPostFlushQueue];
        __rxPostFlushQueue.clear();
        runJobs(currentPostQueue);
        hasJobs = true;
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

function nextTick(fn) {
  const promise = __rxFlushPromise || __rxResolvedPromise;
  return fn ? promise.then(fn) : promise;
}

function __rxCleanupEffect(reactiveEffect) {
  for (const dep of reactiveEffect.deps) {
    dep.delete(reactiveEffect);
  }
  reactiveEffect.deps.length = 0;
}

function __rxTriggerEffects(dep) {
  for (const reactiveEffect of [...dep]) {
    if (reactiveEffect === __rxActiveEffect) {
      continue;
    }
    if (reactiveEffect.scheduler) {
      reactiveEffect.scheduler();
    } else {
      reactiveEffect.run();
    }
  }
}

class __rxReactiveEffect {
  constructor(fn, scheduler, onStop) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.onStop = onStop;
    this.active = true;
    this.deps = [];
    this.parent = undefined;
  }

  run() {
    if (!this.active) {
      return this.fn();
    }
    let parent = __rxActiveEffect;
    while (parent) {
      if (parent === this) {
        return undefined;
      }
      parent = parent.parent;
    }
    __rxCleanupEffect(this);
    this.parent = __rxActiveEffect;
    __rxActiveEffect = this;
    __rxTrackStack.push(__rxShouldTrack);
    __rxShouldTrack = true;
    try {
      return this.fn();
    } finally {
      __rxShouldTrack = __rxTrackStack.pop() ?? true;
      __rxActiveEffect = this.parent;
      this.parent = undefined;
    }
  }

  stop() {
    if (!this.active) {
      return;
    }
    __rxCleanupEffect(this);
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

function __rxTrigger(target, key, type = "set", newValue) {
  const depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    return;
  }
  const effects = new Set();
  const addEffects = (dep) => {
    if (!dep) return;
    for (const effect of dep) effects.add(effect);
  };
  if (type === "clear") {
    // Clearing a collection invalidates every dependency it owns.
    for (const dep of depsMap.values()) {
      addEffects(dep);
    }
  } else if (Array.isArray(target) && key === "length") {
    // Truncating or extending an array via its length invalidates the length,
    // iteration, and every index at or past the new length (mirrors the
    // server engine's trigger()).
    const nextLength = Number(newValue);
    for (const [depKey, dep] of depsMap) {
      if (
        depKey === "length"
        || depKey === __rxIterateKey
        || (__rxIsArrayIndex(depKey) && Number(depKey) >= nextLength)
      ) {
        addEffects(dep);
      }
    }
  } else {
    addEffects(depsMap.get(key));
    if (type === "add" || type === "delete") {
      addEffects(depsMap.get(__rxIterateKey));
      if (target instanceof Map) {
        addEffects(depsMap.get(__rxMapKeyIterateKey));
      }
    } else if (type === "set" && target instanceof Map) {
      // A changed value is visible to values()/entries()/forEach iteration and
      // size, which all track ITERATE_KEY on maps. keys() iteration is not
      // affected by value changes.
      addEffects(depsMap.get(__rxIterateKey));
    }
  }
  __rxTriggerEffects(effects);
}

function reactive(target) {
  return __rxCreateReactiveObject(target, false, __rxReactiveMap, false);
}

function readonly(target) {
  return __rxCreateReactiveObject(target, true, __rxReadonlyMap, false);
}

function __rxGetTargetType(target) {
  switch (Object.prototype.toString.call(target)) {
    case "[object Object]":
    case "[object Array]":
      return "common";
    case "[object Map]":
    case "[object Set]":
    case "[object WeakMap]":
    case "[object WeakSet]":
      return "collection";
    default:
      return "invalid";
  }
}

function __rxIsArrayIndex(key) {
  if (typeof key === "symbol" || key === "length") {
    return false;
  }
  const value = String(key);
  return /^(?:0|[1-9]\d*)$/.test(value) && Number(value) < 4294967295;
}

function toRaw(value) {
  let current = value;
  while (__rxIsObject(current)) {
    const raw = __rxProxyToRaw.get(current);
    if (!raw || raw === current) {
      break;
    }
    current = raw;
  }
  return current;
}

// --- Collection (Map / Set / WeakMap / WeakSet) instrumentation ------------
// Mirrors src/reactivity/reactive.ts so resumed client scopes behave exactly
// like the server engine.

function __rxWrapCollectionValue(value, isReadonlyValue) {
  if (!__rxIsObject(value)) {
    return value;
  }
  return isReadonlyValue ? readonly(value) : reactive(value);
}

function __rxCreateIterableMethod(method, isReadonlyValue) {
  return function () {
    const target = toRaw(this);
    const isMap = target instanceof Map;
    const isKeys = method === "keys";
    __rxTrack(target, isKeys && isMap ? __rxMapKeyIterateKey : __rxIterateKey);
    const resolved = method === Symbol.iterator ? (isMap ? "entries" : "values") : method;
    const inner = target[resolved].call(target);
    const wrap = (value) => __rxWrapCollectionValue(value, isReadonlyValue);
    const isEntries = resolved === "entries";

    return {
      next() {
        const { value, done } = inner.next();
        if (done) {
          return { value, done: true };
        }
        if (isEntries) {
          return { value: [wrap(value[0]), wrap(value[1])], done: false };
        }
        return { value: wrap(value), done: false };
      },
      [Symbol.iterator]() {
        return this;
      }
    };
  };
}

function __rxCreateCollectionInstrumentations(isReadonlyValue) {
  const wrap = (value) => __rxWrapCollectionValue(value, isReadonlyValue);

  return {
    get(key) {
      const target = toRaw(this);
      const rawKey = toRaw(key);
      __rxTrack(target, rawKey);
      if (rawKey !== key) {
        __rxTrack(target, key);
      }
      let result = target.get(rawKey);
      if (result === undefined && rawKey !== key) {
        result = target.get(key);
      }
      return wrap(result);
    },

    has(key) {
      const target = toRaw(this);
      const rawKey = toRaw(key);
      __rxTrack(target, rawKey);
      if (rawKey !== key) {
        __rxTrack(target, key);
      }
      return target.has(rawKey) || (rawKey !== key && target.has(key));
    },

    get size() {
      // 'this' is the receiver (the proxy) because instrumentations are read
      // via Reflect.get(instrumentations, key, receiver).
      const target = toRaw(this);
      __rxTrack(target, __rxIterateKey);
      return target.size;
    },

    set(key, value) {
      if (isReadonlyValue) {
        return this;
      }
      const target = toRaw(this);
      const rawKey = toRaw(key);
      const rawValue = toRaw(value);
      const hadKey = target.has(rawKey);
      const oldValue = target.get(rawKey);
      target.set(rawKey, rawValue);
      if (!hadKey) {
        __rxTrigger(target, rawKey, "add");
      } else if (!Object.is(rawValue, toRaw(oldValue))) {
        __rxTrigger(target, rawKey, "set");
      }
      return this;
    },

    add(value) {
      if (isReadonlyValue) {
        return this;
      }
      const target = toRaw(this);
      const rawValue = toRaw(value);
      const hadKey = target.has(rawValue);
      target.add(rawValue);
      if (!hadKey) {
        __rxTrigger(target, rawValue, "add");
      }
      return this;
    },

    delete(key) {
      if (isReadonlyValue) {
        return false;
      }
      const target = toRaw(this);
      const rawKey = toRaw(key);
      const hadKey = target.has(rawKey);
      const success = target.delete(rawKey);
      if (hadKey && success) {
        __rxTrigger(target, rawKey, "delete");
      }
      return success;
    },

    clear() {
      if (isReadonlyValue) {
        return undefined;
      }
      const target = toRaw(this);
      const hadItems = target.size !== 0;
      target.clear();
      if (hadItems) {
        __rxTrigger(target, __rxIterateKey, "clear");
      }
      return undefined;
    },

    forEach(callback, thisArg) {
      const target = toRaw(this);
      __rxTrack(target, __rxIterateKey);
      target.forEach((value, key) => {
        callback.call(thisArg, wrap(value), wrap(key), this);
      });
    },

    keys: __rxCreateIterableMethod("keys", isReadonlyValue),
    values: __rxCreateIterableMethod("values", isReadonlyValue),
    entries: __rxCreateIterableMethod("entries", isReadonlyValue),
    [Symbol.iterator]: __rxCreateIterableMethod(Symbol.iterator, isReadonlyValue)
  };
}

const __rxMutableCollectionInstrumentations = __rxCreateCollectionInstrumentations(false);
const __rxReadonlyCollectionInstrumentations = __rxCreateCollectionInstrumentations(true);

function __rxCollectionGet(instrumentations, isReadonlyValue, rawTarget, key, receiver) {
  if (key === __rxFlags.isReactive) {
    return !isReadonlyValue;
  }
  if (key === __rxFlags.isReadonly) {
    return isReadonlyValue;
  }
  if (key === __rxFlags.raw) {
    return rawTarget;
  }
  const source = Object.prototype.hasOwnProperty.call(instrumentations, key) && key in rawTarget
    ? instrumentations
    : rawTarget;
  return Reflect.get(source, key, receiver);
}

function __rxCreateReactiveObject(target, isReadonlyValue, proxyMap, isShallow) {
  const targetType = __rxIsObject(target) ? __rxGetTargetType(target) : "invalid";
  if (targetType === "invalid") {
    return target;
  }
  if (__rxProxyToRaw.has(target) && !(isReadonlyValue && isReactive(target))) {
    return target;
  }
  const existing = proxyMap.get(target);
  if (existing) {
    return existing;
  }
  let proxy;
  if (targetType === "collection") {
    const instrumentations = isReadonlyValue
      ? __rxReadonlyCollectionInstrumentations
      : __rxMutableCollectionInstrumentations;
    proxy = new Proxy(target, {
      get(rawTarget, key, receiver) {
        return __rxCollectionGet(instrumentations, isReadonlyValue, rawTarget, key, receiver);
      }
    });
  } else {
    proxy = new Proxy(target, {
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
        // Vue-style ref unwrapping on plain object property access. Refs
        // stored at array indices stay wrapped, matching the server engine.
        if (isRef(value)) {
          return !Array.isArray(rawTarget) || !__rxIsArrayIndex(key)
            ? value.value
            : value;
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
        const hadKey = Object.prototype.hasOwnProperty.call(rawTarget, key);
        const storedOldValue = Reflect.get(rawTarget, key, receiver);
        const oldLength = Array.isArray(rawTarget) ? rawTarget.length : 0;
        // Vue-style ref assignment: writing a plain value over a stored ref
        // updates the ref in place instead of replacing it. Arrays exempt.
        if (!Array.isArray(rawTarget) && isRef(storedOldValue) && !isRef(value)) {
          storedOldValue.value = value;
          return true;
        }
        const oldValue = toRaw(storedOldValue);
        const rawValue = toRaw(value);
        const success = Reflect.set(rawTarget, key, rawValue, receiver);
        if (success && (!hadKey || __rxHasChanged(rawValue, oldValue))) {
          __rxTrigger(rawTarget, key, hadKey ? "set" : "add", rawValue);
          if (
            Array.isArray(rawTarget)
            && key !== "length"
            && /^(?:0|[1-9]\d*)$/.test(String(key))
            && Number(key) >= oldLength
            && Number(key) < 4294967295
          ) {
            __rxTrigger(rawTarget, "length");
          }
        }
        return success;
      },
      has(rawTarget, key) {
        const result = Reflect.has(rawTarget, key);
        if (!isReadonlyValue) {
          __rxTrack(rawTarget, key);
        }
        return result;
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
      }
    });
  }
  proxyMap.set(target, proxy);
  __rxProxyToRaw.set(proxy, target);
  return proxy;
}

function isReactive(value) {
  if (!__rxIsObject(value)) {
    return false;
  }
  if (value[__rxFlags.isReactive]) {
    return true;
  }
  if (value[__rxFlags.isReadonly]) {
    const raw = __rxProxyToRaw.get(value);
    return Boolean(raw && raw !== value && isReactive(raw));
  }
  return false;
}

function isReadonly(value) {
  return Boolean(__rxIsObject(value) && value[__rxFlags.isReadonly]);
}

class __rxRefImpl {
  constructor(value) {
    this.__v_isRef = true;
    this._rawValue = toRaw(value);
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
    const rawValue = toRaw(newValue);
    if (!__rxHasChanged(rawValue, this._rawValue)) {
      return;
    }
    this._rawValue = rawValue;
    this._value = __rxIsObject(newValue) ? reactive(newValue) : newValue;
    __rxTriggerEffects(this.dep);
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
`;
