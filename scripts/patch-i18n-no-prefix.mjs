import { readFile, writeFile } from "node:fs/promises";

const i18nPath = new URL("../src/i18n/index.ts", import.meta.url);
const testPath = new URL("../tests/i18n.test.ts", import.meta.url);

let source = await readFile(i18nPath, "utf8");

source = source.replace(
  `  computed,\n  defineResuxModule,`,
  `  computed,\n  ref,\n  defineResuxModule,`,
);
source = source.replace(
  `  type ResuxModuleContext,\n  useResuxApp,`,
  `  type ResuxModuleContext,\n  type Ref,\n  useResuxApp,`,
);

const fallbackAnchor = `function fallbackI18nConfig(): ResuxI18nRuntimeConfig {`;
if (!source.includes(fallbackAnchor)) throw new Error("fallback i18n anchor not found");
const helpers = `const I18N_LOCALE_STATE_KEY = "__resux_i18n_locale_state";\n\nfunction resolveConfiguredLocale(config: ResuxI18nRuntimeConfig, localeCode: string): ResuxI18nLocale | null {\n  const normalized = String(localeCode || "").trim().toLowerCase();\n  return config.locales.find((locale) => locale.code === normalized) ?? null;\n}\n\nfunction useI18nLocaleState(config: ResuxI18nRuntimeConfig): Ref<string> {\n  const app = useResuxApp();\n  const existing = app.provides[I18N_LOCALE_STATE_KEY];\n  if (isRecord(existing) && typeof existing.value === "string") {\n    return existing as unknown as Ref<string>;\n  }\n\n  const initialLocale = resolveI18nRoute(readCurrentRoutePath(), config).locale.code;\n  const state = ref(initialLocale);\n  app.provide(I18N_LOCALE_STATE_KEY, state);\n  return state;\n}\n\nfunction applyNoPrefixDocumentLocale(config: ResuxI18nRuntimeConfig, localeCode: string): void {\n  if (typeof document === "undefined") {\n    return;\n  }\n  const html = document.documentElement;\n  if (!html) {\n    return;\n  }\n  html.setAttribute("lang", localeCode);\n  html.setAttribute("dir", resolveLocaleDirection(config, localeCode));\n}\n\n`;
source = source.replace(fallbackAnchor, helpers + fallbackAnchor);

const useOld = `export function useI18n(): UseI18nResult {\n  const runtimeI18n = readRuntimeI18nConfig() ?? fallbackI18nConfig();\n  const locale = computed(() => resolveI18nRoute(readCurrentRoutePath(), runtimeI18n).locale.code);\n  const dir = computed(() => resolveLocaleDirection(runtimeI18n, locale.value));`;
const useNew = `export function useI18n(): UseI18nResult {\n  const runtimeI18n = readRuntimeI18nConfig() ?? fallbackI18nConfig();\n  const localeState = useI18nLocaleState(runtimeI18n);\n  const locale = computed(() => runtimeI18n.strategy === "no_prefix"\n    ? localeState.value\n    : resolveI18nRoute(readCurrentRoutePath(), runtimeI18n).locale.code);\n  const dir = computed(() => resolveLocaleDirection(runtimeI18n, locale.value));`;
if (!source.includes(useOld)) throw new Error("useI18n locale anchor not found");
source = source.replace(useOld, useNew);

const setOld = `    setLocale(localeCode: string, to?: string): Promise<void> | void {\n      const target = buildLocalePath(to ?? readCurrentRoutePath(), localeCode, runtimeI18n);\n      const router = readClientRouter();\n      if (router) {\n        return router.push(target);\n      }\n      if (typeof window !== "undefined" && typeof location !== "undefined") {\n        location.assign(target);\n      }\n    }`;
const setNew = `    setLocale(localeCode: string, to?: string): Promise<void> | void {\n      const targetLocale = resolveConfiguredLocale(runtimeI18n, localeCode);\n      if (!targetLocale) {\n        return;\n      }\n      if (runtimeI18n.strategy === "no_prefix") {\n        localeState.value = targetLocale.code;\n        applyNoPrefixDocumentLocale(runtimeI18n, targetLocale.code);\n        return;\n      }\n\n      const target = buildLocalePath(to ?? readCurrentRoutePath(), targetLocale.code, runtimeI18n);\n      const router = readClientRouter();\n      if (router) {\n        return router.push(target);\n      }\n      if (typeof window !== "undefined" && typeof location !== "undefined") {\n        location.assign(target);\n      }\n    }`;
if (!source.includes(setOld)) throw new Error("setLocale anchor not found");
source = source.replace(setOld, setNew);
await writeFile(i18nPath, source, "utf8");

let tests = await readFile(testPath, "utf8");
const headTestAnchor = `  it("sets localized html attrs, localized title, and hreflang links in head output", async () => {`;
if (!tests.includes(headTestAnchor)) throw new Error("i18n test insertion anchor not found");
const noPrefixTest = `  it("keeps no_prefix URLs unprefixed while setLocale updates per-app locale state", async () => {\n    const runtimeConfig = createRuntimeConfig();\n    (runtimeConfig.public.i18n as Record<string, unknown>).strategy = "no_prefix";\n\n    const page: ComponentDefinition = defineComponent({\n      id: "m-i18n-no-prefix",\n      name: "I18nNoPrefix",\n      file: "I18nNoPrefix.vue",\n      handlers: [],\n      async script() {\n        const { useI18n } = await import("resuxjs/i18n");\n        const i18n = useI18n();\n        const before = i18n.locale.value;\n        i18n.setLocale("ar");\n        return {\n          before,\n          after: i18n.locale.value,\n          translated: i18n.t("demo.welcome", { name: "Ada" }),\n          path: i18n.switchLocalePath("ar", "/about?tab=1#part"),\n        };\n      },\n      template: [\n        {\n          type: "element",\n          tag: "main",\n          attrs: [],\n          events: [],\n          children: [\n            { type: "interpolation", expression: "before", bindingId: "b0" },\n            { type: "text", value: "|" },\n            { type: "interpolation", expression: "after", bindingId: "b1" },\n            { type: "text", value: "|" },\n            { type: "interpolation", expression: "translated", bindingId: "b2" },\n            { type: "text", value: "|" },\n            { type: "interpolation", expression: "path", bindingId: "b3" },\n          ],\n        },\n      ],\n    });\n\n    const result = await renderApp({\n      page,\n      route: { path: "/about", params: {}, query: {} },\n      runtimeConfig,\n    });\n\n    expect(result.html).toContain(">en</span>");\n    expect(result.html).toContain(">ar</span>");\n    expect(result.html).toContain("مرحبا Ada");\n    expect(result.html).toContain(">/about?tab=1#part</span>");\n  });\n\n`;
tests = tests.replace(headTestAnchor, noPrefixTest + headTestAnchor);
await writeFile(testPath, tests, "utf8");
console.log("Patched no_prefix locale state and regression coverage.");
