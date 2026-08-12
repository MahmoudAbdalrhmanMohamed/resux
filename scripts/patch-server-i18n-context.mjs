import { readFile, writeFile } from "node:fs/promises";

const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
let source = await readFile(runtimePath, "utf8");

const importBefore = `import {\n  normalizeI18nRuntimeConfig,\n  resolveI18nRoute,\n  translateRaw,\n  translateText\n} from "../i18n/shared.js";`;
const importAfter = `import {\n  buildLocalePath,\n  normalizeI18nRuntimeConfig,\n  resolveI18nRoute,\n  resolveLocaleDirection,\n  resolveLocalizedValue,\n  translateRaw,\n  translateText\n} from "../i18n/shared.js";`;
if (!source.includes(importBefore)) throw new Error("i18n import anchor not found");
source = source.replace(importBefore, importAfter);

const anchor = `export function createServerSetupContext(\n`;
if (!source.includes(anchor)) throw new Error("server setup anchor not found");
const helper = `function createServerI18nContext(route: RouteContext, runtimeConfig: RuntimeConfig): any {\n  const config = normalizeI18nRuntimeConfig(runtimeConfig.public?.i18n);\n  if (!config) {\n    return {\n      locale: ref("en"),\n      dir: ref("ltr"),\n      locales: [],\n      defaultLocale: "en",\n      fallbackLocale: "en",\n      strategy: "prefix_except_default",\n      t: (key: string) => key,\n      tm: (key: string) => key,\n      resolveLocalized: (value: unknown) => typeof value === "string" ? value : null,\n      localePath: (to: string) => to,\n      switchLocalePath: (_localeCode: string, to?: string) => to ?? route.path,\n      setLocale: () => {}\n    };\n  }\n\n  const resolved = resolveI18nRoute(route.path, config);\n  const locale = ref(resolved.locale.code);\n  const dir = ref(resolveLocaleDirection(config, resolved.locale.code));\n  return {\n    locale,\n    dir,\n    locales: config.locales,\n    defaultLocale: config.defaultLocale,\n    fallbackLocale: config.fallbackLocale,\n    strategy: config.strategy,\n    t(key: string, params: Record<string, string | number | boolean | null | undefined> = {}): string {\n      return translateText(config, locale.value, key, params);\n    },\n    tm(key: string): unknown {\n      return translateRaw(config, locale.value, key);\n    },\n    resolveLocalized(value: unknown): string | null {\n      return resolveLocalizedValue(value, locale.value, config.fallbackLocale);\n    },\n    localePath(to: string, localeCode?: string): string {\n      return buildLocalePath(to, localeCode ?? locale.value, config);\n    },\n    switchLocalePath(localeCode: string, to?: string): string {\n      return buildLocalePath(to ?? route.path, localeCode, config);\n    },\n    setLocale: () => {}\n  };\n}\n\n`;
source = source.replace(anchor, helper + anchor);

const blockBefore = `    useI18n(): any {\n      return (globalThis as any).__RESUX_USE_I18N__ ? (globalThis as any).__RESUX_USE_I18N__() : {\n        locale: ref("en"),\n        dir: ref("ltr"),\n        locales: [],\n        t: (k: string) => k,\n        tm: (k: string) => k,\n        resolveLocalized: (v: any) => v,\n        localePath: (to: string) => to,\n        switchLocalePath: (to: string) => to,\n        setLocale: () => {}\n      };\n    },\n    useLocalePath(): any {\n      return (globalThis as any).__RESUX_USE_LOCALE_PATH__ ? (globalThis as any).__RESUX_USE_LOCALE_PATH__() : (to: string) => to;\n    },\n    useSwitchLocalePath(): any {\n      return (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__ ? (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__() : (to: string) => to;\n    },`;
const blockAfter = `    useI18n(): any {\n      return createServerI18nContext(route, runtimeConfig);\n    },\n    useLocalePath(): any {\n      return createServerI18nContext(route, runtimeConfig).localePath;\n    },\n    useSwitchLocalePath(): any {\n      return createServerI18nContext(route, runtimeConfig).switchLocalePath;\n    },`;
if (!source.includes(blockBefore)) throw new Error("server i18n setup block not found");
source = source.replace(blockBefore, blockAfter);
await writeFile(runtimePath, source, "utf8");

console.log("Patched server i18n setup context to be request-local and runtime-config backed.");
