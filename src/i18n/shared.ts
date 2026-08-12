export type ResuxI18nStrategy = "prefix_except_default" | "prefix" | "no_prefix";

export interface ResuxI18nLocale {
  code: string;
  name?: string;
  dir?: "ltr" | "rtl";
}

export interface ResuxI18nRuntimeConfig {
  defaultLocale: string;
  fallbackLocale: string;
  strategy: ResuxI18nStrategy;
  locales: ResuxI18nLocale[];
  messages: Record<string, Record<string, unknown>>;
}

export interface ResuxI18nResolvedRoute {
  locale: ResuxI18nLocale;
  basePath: string;
  localizedPath: string;
}

export interface ResuxI18nTranslationParams {
  [key: string]: string | number | boolean | null | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeLocaleCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizePathname(pathname: string): string {
  const source = String(pathname || "").trim();
  if (!source) {
    return "/";
  }
  const withSlash = source.startsWith("/") ? source : `/${source}`;
  if (withSlash !== "/" && withSlash.endsWith("/")) {
    return withSlash.replace(/\/+$/g, "");
  }
  return withSlash;
}

function splitPathSuffix(input: string): { pathname: string; suffix: string } {
  const source = String(input || "");
  const hashIndex = source.indexOf("#");
  const queryIndex = source.indexOf("?");
  const splitIndex = [hashIndex, queryIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (splitIndex === undefined) {
    return { pathname: source, suffix: "" };
  }
  return {
    pathname: source.slice(0, splitIndex),
    suffix: source.slice(splitIndex)
  };
}

function joinLocalePath(localeCode: string, basePath: string): string {
  const normalizedBase = normalizePathname(basePath);
  return normalizedBase === "/" ? `/${localeCode}` : `/${localeCode}${normalizedBase}`;
}

function isLocalePrefixedForStrategy(strategy: ResuxI18nStrategy, localeCode: string, defaultLocale: string): boolean {
  if (strategy === "prefix") {
    return true;
  }
  if (strategy === "prefix_except_default") {
    return localeCode !== defaultLocale;
  }
  return false;
}

function resolveLocaleByCode(locales: ResuxI18nLocale[], code: string): ResuxI18nLocale | null {
  return locales.find((locale) => locale.code === code) ?? null;
}

const FORBIDDEN_MESSAGE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function readNestedValue(source: Record<string, unknown>, key: string): unknown {
  if (!key) {
    return source;
  }
  const parts = key.split(".");
  let cursor: unknown = source;
  for (const part of parts) {
    if (
      FORBIDDEN_MESSAGE_KEYS.has(part)
      || !isRecord(cursor)
      || !Object.hasOwn(cursor, part)
    ) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
}

function interpolateMessage(template: string, params: ResuxI18nTranslationParams): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
}

export function normalizeI18nStrategy(value: unknown): ResuxI18nStrategy {
  if (value === "prefix" || value === "no_prefix" || value === "prefix_except_default") {
    return value;
  }
  return "prefix_except_default";
}

export function normalizeI18nRuntimeConfig(value: unknown): ResuxI18nRuntimeConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const localeEntries = Array.isArray(value.locales) ? value.locales : [];
  const locales: ResuxI18nLocale[] = [];
  for (const entry of localeEntries) {
    if (!isRecord(entry)) {
      continue;
    }
    const code = normalizeLocaleCode(entry.code);
    if (!code) {
      continue;
    }
    locales.push({
      code,
      ...(typeof entry.name === "string" ? { name: entry.name } : {}),
      dir: entry.dir === "rtl" ? "rtl" : "ltr"
    });
  }

  if (!locales.length) {
    return null;
  }

  const uniqueLocales: ResuxI18nLocale[] = [];
  const localeCodes = new Set<string>();
  for (const locale of locales) {
    if (localeCodes.has(locale.code)) {
      continue;
    }
    localeCodes.add(locale.code);
    uniqueLocales.push(locale);
  }

  const firstLocale = uniqueLocales[0];
  const defaultLocale = normalizeLocaleCode(value.defaultLocale) ?? firstLocale.code;
  const fallbackLocale = normalizeLocaleCode(value.fallbackLocale) ?? defaultLocale;
  const strategy = normalizeI18nStrategy(value.strategy);
  const messagesInput = isRecord(value.messages) ? value.messages : {};
  const messages: Record<string, Record<string, unknown>> = {};

  for (const locale of uniqueLocales) {
    const entry = messagesInput[locale.code];
    messages[locale.code] = isRecord(entry) ? entry : {};
  }

  const normalizedDefault = resolveLocaleByCode(uniqueLocales, defaultLocale)?.code ?? firstLocale.code;
  const normalizedFallback = resolveLocaleByCode(uniqueLocales, fallbackLocale)?.code ?? normalizedDefault;

  return {
    defaultLocale: normalizedDefault,
    fallbackLocale: normalizedFallback,
    strategy,
    locales: uniqueLocales,
    messages
  };
}

export function resolveI18nRoute(pathname: string, config: ResuxI18nRuntimeConfig): ResuxI18nResolvedRoute {
  // Route identity is pathname-only. Query strings and hashes belong to
  // navigation state and must not be mistaken for a route segment or leak into
  // canonical/hreflang URLs.
  const { pathname: rawPathname } = splitPathSuffix(pathname);
  const normalizedPath = normalizePathname(rawPathname);
  const segments = normalizedPath === "/" ? [] : normalizedPath.slice(1).split("/");
  const first = segments[0];
  const candidate = first ? resolveLocaleByCode(config.locales, first) : null;

  // For prefixed strategies, always consume a recognized locale segment. In
  // prefix_except_default the default-locale prefix is non-canonical, but it
  // still needs to be stripped so locale switching never produces paths such
  // as /fr/en/about.
  if (candidate && config.strategy !== "no_prefix") {
    const remainder = segments.slice(1);
    const basePath = remainder.length ? `/${remainder.join("/")}` : "/";
    const localizedPath = isLocalePrefixedForStrategy(
      config.strategy,
      candidate.code,
      config.defaultLocale,
    )
      ? normalizedPath
      : basePath;
    return {
      locale: candidate,
      basePath,
      localizedPath
    };
  }

  const fallbackLocale = config.locales[0];
  if (!fallbackLocale) {
    return {
      locale: { code: "en", dir: "ltr" },
      basePath: normalizedPath,
      localizedPath: normalizedPath
    };
  }
  const defaultLocale = resolveLocaleByCode(config.locales, config.defaultLocale) ?? fallbackLocale;
  const defaultLocalizedPath = isLocalePrefixedForStrategy(config.strategy, defaultLocale.code, config.defaultLocale)
    ? joinLocalePath(defaultLocale.code, normalizedPath)
    : normalizedPath;
  return {
    locale: defaultLocale,
    basePath: normalizedPath,
    localizedPath: defaultLocalizedPath
  };
}

export function buildLocalePath(path: string, localeCode: string, config: ResuxI18nRuntimeConfig): string {
  const fallbackLocale = config.locales[0];
  if (!fallbackLocale) {
    const { pathname, suffix } = splitPathSuffix(path);
    return `${normalizePathname(pathname)}${suffix}`;
  }
  const targetLocale = resolveLocaleByCode(config.locales, normalizeLocaleCode(localeCode) ?? config.defaultLocale)
    ?? resolveLocaleByCode(config.locales, config.defaultLocale)
    ?? fallbackLocale;
  const { pathname, suffix } = splitPathSuffix(path);
  const current = resolveI18nRoute(pathname, config);
  const basePath = normalizePathname(current.basePath);

  if (!isLocalePrefixedForStrategy(config.strategy, targetLocale.code, config.defaultLocale)) {
    return `${basePath}${suffix}`;
  }

  return `${joinLocalePath(targetLocale.code, basePath)}${suffix}`;
}

export function resolveLocaleDirection(config: ResuxI18nRuntimeConfig, localeCode: string): "ltr" | "rtl" {
  return resolveLocaleByCode(config.locales, localeCode)?.dir === "rtl" ? "rtl" : "ltr";
}

export function resolveLocalizedValue(
  value: unknown,
  localeCode: string,
  fallbackLocale: string
): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (!isRecord(value)) {
    return null;
  }
  const primary = value[localeCode];
  if (typeof primary === "string") {
    return primary;
  }
  const fallback = value[fallbackLocale];
  if (typeof fallback === "string") {
    return fallback;
  }
  return null;
}

export function translateRaw(
  config: ResuxI18nRuntimeConfig,
  localeCode: string,
  key: string
): unknown {
  const localeMessages = config.messages[localeCode];
  if (localeMessages) {
    const direct = readNestedValue(localeMessages, key);
    if (direct !== undefined) {
      return direct;
    }
  }

  const fallbackMessages = config.messages[config.fallbackLocale];
  if (fallbackMessages) {
    const fallback = readNestedValue(fallbackMessages, key);
    if (fallback !== undefined) {
      return fallback;
    }
  }

  return undefined;
}

export function translateText(
  config: ResuxI18nRuntimeConfig,
  localeCode: string,
  key: string,
  params: ResuxI18nTranslationParams = {}
): string {
  const raw = translateRaw(config, localeCode, key);
  if (typeof raw === "string") {
    return interpolateMessage(raw, params);
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  return key;
}

export function createI18nHead(
  routePath: string,
  routeOrigin: string | undefined,
  config: ResuxI18nRuntimeConfig,
  options: { includeHreflang?: boolean } = {}
): { htmlAttrs: Record<string, string>; link: Array<Record<string, string>> } {
  const resolved = resolveI18nRoute(routePath, config);
  const includeHreflang = options.includeHreflang !== false;
  const htmlAttrs: Record<string, string> = {
    lang: resolved.locale.code,
    dir: resolveLocaleDirection(config, resolved.locale.code)
  };
  const link: Array<Record<string, string>> = [];

  const canonicalPath = buildLocalePath(resolved.basePath, resolved.locale.code, config);
  const canonicalHref = routeOrigin ? new URL(canonicalPath, routeOrigin).toString() : canonicalPath;
  link.push({
    rel: "canonical",
    href: canonicalHref
  });

  if (includeHreflang) {
    for (const locale of config.locales) {
      const hrefPath = buildLocalePath(resolved.basePath, locale.code, config);
      const href = routeOrigin ? new URL(hrefPath, routeOrigin).toString() : hrefPath;
      link.push({
        rel: "alternate",
        hreflang: locale.code,
        href
      });
    }

    const defaultHrefPath = buildLocalePath(resolved.basePath, config.defaultLocale, config);
    const defaultHref = routeOrigin ? new URL(defaultHrefPath, routeOrigin).toString() : defaultHrefPath;
    link.push({
      rel: "alternate",
      hreflang: "x-default",
      href: defaultHref
    });
  }

  return {
    htmlAttrs,
    link
  };
}