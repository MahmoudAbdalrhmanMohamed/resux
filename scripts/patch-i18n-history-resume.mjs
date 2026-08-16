import { readFile, writeFile } from "node:fs/promises";

const runtimePath = "src/runtime/index.ts";
const testPath = "tests/runtime-performance-regressions.test.ts";

let runtime = await readFile(runtimePath, "utf8");

const revisionAnchor = "let routePayloadGeneration = 0;";
if (!runtime.includes(revisionAnchor)) {
  throw new Error("Could not locate route payload generation anchor");
}
runtime = runtime.replace(
  revisionAnchor,
  `${revisionAnchor}\nconst clientRouteRevision = ref(0);`,
);

const localeAnchor = "  const locale = computed(() => resolveClientI18nLocaleCode(config, routeOverride?.path || getClientResuxApp().route?.path || routePath));";
if (!runtime.includes(localeAnchor)) {
  throw new Error("Could not locate client i18n locale computed");
}
runtime = runtime.replace(
  localeAnchor,
  `  const locale = computed(() => {\n    clientRouteRevision.value;\n    return resolveClientI18nLocaleCode(config, routeOverride?.path || getClientResuxApp().route?.path || routePath);\n  });`,
);

const appUpdateAnchor = `  } else {\n    app.route = route;\n    app.payload = payload;\n    app.$config = config;\n    app.provides = clientProvides;\n  }`;
if (!runtime.includes(appUpdateAnchor)) {
  throw new Error("Could not locate client app route update block");
}
runtime = runtime.replace(
  appUpdateAnchor,
  `  } else {\n    const previousRoutePath = app.route?.path;\n    app.route = route;\n    app.payload = payload;\n    app.$config = config;\n    app.provides = clientProvides;\n    if (previousRoutePath !== route?.path) {\n      clientRouteRevision.value += 1;\n    }\n  }`,
);

await writeFile(runtimePath, runtime);

let tests = await readFile(testPath, "utf8");
const insertionAnchor = `  it("reloads safely when a route payload belongs to a different build", () => {`;
if (!tests.includes(insertionAnchor)) {
  throw new Error("Could not locate runtime regression insertion anchor");
}
const regression = `  it("invalidates client i18n computed state when history replaces the active route", () => {\n    const source = getClientRuntimeSource();\n\n    expect(source).toContain("const clientRouteRevision = ref(0);");\n    expect(source).toContain("clientRouteRevision.value;");\n    expect(source).toContain("const previousRoutePath = app.route?.path;");\n    expect(source).toContain("previousRoutePath !== route?.path");\n    expect(source).toContain("clientRouteRevision.value += 1;");\n  });\n\n`;
tests = tests.replace(insertionAnchor, regression + insertionAnchor);
await writeFile(testPath, tests);
