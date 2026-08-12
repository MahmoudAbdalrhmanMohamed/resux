import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  computed,
  ref,
  defineResuxModule,
  type ResuxModuleContext,
  type Ref,
  useResuxApp,
  type ResuxRouter,
  type RuntimeConfig
} from "../runtime/index.js";
import {
  buildLocalePath,
  createI18nHead,
  normalizeI18nRuntimeConfig,
  normalizeI18nStrategy,
  resolveI18nRoute,
  resolveLocaleDirection,
  resolveLocalizedValue,
  translateRaw,
  translateText,
  type ResuxI18nLocale,
  type ResuxI18nRuntimeConfig,
  type ResuxI18nStrategy,
  type ResuxI18nTranslationParams
} from "./shared.js";

type MessageRecord = Record<string, unknown>;

export interface ResuxI18nLocaleInput {
  code: string;
  name?: string;
  dir?: "ltr" | "rtl";
}

export type ResuxI18nMessageSource =
  | MessageRecord
  | string
  | (() => unknown | Promise<unknown>);

export interface ResuxI18nConfigInput {
  defaultLocale: string;
  fallbackLocale?: string;
  strategy?: ResuxI18nStrategy;
  locales: ResuxI18nLocaleInput[];
  messages?: Record<string, ResuxI18nMessageSource>;
  seo?: {
    hreflang?: boolean;
  };
}

export interface ResuxI18nModuleOptions extends Partial<ResuxI18nConfigInput> {}

export interface UseI18nResult {
  locale: ReturnType<typeof computed<string>>;
  dir: ReturnType<typeof computed<"ltr" | "rtl">>;
  locales: ResuxI18nLocale[];
  defaultLocale: string;
  fallbackLocale: string;
  strategy: ResuxI18nStrategy;
  t: (key: string, params?: ResuxI18nTranslationParams) => string;
  tm: (key: string) => unknown;
  resolveLocalized: (value: unknown) => string | null;
  localePath: (to: string, localeCode?: string) => string;
  switchLocalePath: (localeCode: string, to?: string) => string;
  setLocale: (localeCode: string, to?: string) => Promise<void> | void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readCurrentRoutePath(): string {
  if (typeof window !== "undefined" && typeof location !== "undefined") {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  const app = useResuxApp();
  const currentRoute = app.route;
  if (currentRoute && typeof currentRoute.path === "string" && currentRoute.path.trim()) {
    return currentRoute.path;
  }

  return "/";
}

function readClientRouter(): ResuxRouter | null {
  const maybeRouter = (globalThis as { __RESUX_ROUTER__?: unknown }).__RESUX_ROUTER__;
  if (!isRecord(maybeRouter)) {
    return null;
  }
  const push = maybeRouter.push;
  const replace = maybeRouter.replace;
  const back = maybeRouter.back;
  const forward = maybeRouter.forward;
  const go = maybeRouter.go;
  if (
    typeof push !== "function"
    || typeof replace !== "function"
    || typeof back !== "function"
    || typeof forward !== "function"
    || typeof go !== "function"
  ) {
    return null;
  }
  return maybeRouter as unknown as ResuxRouter;
}

function extractDynamicImportPath(fn: () => unknown): string | null {
  const source = String(fn);
  const match = source.match(/import\((["'`])(.+?)\1\)/);
  if (!match) {
    return null;
  }
  return match[2] ?? null;
}

function normalizeMessageModule(value: unknown): MessageRecord {
  if (isRecord(value) && isRecord(value.default)) {
    return value.default;
  }
  return isRecord(value) ? value : {};
}

async function loadMessageFromPath(rootDir: string, filePath: string): Promise<MessageRecord> {
  let absolute = filePath;
  if (filePath.startsWith("file://")) {
    try {
      absolute = fileURLToPath(filePath);
    } catch {
      absolute = filePath;
    }
  } else if (!path.isAbsolute(filePath)) {
    absolute = path.resolve(rootDir, filePath);
  }

  const cleanPath = absolute.split("?")[0].split("#")[0];
  if (cleanPath.toLowerCase().endsWith(".json")) {
    try {
      return JSON.parse(await readFile(cleanPath, "utf8")) as MessageRecord;
    } catch {
      return {};
    }
  }
  try {
    const imported = await import(filePath.startsWith("file://") ? filePath : pathToFileURL(absolute).href);
    return normalizeMessageModule(imported.default ?? imported);
  } catch {
    return {};
  }
}

async function resolveMessageSource(rootDir: string, source: ResuxI18nMessageSource | undefined): Promise<MessageRecord> {
  if (!source) {
    return {};
  }

  if (typeof source === "string") {
    return loadMessageFromPath(rootDir, source);
  }

  if (typeof source === "function") {
    const dynamicPath = extractDynamicImportPath(source);
    if (dynamicPath) {
      const absolute = path.isAbsolute(dynamicPath) ? dynamicPath : path.resolve(rootDir, dynamicPath);
      if (absolute.toLowerCase().endsWith(".json")) {
        return loadMessageFromPath(rootDir, absolute);
      }
    }
    try {
      const loaded = await source();
      return normalizeMessageModule(loaded);
    } catch {
      if (dynamicPath) {
        return loadMessageFromPath(rootDir, dynamicPath);
      }
      return {};
    }
  }

  return normalizeMessageModule(source);
}

async function resolveMessages(
  rootDir: string,
  locales: ResuxI18nLocaleInput[],
  messages: Record<string, ResuxI18nMessageSource> | undefined
): Promise<Record<string, MessageRecord>> {
  const resolved: Record<string, MessageRecord> = {};
  for (const locale of locales) {
    const code = String(locale.code || "").trim().toLowerCase();
    if (!code) {
      continue;
    }
    resolved[code] = await resolveMessageSource(rootDir, messages?.[code]);
  }
  return resolved;
}

async function buildRuntimeI18nConfig(
  context: ResuxModuleContext,
  inlineOptions: ResuxI18nModuleOptions
): Promise<ResuxI18nRuntimeConfig | null> {
  const configFromResux = isRecord(context.options.i18n) ? context.options.i18n : {};
  const inline = isRecord(inlineOptions) ? inlineOptions : {};
  const rawLocales = Array.isArray(inline.locales)
    ? inline.locales
    : Array.isArray(configFromResux.locales)
      ? configFromResux.locales
      : [];
  const mergedMessages = {
    ...(isRecord(configFromResux.messages) ? configFromResux.messages : {}),
    ...(isRecord(inline.messages) ? inline.messages : {})
  };
  const mergedSeo = {
    ...(isRecord(configFromResux.seo) ? configFromResux.seo : {}),
    ...(isRecord(inline.seo) ? inline.seo : {})
  };
  const merged = {
    ...configFromResux,
    ...inline,
    locales: rawLocales,
    messages: mergedMessages,
    seo: mergedSeo
  } as ResuxI18nConfigInput;

  if (!Array.isArray(merged.locales) || !merged.locales.length) {
    return null;
  }

  const locales: ResuxI18nLocaleInput[] = merged.locales
    .filter((locale) => isRecord(locale))
    .map((locale) => ({
      code: String(locale.code ?? "").trim().toLowerCase(),
      name: typeof locale.name === "string" ? locale.name : undefined,
      dir: locale.dir === "rtl" ? "rtl" as const : "ltr" as const
    }))
    .filter((locale) => locale.code.length > 0);

  if (!locales.length) {
    return null;
  }

  const firstLocale = locales[0].code;
  const rawConfig: Record<string, unknown> = {
    defaultLocale: typeof merged.defaultLocale === "string" ? merged.defaultLocale.toLowerCase() : firstLocale,
    fallbackLocale: typeof merged.fallbackLocale === "string" ? merged.fallbackLocale.toLowerCase() : undefined,
    strategy: normalizeI18nStrategy(merged.strategy),
    locales,
    messages: await resolveMessages(context.rootDir, locales, merged.messages),
    seo: {
      hreflang: !isRecord(merged.seo) || merged.seo.hreflang !== false
    }
  };

  return normalizeI18nRuntimeConfig(rawConfig);
}

function readRuntimeI18nConfig(): ResuxI18nRuntimeConfig | null {
  const runtimeConfig = useResuxApp().$config as RuntimeConfig;
  const publicConfig = isRecord(runtimeConfig.public) ? runtimeConfig.public : {};
  return normalizeI18nRuntimeConfig(publicConfig.i18n);
}

const I18N_LOCALE_STATE_KEY = "__resux_i18n_locale_state";

function resolveConfiguredLocale(config: ResuxI18nRuntimeConfig, localeCode: string): ResuxI18nLocale | null {
  const normalized = String(localeCode || "").trim().toLowerCase();
  return config.locales.find((locale) => locale.code === normalized) ?? null;
}

function useI18nLocaleState(config: ResuxI18nRuntimeConfig): Ref<string> {
  const app = useResuxApp();
  const existing = app.provides[I18N_LOCALE_STATE_KEY];
  if (isRecord(existing) && typeof existing.value === "string") {
    return existing as unknown as Ref<string>;
  }

  const initialLocale = resolveI18nRoute(readCurrentRoutePath(), config).locale.code;
  const state = ref(initialLocale);
  app.provide(I18N_LOCALE_STATE_KEY, state);
  return state;
}

function applyNoPrefixDocumentLocale(config: ResuxI18nRuntimeConfig, localeCode: string): void {
  if (typeof document === "undefined") {
    return;
  }
  const html = document.documentElement;
  if (!html) {
    return;
  }
  html.setAttribute("lang", localeCode);
  html.setAttribute("dir", resolveLocaleDirection(config, localeCode));
}

function fallbackI18nConfig(): ResuxI18nRuntimeConfig {
  return {
    defaultLocale: "en",
    fallbackLocale: "en",
    strategy: "prefix_except_default",
    locales: [{ code: "en", dir: "ltr", name: "English" }],
    messages: { en: {} }
  };
}

export function useI18n(): UseI18nResult {
  const runtimeI18n = readRuntimeI18nConfig() ?? fallbackI18nConfig();
  const localeState = useI18nLocaleState(runtimeI18n);
  const locale = computed(() => runtimeI18n.strategy === "no_prefix"
    ? localeState.value
    : resolveI18nRoute(readCurrentRoutePath(), runtimeI18n).locale.code);
  const dir = computed(() => resolveLocaleDirection(runtimeI18n, locale.value));

  return {
    locale,
    dir,
    locales: runtimeI18n.locales,
    defaultLocale: runtimeI18n.defaultLocale,
    fallbackLocale: runtimeI18n.fallbackLocale,
    strategy: runtimeI18n.strategy,
    t(key: string, params: ResuxI18nTranslationParams = {}): string {
      return translateText(runtimeI18n, locale.value, key, params);
    },
    tm(key: string): unknown {
      return translateRaw(runtimeI18n, locale.value, key);
    },
    resolveLocalized(value: unknown): string | null {
      return resolveLocalizedValue(value, locale.value, runtimeI18n.fallbackLocale);
    },
    localePath(to: string, localeCode?: string): string {
      return buildLocalePath(to, localeCode ?? locale.value, runtimeI18n);
    },
    switchLocalePath(localeCode: string, to?: string): string {
      return buildLocalePath(to ?? readCurrentRoutePath(), localeCode, runtimeI18n);
    },
    setLocale(localeCode: string, to?: string): Promise<void> | void {
      const targetLocale = resolveConfiguredLocale(runtimeI18n, localeCode);
      if (!targetLocale) {
        return;
      }
      if (runtimeI18n.strategy === "no_prefix") {
        localeState.value = targetLocale.code;
        applyNoPrefixDocumentLocale(runtimeI18n, targetLocale.code);
        return;
      }

      const target = buildLocalePath(to ?? readCurrentRoutePath(), targetLocale.code, runtimeI18n);
      const router = readClientRouter();
      if (router) {
        return router.push(target);
      }
      if (typeof window !== "undefined" && typeof location !== "undefined") {
        location.assign(target);
      }
    }
  };
}

export function useLocalePath(): (to: string, localeCode?: string) => string {
  const { localePath } = useI18n();
  return localePath;
}

export function useSwitchLocalePath(): (localeCode: string, to?: string) => string {
  const { switchLocalePath } = useI18n();
  return switchLocalePath;
}

export function defineI18nConfig<T extends ResuxI18nConfigInput>(config: T): T {
  return config;
}

export function createI18nHeadEntry(routePath: string, routeOrigin?: string): { htmlAttrs: Record<string, string>; link: Array<Record<string, string>> } {
  const runtimeI18n = readRuntimeI18nConfig();
  if (!runtimeI18n) {
    return { htmlAttrs: { lang: "en", dir: "ltr" }, link: [] };
  }
  return createI18nHead(routePath, routeOrigin, runtimeI18n);
}

export default defineResuxModule<ResuxI18nModuleOptions>({
  defaults: {
    strategy: "prefix_except_default"
  },
  async setup(options, context) {
    const runtimeI18n = await buildRuntimeI18nConfig(context, options ?? {});
    if (!runtimeI18n) {
      return;
    }

    const sourceI18n = isRecord((context.options as Record<string, unknown>).i18n)
      ? (context.options as Record<string, unknown>).i18n as Record<string, unknown>
      : {};
    const sourceSeo = isRecord(sourceI18n.seo) ? sourceI18n.seo : {};
    const inlineSeoSource = isRecord(options) ? options : {};
    const inlineSeo = isRecord(inlineSeoSource.seo) ? inlineSeoSource.seo : {};
    const hreflangEnabled = sourceSeo.hreflang !== false;
    const hreflangInline = inlineSeo.hreflang !== false;

    context.extendRuntimeConfig({
      public: {
        i18n: {
          ...runtimeI18n,
          seo: {
            hreflang: hreflangEnabled && hreflangInline
          }
        }
      }
    });

    // Under the "prefix" strategy every locale is prefixed, so the bare root
    // path has no matching page. Redirect it to the default locale instead of
    // 404ing.
    if (runtimeI18n.strategy === "prefix") {
      context.addRouteRule("/", {
        redirect: { to: `/${runtimeI18n.defaultLocale}`, statusCode: 302 }
      });
    }
  }
});

if (typeof globalThis !== "undefined") {
  (globalThis as any).__RESUX_USE_I18N__ ??= useI18n;
  (globalThis as any).__RESUX_USE_LOCALE_PATH__ ??= useLocalePath;
  (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__ ??= useSwitchLocalePath;
}
