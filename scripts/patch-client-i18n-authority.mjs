import { readFile, writeFile } from "node:fs/promises";

const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
const i18nPath = new URL("../src/i18n/index.ts", import.meta.url);
const testPath = new URL("../tests/runtime-performance-regressions.test.ts", import.meta.url);

let runtime = await readFile(runtimePath, "utf8");

const setupBefore = `        useI18n() {\n          return globalThis.__RESUX_USE_I18N__ ? globalThis.__RESUX_USE_I18N__() : {\n            locale: ref("en"),\n            dir: ref("ltr"),\n            locales: [],\n            t: (k) => k,\n            tm: (k) => k,\n            resolveLocalized: (v) => v,\n            localePath: (to) => to,\n            switchLocalePath: (to) => to,\n            setLocale: () => {}\n          };\n        },\n        useLocalePath() {\n          return globalThis.__RESUX_USE_LOCALE_PATH__ ? globalThis.__RESUX_USE_LOCALE_PATH__() : (to) => to;\n        },\n        useSwitchLocalePath() {\n          return globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ ? globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__() : (to) => to;\n        },`;
const setupAfter = `        useI18n() {\n          return useClientI18n(route);\n        },\n        useLocalePath() {\n          return useClientI18n(route).localePath;\n        },\n        useSwitchLocalePath() {\n          return useClientI18n(route).switchLocalePath;\n        },`;
if (!runtime.includes(setupBefore)) throw new Error("client component i18n setup anchor not found");
runtime = runtime.replace(setupBefore, setupAfter);

const globalBefore = `  defineProp("$t", () => {\n    return (key, params) => {\n      try {\n        return globalThis.__RESUX_USE_I18N__ ? globalThis.__RESUX_USE_I18N__().t(key, params) : key;\n      } catch (e) {\n        return key;\n      }\n    };\n  });`;
const globalAfter = `  defineProp("$t", () => {\n    return (key, params) => {\n      try {\n        return useClientI18n().t(key, params);\n      } catch (e) {\n        return key;\n      }\n    };\n  });`;
if (!runtime.includes(globalBefore)) throw new Error("client $t anchor not found");
runtime = runtime.replace(globalBefore, globalAfter);

const installBefore = `function installResux() {\n  globalThis.__RESUX_USE_I18N__ ||= () => useClientI18n();\n  globalThis.__RESUX_USE_LOCALE_PATH__ ||= () => useClientI18n().localePath;\n  globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ ||= () => useClientI18n().switchLocalePath;`;
const installAfter = `function installResux() {\n  globalThis.__RESUX_USE_I18N__ = () => useClientI18n();\n  globalThis.__RESUX_USE_LOCALE_PATH__ = () => useClientI18n().localePath;\n  globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ = () => useClientI18n().switchLocalePath;`;
if (!runtime.includes(installBefore)) throw new Error("client install i18n anchor not found");
runtime = runtime.replace(installBefore, installAfter);

await writeFile(runtimePath, runtime, "utf8");

let i18n = await readFile(i18nPath, "utf8");
const moduleBefore = `if (typeof globalThis !== "undefined") {\n  (globalThis as any).__RESUX_USE_I18N__ = useI18n;\n  (globalThis as any).__RESUX_USE_LOCALE_PATH__ = useLocalePath;\n  (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__ = useSwitchLocalePath;\n}`;
const moduleAfter = `if (typeof globalThis !== "undefined") {\n  (globalThis as any).__RESUX_USE_I18N__ ??= useI18n;\n  (globalThis as any).__RESUX_USE_LOCALE_PATH__ ??= useLocalePath;\n  (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__ ??= useSwitchLocalePath;\n}`;
if (!i18n.includes(moduleBefore)) throw new Error("i18n module global bridge anchor not found");
i18n = i18n.replace(moduleBefore, moduleAfter);
await writeFile(i18nPath, i18n, "utf8");

let tests = await readFile(testPath, "utf8");
tests = tests.replace(
  `expect(source).toContain("globalThis.__RESUX_USE_I18N__ ||= () => useClientI18n()");`,
  `expect(source).toContain("globalThis.__RESUX_USE_I18N__ = () => useClientI18n()");\n    expect(source).toContain("return useClientI18n(route);");\n    expect(source).toContain("return useClientI18n(route).localePath;");\n    expect(source).toContain("return useClientI18n(route).switchLocalePath;");\n    expect(source).toContain("return useClientI18n().t(key, params);");`,
);
await writeFile(testPath, tests, "utf8");

console.log("Made client-native i18n authoritative for resumed component execution.");
