// Client runtime source, part 3 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart03 = String.raw`
function toRef(object, key, defaultValue) {
  const value = object[key];
  return isRef(value) ? value : new __rxObjectRef(object, key, defaultValue);
}

function toRefs(object) {
  const output = Array.isArray(object) ? new Array(object.length) : {};
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
        __rxTriggerEffects(dep);
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
  const deep = options.deep === true
    || (callback !== null && __rxContainsReactiveSource(source));
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
  let stopped = false;

  const job = () => {
    if (stopped) {
      return;
    }

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
    : () => __rxQueuePostFlushCb(job);

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
    if (stopped) {
      return;
    }
    stopped = true;
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

function __rxContainsReactiveSource(source) {
  if (isReactive(source)) {
    return true;
  }
  return Array.isArray(source) && source.some((entry) => isReactive(entry));
}

function __rxTraverse(value, seen = new Set()) {
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

let clientNoPrefixLocaleRef = null;

function readClientI18nConfig() {
  return normalizeClientI18nConfig(getClientResuxApp().$config);
}

function normalizeClientI18nConfig(runtimeConfig) {
  const raw = runtimeConfig?.public?.i18n;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.locales) || raw.locales.length === 0) {
    return null;
  }
  const locales = raw.locales
    .map((entry) => ({
      code: String(entry?.code || "").trim().toLowerCase(),
      name: typeof entry?.name === "string" ? entry.name : undefined,
      dir: entry?.dir === "rtl" ? "rtl" : "ltr"
    }))
    .filter((entry) => entry.code);
  if (!locales.length) return null;
  const defaultLocale = locales.some((entry) => entry.code === String(raw.defaultLocale || "").toLowerCase())
    ? String(raw.defaultLocale).toLowerCase()
    : locales[0].code;
  const fallbackLocale = locales.some((entry) => entry.code === String(raw.fallbackLocale || "").toLowerCase())
    ? String(raw.fallbackLocale).toLowerCase()
    : defaultLocale;
  const strategy = raw.strategy === "prefix" || raw.strategy === "no_prefix"
    ? raw.strategy
    : "prefix_except_default";
  return { locales, defaultLocale, fallbackLocale, strategy, messages: raw.messages || {} };
}

function splitClientI18nTarget(to) {
  const base = typeof location !== "undefined" ? location.href : "http://resux.local/";
  const url = new URL(String(to || "/"), base);
  return { pathname: url.pathname || "/", search: url.search, hash: url.hash };
}

function clientI18nLogicalPath(pathname, config) {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const locale = config.locales.find((entry) => entry.code === first);
  if (!locale || config.strategy === "no_prefix") return normalized;
  const rest = segments.slice(1).join("/");
  return rest ? "/" + rest : "/";
}

function resolveClientI18nLocaleCode(config, routePath) {
  if (config.strategy === "no_prefix") {
    clientNoPrefixLocaleRef ||= ref(config.defaultLocale);
    return clientNoPrefixLocaleRef.value;
  }
  const { pathname } = splitClientI18nTarget(routePath || getClientResuxApp().route?.path || "/");
  const first = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return config.locales.some((entry) => entry.code === first) ? first : config.defaultLocale;
}

function readClientTranslation(messages, localeCode, key) {
  const forbidden = new Set(["__proto__", "prototype", "constructor"]);
  let current = messages?.[localeCode];
  for (const part of String(key || "").split(".")) {
    if (!part || forbidden.has(part) || !current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function interpolateClientTranslation(value, params = {}) {
  if (typeof value !== "string") return value;
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    const param = params[key];
    if (param === undefined || param === null) return match;
    return String(param);
  });
}

function buildClientLocalePath(to, localeCode, config) {
  const targetLocale = config.locales.find((entry) => entry.code === String(localeCode || "").toLowerCase());
  if (!targetLocale) return String(to || "/");
  const { pathname, search, hash } = splitClientI18nTarget(to);
  const logical = clientI18nLogicalPath(pathname, config);
  let localized = logical;
  if (config.strategy === "prefix" || (config.strategy === "prefix_except_default" && targetLocale.code !== config.defaultLocale)) {
    localized = logical === "/" ? "/" + targetLocale.code : "/" + targetLocale.code + logical;
  }
  return localized + search + hash;
}

function useClientI18n(routeOverride) {
  const config = readClientI18nConfig();
  if (!config) {
    return {
      locale: ref("en"), dir: ref("ltr"), locales: [], defaultLocale: "en", fallbackLocale: "en", strategy: "prefix_except_default",
      t: (key) => key, tm: (key) => key, resolveLocalized: (value) => value,
      localePath: (to) => to, switchLocalePath: (_locale, to) => to || getClientResuxApp().route?.path || "/", setLocale: () => {}
    };
  }
  const routePath = getClientResuxApp().route?.path || routeOverride?.path || (typeof location !== "undefined" ? location.pathname + location.search + location.hash : "/");
  const locale = computed(() => {
    getClientRouteRevision().value;
    return resolveClientI18nLocaleCode(config, getClientResuxApp().route?.path || routePath);
  });
  const dir = computed(() => config.locales.find((entry) => entry.code === locale.value)?.dir || "ltr");
  const t = (key, params = {}) => {
    const value = readClientTranslation(config.messages, locale.value, key) ?? readClientTranslation(config.messages, config.fallbackLocale, key);
    if (typeof value === "string") return interpolateClientTranslation(value, params);
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return String(key);
  };
  const tm = (key) => readClientTranslation(config.messages, locale.value, key) ?? readClientTranslation(config.messages, config.fallbackLocale, key) ?? key;
  return {
    locale, dir, locales: config.locales, defaultLocale: config.defaultLocale, fallbackLocale: config.fallbackLocale, strategy: config.strategy, t, tm,
    resolveLocalized(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value == null ? null : String(value);
      return value[locale.value] ?? value[config.fallbackLocale] ?? value[config.defaultLocale] ?? null;
    },
    localePath(to, localeCode = locale.value) { return buildClientLocalePath(to, localeCode, config); },
    switchLocalePath(localeCode, to) {
      const current = to || (typeof location !== "undefined" ? location.pathname + location.search + location.hash : routePath);
      return buildClientLocalePath(current, localeCode, config);
    },
    setLocale(localeCode, to) {
      const targetLocale = config.locales.find((entry) => entry.code === String(localeCode || "").toLowerCase());
      if (!targetLocale) return;
      if (config.strategy === "no_prefix") {
        clientNoPrefixLocaleRef ||= ref(config.defaultLocale);
        clientNoPrefixLocaleRef.value = targetLocale.code;
        if (typeof document !== "undefined") {
          document.documentElement?.setAttribute("lang", targetLocale.code);
          document.documentElement?.setAttribute("dir", targetLocale.dir);
        }
        return;
      }
      const current = to || (typeof location !== "undefined" ? location.pathname + location.search + location.hash : routePath);
      return createClientRouter().push(buildClientLocalePath(current, targetLocale.code, config));
    }
  };
}

function getClientResuxApp(routeOverride) {
  const payload = globalThis.__RESUX__ ?? {
    route: routeOverride ?? { path: "/", params: {}, query: {} },
    scopes: {},
    globalState: {},
    modules: {},
    config: { public: {} }
  };
  const route = payload.route ?? routeOverride ?? { path: "/", params: {}, query: {} };
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
    const previousRoutePath = app.route?.path;
    app.route = route;
    app.payload = payload;
    app.$config = config;
    app.provides = clientProvides;
    if (previousRoutePath !== route?.path) {
      getClientRouteRevision().value += 1;
    }
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


function useClientGlobalState(key, factory) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error("useGlobalState(key) requires a non-empty key.");
  }

  if (!globalStateRefs.has(normalizedKey)) {
    const payload = globalThis.__RESUX__;
    const snapshot = payload && payload.globalState ? payload.globalState : Object.create(null);
    const hasValue = Object.prototype.hasOwnProperty.call(snapshot, normalizedKey);
    const value = hasValue ? snapshot[normalizedKey] : (typeof factory === "function" ? factory() : undefined);
    const label = 'useGlobalState("' + normalizedKey + '")';
    const serializedValue = cloneJsonSerializable(value, label);
    const stateRef = ref(value);
    globalStateSnapshots.set(normalizedKey, serializedValue);

    watch(stateRef, () => {
      try {
        const nextSnapshot = cloneJsonSerializable(stateRef.value, label);
        globalStateSnapshots.set(normalizedKey, nextSnapshot);
        const currentPayload = globalThis.__RESUX__;
        if (currentPayload) {
          currentPayload.globalState ||= Object.create(null);
          setSerializableRecordValue(currentPayload.globalState, normalizedKey, nextSnapshot);
        }
        queueGlobalStateRefresh(normalizedKey);
      } catch (error) {
        console.error("[resux:global-state] Reverting a non-serializable assignment for " + normalizedKey + ".", error);
        if (globalStateSnapshots.has(normalizedKey)) {
          stateRef.value = cloneJsonSerializable(globalStateSnapshots.get(normalizedKey), label);
        }
      }
    }, { flush: "post", deep: true });

    globalStateRefs.set(normalizedKey, stateRef);
  }

  return globalStateRefs.get(normalizedKey);
}

function serializeClientGlobalState() {
  const output = Object.create(null);
  for (const [key, stateRef] of globalStateRefs.entries()) {
    const label = 'useGlobalState("' + key + '")';
    try {
      const snapshot = cloneJsonSerializable(stateRef.value, label);
      globalStateSnapshots.set(key, snapshot);
      setSerializableRecordValue(output, key, snapshot);
    } catch (error) {
      console.error("[resux:global-state] Reverting a non-serializable assignment for " + key + ".", error);
      if (!globalStateSnapshots.has(key)) {
        continue;
      }
      const snapshot = cloneJsonSerializable(globalStateSnapshots.get(key), label);
      stateRef.value = cloneJsonSerializable(snapshot, label);
      setSerializableRecordValue(output, key, snapshot);
    }
  }
  return output;
}

function mergeClientGlobalState(payload) {
  if (!payload) {
    return payload;
  }
  const merged = Object.create(null);
  for (const [key, value] of Object.entries(payload.globalState || {})) {
    setSerializableRecordValue(merged, key, value);
  }
  for (const [key, value] of Object.entries(serializeClientGlobalState())) {
    setSerializableRecordValue(merged, key, value);
  }
  payload.globalState = merged;
  return payload;
}

function queueGlobalStateRefresh(key) {
  dirtyGlobalStateKeys.add(key);
  if (globalStateRefreshQueued) {
    return;
  }
  globalStateRefreshQueued = true;
  queueMicrotask(() => {
    globalStateRefreshQueued = false;
    const changedKeys = new Set(dirtyGlobalStateKeys);
    dirtyGlobalStateKeys.clear();
    void refreshScopesForGlobalState(changedKeys);
  });
}

async function refreshScopesForGlobalState(changedKeys) {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules || changedKeys.size === 0) {
    return;
  }

  const affectedScopes = [...scopeCache.entries()].filter(([scopeId]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      return false;
    }
    const keys = Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : [];
    return keys.some((key) => changedKeys.has(key));
  });

  // Scopes that never ran a handler (a layout that only reads the key) are not resumed yet. Resume them
  // here so their bindings refresh too, as the docs promise for every scope that reads the key.
  for (const [scopeId, serializedScope] of Object.entries(payload.scopes)) {
    if (!serializedScope || scopeCache.has(scopeId)) {
      continue;
    }
    const keys = Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : [];
    if (!keys.some((key) => changedKeys.has(key))) {
      continue;
    }
    try {
      const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
      if (!component) {
        continue;
      }
      const record = await component.createScope(serializedScope, payload.route);
      scopeCache.set(scopeId, record);
      affectedScopes.push([scopeId, record]);
    } catch (error) {
      console.error("[resux:global-state] Failed to resume scope " + scopeId + ".", error);
    }
  }

  beginManagedTeleportPatchBatch();
  try {
    await Promise.allSettled(affectedScopes.map(async ([scopeId, scopeRecord]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      return;
    }

    try {
      const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
      if (!component) {
        return;
      }

      const patches = component.render(scopeRecord);
      const serialized = component.serialize(scopeRecord);
      serializedScope.props = serialized.props;
      serializedScope.state = serialized.state;
      serializedScope.asyncData = serialized.asyncData;
      applyPatches(scopeId, patches, { flushDeferredTeleports: false });
    } catch (error) {
      console.error("[resux:global-state] Failed to refresh scope " + scopeId + ".", error);
    }
  }));
  } finally {
    endManagedTeleportPatchBatch();
  }
}

function normalizeComponentRegistryKey(key, apiName) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error(apiName + "(key) requires a non-empty key.");
  }
  return normalizedKey;
}

function hasOwnRegistryKey(registry, key) {
  return Object.prototype.hasOwnProperty.call(registry, key);
}

function setRegistryValue(registry, key, value) {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function isPlainJsonBody(body) {
  if (body === null || typeof body !== "object") return false;
  if (Array.isArray(body)) return true;
  const proto = Object.getPrototypeOf(body);
  return proto === Object.prototype || proto === null;
}

function prepareFetchInit(init) {
  if (!init || !isPlainJsonBody(init.body)) return init;
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  return Object.assign({}, init, { headers, body: JSON.stringify(init.body) });
}

async function createFetchError(url, response) {
  const error = new Error("Fetch failed for " + url + ": " + response.status);
  error.status = response.status;
  error.statusMessage = response.statusText;
  let data;
  try {
    const text = await response.text();
    try { data = JSON.parse(text); } catch { data = text === "" ? undefined : text; }
  } catch {
    data = undefined;
  }
  error.data = data;
  return error;
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
  if (isPlainJsonBody(body)) return ["json", JSON.stringify(body)];
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
    const bytes = new Uint8Array(body);
    return ["array-buffer", bytes.byteLength, hashFetchBytes(bytes)];
  }
  if (ArrayBuffer.isView(body)) {
    const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    return ["array-buffer-view", bytes.byteLength, hashFetchBytes(bytes)];
  }
  return ["body", Object.prototype.toString.call(body)];
}

function hashFetchBytes(bytes) {
  let first = 2166136261;
  let second = 2246822519;
  for (const byte of bytes) {
    first = Math.imul(first ^ byte, 16777619);
    second = Math.imul(second ^ byte, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
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

function bindTemplateRefs(scope, definition, scopeId) {
  if (!scope || typeof scope !== "object") return;
  const refNames = new Set(Array.isArray(definition.templateRefs) ? definition.templateRefs : []);
  const forRefNames = new Set(Array.isArray(definition.templateForRefs) ? definition.templateForRefs : []);
  if (Array.isArray(definition.template)) {
    const collect = (nodes) => {
      for (const n of nodes) {
        if (n && n.type === "element") {
          if (n.ref) refNames.add(n.ref);
          if (Array.isArray(n.attrs)) {
            for (const a of n.attrs) {
              if (a.name === "ref" && a.kind === "static" && a.value) {
                refNames.add(a.value);
              }
            }
          }
          if (Array.isArray(n.children)) collect(n.children);
        }
      }
    };
    collect(definition.template);
  }
  const scopeRefPrefix = String(scopeId || "") + ":";
  if (scopeRefPrefix !== ":" && typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
    const escapedPrefix = scopeRefPrefix.replace(/["\\]/g, "\\$&");
    for (const el of document.querySelectorAll('[data-rx-ref^="' + escapedPrefix + '"]')) {
      const attrVal = el.getAttribute("data-rx-ref");
      if (attrVal && attrVal.startsWith(scopeRefPrefix)) {
        const dynamicName = attrVal.slice(scopeRefPrefix.length).trim();
        if (dynamicName) {
          refNames.add(dynamicName);
        }
      }
    }
  }

  for (const refName of refNames) {
    const target = scope[refName];
    if (!target || !isRef(target)) continue;
    if (target.__rx_bound_template_ref) continue;
    target.__rx_bound_template_ref = true;

    const proto = Object.getPrototypeOf(target);
    const origDesc = Object.getOwnPropertyDescriptor(target, "value")
      || (proto ? Object.getOwnPropertyDescriptor(proto, "value") : undefined);
    const initialValue = target.value;
    let customValue;
    let hasCustomValue = false;
    let warnedMissing = false;

    Object.defineProperty(target, "value", {
      get() {
        if (origDesc && typeof origDesc.get === "function") {
          origDesc.get.call(this);
        }
        if (hasCustomValue) {
          return customValue;
        }
        const escapedAttr = String(scopeId + ":" + refName).replace(/["\\]/g, "\\$&");
        const selector = '[data-rx-ref="' + escapedAttr + '"]';
        let elements = [];
        if (typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
          elements = Array.from(document.querySelectorAll(selector));
        }
        if (Array.isArray(initialValue) || forRefNames.has(refName)) {
          warnedMissing = false;
          return elements;
        }
        if (elements.length === 1) {
          warnedMissing = false;
          return elements[0];
        }
        if (elements.length > 1) {
          warnedMissing = false;
          return elements;
        }
        if (!warnedMissing && typeof console !== "undefined" && typeof console.warn === "function" && (typeof process === "undefined" || process.env?.NODE_ENV !== "production")) {
          warnedMissing = true;
          const compName = definition?.name ? "<" + definition.name + ">" : "<Component>";
          console.warn(
            '[resux:template-ref] Template ref "' + refName + '" could not be resolved in the DOM for component ' +
            compName + '. Ensure the element is rendered and not removed by v-if.'
          );
        }
        return initialValue ?? null;
      },
      set(v) {
        hasCustomValue = true;
        customValue = v;
        if (origDesc && typeof origDesc.set === "function") {
          origDesc.set.call(this, v);
        }
      },
      configurable: true,
      enumerable: true
    });
    // Effects created during setup read the ref before this binding existed
    // and saw null. Re-run them now that reads resolve against the live DOM.
    if (target.dep) {
      __rxTriggerEffects(target.dep);
    }
  }
}

export function createClientComponent(definition) {
  return {
    declaredProps: definition.declaredProps,
    inheritAttrs: definition.inheritAttrs,
    async createScope(serializedScope, route) {
      const stateRefs = Object.create(null);
      const globalStateKeys = new Set(Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : []);
      const asyncDataRefs = Object.create(null);
      const pendingCompletions = [];
      const mountedCallbacks = [];
      const emitQueue = [];
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
          const normalizedKey = normalizeComponentRegistryKey(key, "useState");
          if (!hasOwnRegistryKey(stateRefs, normalizedKey)) {
            const hasValue = serializedScope.state && hasOwnRegistryKey(serializedScope.state, normalizedKey);
            setRegistryValue(
              stateRefs,
              normalizedKey,
              ref(hasValue ? serializedScope.state[normalizedKey] : createClientStateValue(normalizedKey, factory))
            );
          }
          return stateRefs[normalizedKey];
        },
        useGlobalState(key, factory) {
          const normalizedKey = String(key || "").trim();
          if (normalizedKey) {
            globalStateKeys.add(normalizedKey);
          }
          return useClientGlobalState(key, factory);
        },
        useAsyncData(key, handler) {
          const normalizedKey = normalizeComponentRegistryKey(key, "useAsyncData");
          if (!hasOwnRegistryKey(asyncDataRefs, normalizedKey)) {
            const hasSnapshot = serializedScope.asyncData
              && hasOwnRegistryKey(serializedScope.asyncData, normalizedKey);
            const snapshot = hasSnapshot ? serializedScope.asyncData[normalizedKey] : undefined;
            const resource = createAsyncDataResource(
              snapshot?.value,
              snapshot?.pending ?? false,
              snapshot?.error ?? null
            );
            setRegistryValue(asyncDataRefs, normalizedKey, resource);
            if (resource.pending.value && typeof handler === "function") {
              const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
              if (controller) {
                pendingAsyncDataControllers.add(controller);
                resource.abortController = controller;
              }
              const completion = settleAsyncDataResource(resource, handler, normalizedKey, controller ? controller.signal : undefined)
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
          return asyncDataRefs[normalizedKey];
        },
        defineProps() {
          return props;
        },
        defineEmits() {
          return (name, ...args) => {
            emitQueue.push({ name, args });
          };
        },
        emit(name, ...args) {
          emitQueue.push({ name, args });
        },
        defineExpose() {},
        defineSlots() {
          return {};
        },
        defineOptions() {},
        defineModel(name) {
          return ref(props[name === undefined ? "modelValue" : name]);
        },
        useRoute() {
          return route;
        },
        useRouter() {
          return createClientRouter();
        },
        useViewTransition() {
          return useViewTransition();
        },
        useHead() {
        },
        useSeoMeta() {
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
          const key = createFetchAsyncDataKey(url, init);
          return setupContext.useAsyncData(key, () => setupContext.$fetch(url, init));
        },
        async $fetch(url, init) {
          const response = await fetch(url, prepareFetchInit(init));
          if (!response.ok) {
            throw await createFetchError(url, response);
          }
          return response.json();
        },
        useError() {
          return useActiveResuxError();
        },
        clearError() {
          clearError();
        },
        showError(input) {
          return showError(input);
        },
        createError(input) {
          return createError(input);
        },
        useLazyPackage(name, options = {}) {
          return useLazyPackage(name, options);
        },
        useClientPackage(name, options = {}) {
          return useClientPackage(name, options);
        },
        usePackageReady(name) {
          return usePackageReady(name);
        },
        defineLazyPackage(name, options = {}) {
          return defineLazyPackage(name, options);
        },
        defineClientOnlyPackage(name, options = {}) {
          return defineClientOnlyPackage(name, options);
        },
        definePackageAdapter(definition) {
          return definePackageAdapter(definition);
        },
        defineClientEnhancement(name, setup) {
          return defineClientEnhancement(name, setup);
        },
        useClientEnhancement(name, options = {}) {
          return useClientEnhancement(name, options);
        },
        onMounted(callback) {
          if (typeof callback === "function") {
            mountedCallbacks.push(callback);
          }
        },
        definePageMeta() {
        },
        useI18n() {
          return useClientI18n(route);
        },
        useLocalePath() {
          return useClientI18n(route).localePath;
        },
        useSwitchLocalePath() {
          return useClientI18n(route).switchLocalePath;
        },
        useDevice() {
          return useDevice();
        },
        $device: useDevice()
      };
      const scope = await definition.script(setupContext);
      bindTemplateRefs(scope, definition, serializedScope.id);
      serializedScope.globalStateKeys = [...globalStateKeys];
      await Promise.allSettled(mountedCallbacks.map((callback) => callback()));
      return { scopeId: serializedScope.id, scope, props, stateRefs, globalStateKeys, asyncDataRefs, pendingCompletions, emitQueue };
    },
    async run(scopeRecord, handlerName, event, eventLocals = {}, emitArgs = null) {
      bindTemplateRefs(scopeRecord.scope, definition, scopeRecord.scopeId);
      const handler = scopeRecord.scope[handlerName];
      if (typeof handler !== "function") {
        throw new Error("Missing resumable handler " + handlerName + ".");
      }
      if (Object.keys(eventLocals).length > 0) {
        await handler(event, eventLocals);
      } else if (emitArgs) {
        await handler(...emitArgs);
      } else {
        await handler(event);
      }
      return renderClientPatches(definition.template, scopeRecord.scope, definition.styleScopeId, scopeRecord.scopeId, definition.id);
    },
    render(scopeRecord) {
      return renderClientPatches(definition.template, scopeRecord.scope, definition.styleScopeId, scopeRecord.scopeId, definition.id);
    },
    // Adds the parent's fallthrough listeners (<Child @click="go" />) to this component's root element.
    injectRootAttrs(html, attrs) {
      const roots = definition.template.filter((node) => node.type !== "text" || node.value.trim().length > 0);
      const root = roots.length === 1 ? roots[0] : null;
      if (!root || root.type !== "element" || root.for) return html;
      const tag = String(root.tag);
      if (tag.charAt(0) !== tag.charAt(0).toLowerCase() || tag === "slot" || tag === "component" || tag === "template" || tag.toLowerCase() === "teleport") return html;
      if (!root.if) return injectAttrsIntoHtml(html, attrs);
      // A v-if root sits inside <span data-rx-block>; the wrapper keeps the attributes for later re-renders.
      const wrapperEnd = html.indexOf("<span data-rx-block") === 0 ? html.indexOf(">") : -1;
      if (wrapperEnd < 0) return html;
      return '<span data-rx-fall="' + escapeAttribute(JSON.stringify(attrs)) + '"' + html.slice(5, wrapperEnd + 1) + injectAttrsIntoHtml(html.slice(wrapperEnd + 1), attrs);
    },
    // Renders one slot of a component tag written in this component's template (found by its slots id) with the
    // live scope and the locals captured in the payload, so a resumed child shows the parent's current content.
    renderSlotHtml(scopeRecord, slotsId, name, props, locals) {
      const owner = findSlotsOwner(definition.template, slotsId);
      if (!owner || !owner.slots || !Object.prototype.hasOwnProperty.call(owner.slots, name)) return undefined;
      const slot = owner.slots[name];
      const slotLocals = bindClientSlotLocals(slot.param, props, locals || {});
      return slot.children
        .map((child) => renderNode(child, scopeRecord.scope, slotLocals, definition.styleScopeId, scopeRecord.scopeId, definition.id))
        .join("");
    },
    renderHtml(scopeRecord) {
      return definition.template
        .map((node) => renderNode(node, scopeRecord.scope, {}, definition.styleScopeId, scopeRecord.scopeId, definition.id))
        .join("");
    },
    serialize(scopeRecord) {
      return {
        props: serializeProps(scopeRecord.props ?? {}),
        state: serializeRefs(scopeRecord.stateRefs),
        asyncData: serializeAsyncData(scopeRecord.asyncDataRefs)
      };
    }
  };
}

function findSlotsOwner(nodes, slotsId) {
  for (const node of nodes || []) {
    if (!node || node.type !== "element") continue;
    if (node.slotsId === slotsId) return node;
    const inChildren = findSlotsOwner(node.children, slotsId);
    if (inChildren) return inChildren;
    if (node.slots) {
      for (const name of Object.keys(node.slots)) {
        const nested = findSlotsOwner(node.slots[name].children, slotsId);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function bindClientSlotLocals(param, slotProps, locals) {
  if (!param) return locals;
  const next = Object.assign({}, locals);
  if (param.kind === "ident") {
    next[param.name] = slotProps;
    return next;
  }
  for (const pair of param.pairs) next[pair.local] = slotProps[pair.key];
  return next;
}

function normalizeClientPropName(name) {
  return String(name).replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

// A server-rendered child that has slots in its payload asks its parent to render them. The provider is
// synchronous and reads the parent's current record, so call this (it imports the parent) before a child re-renders.
async function prepareSlotProviders(scopeId) {
  if (clientSlotProviders.has(scopeId)) return;
  const payload = globalThis.__RESUX__;
  const bindings = payload && payload.scopes && payload.scopes[scopeId] ? payload.scopes[scopeId].slots : null;
  if (!bindings) return;
  const names = Object.keys(bindings);
  const parts = String(bindings[names[0]].ref).split(":");
  const parentScopeId = parts[0];
  const parentModuleId = parts[1];
  if (!parentScopeId || !parentModuleId || !payload.scopes[parentScopeId]) return;
  const parentComponent = await importComponent(parentModuleId, payload.modules, devImportRevision);
  if (!scopeCache.get(parentScopeId)) {
    scopeCache.set(parentScopeId, await parentComponent.createScope(payload.scopes[parentScopeId], payload.route));
  }
  clientSlotProviders.set(scopeId, (name, props) => {
    if (!Object.prototype.hasOwnProperty.call(bindings, name)) return undefined;
    const binding = bindings[name];
    const slotsId = String(binding.ref).split(":")[2];
    return parentComponent.renderSlotHtml(scopeCache.get(parentScopeId), slotsId, name, props, binding.locals);
  });
}

function shouldCaptureDelegatedEvent(eventName) {
  return (
    eventName === "focus"
    || eventName === "blur"
    || eventName === "mouseenter"
    || eventName === "mouseleave"
    || eventName === "pointerenter"
    || eventName === "pointerleave"
    || eventName === "load"
    || eventName === "error"
    || eventName === "loadstart"
    || eventName === "loadedmetadata"
    || eventName === "loadeddata"
    || eventName === "canplay"
    || eventName === "lazy-load-start"
    || eventName === "lazy-load-complete"
    || eventName === "invalid"
  );
}

function registerDelegatedEvent(eventName, useCapture = false) {
  if (!eventName || eventName === "click") {
    return;
  }
  const key = eventName + ":" + (useCapture ? "1" : "0");
  if (registeredDelegatedEvents.has(key)) {
    return;
  }
  registeredDelegatedEvents.add(key);
  document.addEventListener(eventName, (event) => {
    void handleDelegatedEvent(eventName, event);
  }, useCapture);
}

function registerDelegatedEventsFromDom(root = document) {
  const eventNames = new Set();
  const collect = (element) => {
    if (!element || !element.attributes) {
      return;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!attribute || typeof attribute.name !== "string" || !attribute.name.startsWith("data-rx-on-")) {
        continue;
      }
      const eventName = attribute.name.slice("data-rx-on-".length).trim();
      if (eventName) {
        eventNames.add(eventName);
      }
    }
  };
  if (root && root.nodeType === 1) {
    collect(root);
  }
  const iterableRoot = root && root.querySelectorAll ? root : document;
  if (iterableRoot && iterableRoot.querySelectorAll) {
    iterableRoot.querySelectorAll("*").forEach((element) => collect(element));
  }
  eventNames.forEach((eventName) => {
    registerDelegatedEvent(eventName, shouldCaptureDelegatedEvent(eventName));
  });
}
`;
