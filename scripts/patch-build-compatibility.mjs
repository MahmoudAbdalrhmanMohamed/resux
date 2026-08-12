import { readFile, writeFile } from "node:fs/promises";

const compilerPath = new URL("../src/compiler/index.ts", import.meta.url);
const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
const performanceTestPath = new URL("../tests/runtime-performance-regressions.test.ts", import.meta.url);

let compiler = await readFile(compilerPath, "utf8");
const importAnchor = `import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";`;
if (!compiler.includes(importAnchor)) throw new Error("compiler import anchor not found");
compiler = compiler.replace(importAnchor, `import { createHash } from "node:crypto";\n${importAnchor}`);

const registryAnchor = `    const packageRegistry = createClientRuntimePackageRegistry(\n      absoluteRoot,\n      readConfiguredPackages(runtimeConfig),\n      packageDiagnostics,\n    );\n\n    if (buildOptions.vite === "dev") {`;
const registryReplacement = `    const packageRegistry = createClientRuntimePackageRegistry(\n      absoluteRoot,\n      readConfiguredPackages(runtimeConfig),\n      packageDiagnostics,\n    );\n    const buildCompatibilityId = createBuildCompatibilityId({\n      runtimeConfig,\n      routes,\n      components,\n      plugins,\n      middleware,\n      serverMiddleware,\n      serverHandlers,\n      packages: packageDiagnostics,\n    });\n    injectRuntimeBuildCompatibilityId(runtimeConfig, buildCompatibilityId);\n\n    if (buildOptions.vite === "dev") {`;
if (!compiler.includes(registryAnchor)) throw new Error("package registry anchor not found");
compiler = compiler.replace(registryAnchor, registryReplacement);

const cleanAnchor = `async function cleanGeneratedOutput(outDir: string): Promise<void> {`;
if (!compiler.includes(cleanAnchor)) throw new Error("compiler helper insertion anchor not found");
const helpers = `function createBuildCompatibilityId(input: {\n  runtimeConfig: Record<string, unknown>;\n  routes: RouteManifestRecord[];\n  components: CompiledComponent[];\n  plugins: CompiledPlugin[];\n  middleware: CompiledMiddleware[];\n  serverMiddleware: CompiledServerMiddleware[];\n  serverHandlers: ServerHandlerRecord[];\n  packages: PackageManifestEntry[];\n}): string {\n  const hash = createHash("sha256");\n  hash.update("resux-build-compatibility-v1\\0");\n  hash.update(getClientRuntimeSource());\n  hash.update(JSON.stringify(input.runtimeConfig));\n  hash.update(JSON.stringify(input.routes.map(({ id, path: routePath, params, componentId, meta }) => ({ id, path: routePath, params, componentId, meta }))));\n  for (const component of input.components) {\n    hash.update(component.id);\n    hash.update(component.serverSource);\n    hash.update(component.clientSource);\n  }\n  for (const plugin of input.plugins) {\n    hash.update(plugin.id);\n    hash.update(plugin.serverSource);\n    hash.update(plugin.clientSource);\n  }\n  for (const entry of input.middleware) {\n    hash.update(entry.id);\n    hash.update(entry.serverSource);\n    hash.update(entry.clientSource);\n  }\n  for (const entry of input.serverMiddleware) {\n    hash.update(entry.id);\n    hash.update(entry.source);\n  }\n  for (const entry of input.serverHandlers) {\n    hash.update(entry.id);\n    hash.update(entry.source);\n  }\n  hash.update(JSON.stringify(input.packages));\n  return hash.digest("hex").slice(0, 24);\n}\n\nfunction injectRuntimeBuildCompatibilityId(runtimeConfig: Record<string, unknown>, buildId: string): void {\n  const configuredRuntime = isPlainObject(runtimeConfig.runtimeConfig)\n    ? runtimeConfig.runtimeConfig\n    : {};\n  const publicConfig = isPlainObject(configuredRuntime.public)\n    ? configuredRuntime.public\n    : {};\n  configuredRuntime.public = {\n    ...publicConfig,\n    __resuxBuildId: buildId,\n  };\n  runtimeConfig.runtimeConfig = configuredRuntime;\n}\n\n`;
compiler = compiler.replace(cleanAnchor, helpers + cleanAnchor);
await writeFile(compilerPath, compiler, "utf8");

let runtime = await readFile(runtimePath, "utf8");
const navAnchor = `    const result = await loadRoute(routePath, {\n      reason: "navigation",\n      force: options.force === true\n    });\n    if (transitionToken !== routeTransitionToken) {`;
const navReplacement = `    const result = await loadRoute(routePath, {\n      reason: "navigation",\n      force: options.force === true\n    });\n    if (!ensureRoutePayloadBuildCompatibility(result)) {\n      return;\n    }\n    if (transitionToken !== routeTransitionToken) {`;
if (!runtime.includes(navAnchor)) throw new Error("navigation compatibility anchor not found");
runtime = runtime.replace(navAnchor, navReplacement);

const applyHeadAnchor = `function applyHtmlAttrs(attrs) {`;
if (!runtime.includes(applyHeadAnchor)) throw new Error("runtime compatibility helper insertion anchor not found");
const runtimeHelpers = `function readRoutePayloadBuildId(payload) {\n  const value = payload?.config?.public?.__resuxBuildId;\n  return typeof value === "string" && value ? value : null;\n}\n\nfunction ensureRoutePayloadBuildCompatibility(result) {\n  const currentBuildId = readRoutePayloadBuildId(globalThis.__RESUX__);\n  const nextBuildId = readRoutePayloadBuildId(result?.payload);\n  if (!currentBuildId || !nextBuildId || currentBuildId === nextBuildId) {\n    return true;\n  }\n\n  invalidateAllRoutePayloads();\n  dispatchManagedEvent(document, "resux:build-mismatch", {\n    currentBuildId,\n    nextBuildId\n  });\n  location.reload();\n  return false;\n}\n\n`;
runtime = runtime.replace(applyHeadAnchor, runtimeHelpers + applyHeadAnchor);
await writeFile(runtimePath, runtime, "utf8");

let tests = await readFile(performanceTestPath, "utf8");
const scanAnchor = `  it("scans client enhancements once per page-finish lifecycle instead of repeatedly during boot", () => {`;
if (!tests.includes(scanAnchor)) throw new Error("runtime test build compatibility insertion anchor not found");
const compatibilityTest = `  it("reloads safely when a route payload belongs to a different build", () => {\n    const source = getClientRuntimeSource();\n\n    expect(source).toContain("function ensureRoutePayloadBuildCompatibility(result)");\n    expect(source).toContain("currentBuildId === nextBuildId");\n    expect(source).toContain('dispatchManagedEvent(document, "resux:build-mismatch"');\n    expect(source).toContain("location.reload();");\n    expect(source).toContain("invalidateAllRoutePayloads();");\n  });\n\n`;
tests = tests.replace(scanAnchor, compatibilityTest + scanAnchor);
await writeFile(performanceTestPath, tests, "utf8");

console.log("Patched deterministic build compatibility IDs and client mismatch recovery.");
