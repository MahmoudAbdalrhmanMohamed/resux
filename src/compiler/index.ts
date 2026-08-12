import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NodeTypes, parse as parseTemplate, type AttributeNode, type DirectiveNode, type ElementNode, type Node as VueCompilerNode, type SimpleExpressionNode, type TemplateChildNode } from "@vue/compiler-dom";
import { compileStyle, parse as parseSfc, type SFCStyleBlock } from "@vue/compiler-sfc";
import vuePlugin from "@vitejs/plugin-vue";
import ts from "typescript";
import { build as viteBuild } from "vite";
import { createResux } from "../core/resux.js";
import type { ResuxHooks } from "../core/hooks.js";
import { ResuxModuleContainer, type ResuxModuleContext as CoreResuxModuleContext, type ResuxModuleContributions } from "../core/module-container.js";
import { buildLocalePath, normalizeI18nRuntimeConfig, type ResuxI18nRuntimeConfig } from "../i18n/shared.js";
import { withResuxKitContext } from "../kit/index.js";
import {
  getClientRuntimeSource,
  type ComponentStyle,
  type ElementTemplateNode,
  type PageMeta,
  type ResuxPackageMode,
  type ResuxPackagesConfig,
  type TemplateAttribute,
  type TemplateEvent,
  type TemplateNode,
} from "../runtime/index.js";

const require = createRequire(import.meta.url);

export interface CompileErrorLocation {
  file: string;
  line: number;
  column: number;
}

export class ResuxCompileError extends Error {
  readonly location?: CompileErrorLocation;

  constructor(message: string, location?: CompileErrorLocation) {
    super(location ? `${message} (${location.file}:${location.line}:${location.column})` : message);
    this.name = "ResuxCompileError";
    this.location = location;
  }
}

export interface CompiledComponent {
  id: string;
  name: string;
  file: string;
  serverSource: string;
  clientSource: string;
  template: TemplateNode[];
  handlers: string[];
  styles: ComponentStyle[];
  styleScopeId?: string;
  meta?: PageMeta;
  expressions?: { id: string; original: string; transformed: string; locals: string[] }[];
}

export interface RouteManifestRecord {
  id: string;
  path: string;
  file: string;
  params: string[];
  componentId: string;
  meta?: PageMeta;
}

export interface CompiledPlugin {
  id: string;
  file: string;
  mode: "all" | "server" | "client";
  serverSource: string;
  clientSource: string;
}

export interface ClientEnhancementManifestEntry {
  name: string;
  id: string;
  file: string;
  src: string;
}

export interface CompiledMiddleware {
  id: string;
  name: string;
  file: string;
  mode: "all" | "server" | "client";
  global: boolean;
  serverSource: string;
  clientSource: string;
}

export interface CompiledServerMiddleware {
  id: string;
  file: string;
  source: string;
}

export interface ServerHandlerRecord {
  id: string;
  path: string;
  file: string;
  params: string[];
  source: string;
}

export interface VueIslandRecord {
  name: string;
  file: string;
}

export interface RouteRuleConfig {
  headers?: Record<string, string>;
  redirect?: string | { to: string; statusCode?: number };
  statusCode?: number;
  cache?: false | string | { maxAge?: number; swr?: number };
  cors?: boolean | {
    origin?: string;
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
}

export interface BuildResult {
  appRoot: string;
  outDir: string;
  routes: RouteManifestRecord[];
  components: CompiledComponent[];
  layouts: CompiledComponent[];
  plugins: CompiledPlugin[];
  clientEnhancements: ClientEnhancementManifestEntry[];
  middleware: CompiledMiddleware[];
  serverMiddleware: CompiledServerMiddleware[];
  serverHandlers: ServerHandlerRecord[];
  vueIslands: VueIslandRecord[];
  routeRules: Record<string, RouteRuleConfig>;
  app?: CompiledComponent;
  error?: CompiledComponent;
}

export interface BuildOptions {
  vite?: "build" | "dev";
  server?: "bundle" | "modules";
  hooks?: ResuxHooks;
  changedPath?: string;
  traceBuild?: boolean;
}

interface ScriptAnalysis {
  setupBody: string;
  imports: string;
  importDeclarations: (ts.ImportDeclaration | ts.ImportEqualsDeclaration)[];
  bindings: string[];
  handlerNames: Set<string>;
  resumableBindings: Set<string>;
  importedBindings: Set<string>;
  inlineHandlerLocals: Map<string, string[]>;
  templateRefBindings: Set<string>;
  handlers: Map<string, ts.Node>;
  sourceFile: ts.SourceFile;
  pageMeta?: PageMeta;
}

type PackageUsageMode = "all" | "client" | "server";

interface PackageSourceFileInput {
  file: string;
  mode: PackageUsageMode;
}

interface PackageManifestEntry {
  name: string;
  specifiers: string[];
  files: string[];
  modes: PackageUsageMode[];
  dynamic: boolean;
  cssImports: string[];
  missing: boolean;
  declaredMode: ResuxPackageMode;
  warnings: string[];
}

interface ClientRuntimePackageRegistry {
  importers: string[];
  cssByPackage: Record<string, string[]>;
  declared: string[];
}

interface CompileTemplateState {
  file: string;
  templateRefBindings: Set<string>;
  bindingIndex: number;
  inlineHandlerIndex: number;
  handlers: TemplateEvent[];
  inlineHandlers: GeneratedHandler[];
  expressions: { id: string; original: string; transformed: string; locals: string[] }[];
  activeLocals: string[];
  allLocals: Set<string>;
}

interface GeneratedHandler {
  name: string;
  source: string;
  locals?: string[];
}

interface CompileTemplateNodeOptions {
  ifExpressionOverride?: string;
}

interface ConditionalDirectiveInfo {
  kind: "if" | "else-if" | "else";
  directive: DirectiveNode;
  expression?: string;
}

type ResuxConfig = Record<string, unknown> & {
  app?: { head?: unknown };
  css?: unknown;
  i18n?: unknown;
  packages?: unknown;
  video?: unknown;
  modules?: unknown;
  deploy?: {
    target?: "auto" | "node" | "vercel" | "netlify" | "cloudflare" | "static";
    nitroPreset?: string;
  };
  routeRules?: Record<string, RouteRuleConfig>;
  runtimeConfig?: Record<string, unknown>;
};

type ResuxModuleContext = CoreResuxModuleContext;

type ResuxModuleSetup = (options: unknown, context: ResuxModuleContext) => unknown | Promise<unknown>;

interface BuiltinResuxModule {
  defaults?: Record<string, unknown>;
  setup: ResuxModuleSetup;
}

const RESUMABLE_HANDLER_ALLOWED_GLOBALS = new Set([
  "Math",
  "Number",
  "String",
  "Boolean",
  "Array",
  "Object",
  "Date",
  "JSON",
  "Intl",
  "Promise",
  "console",
  "undefined",
  "globalThis",
  "performance",
  "fetch",
  "Headers",
  "Request",
  "Response",
  "URL",
  "URLSearchParams",
  "AbortController",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "queueMicrotask",
  "ref",
  "reactive",
  "computed",
  "watch",
  "watchEffect",
  "readonly",
  "toRef",
  "toRefs",
  "unref",
  "isRef",
  "isReactive",
  "isReadonly",
  "nextTick",
  "useState",
  "useGlobalState",
  "useAsyncData",
  "useRoute",
  "useRouter",
  "useHead",
  "useSeoMeta",
  "useRuntimeConfig",
  "useResuxApp",
  "useResuxImage",
  "useI18n",
  "useLocalePath",
  "useSwitchLocalePath",
  "useDevice",
  "$device",
  "apiURL",
  "useFetch",
  "$fetch",
  "useError",
  "clearError",
  "showError",
  "createError",
  "useLazyPackage",
  "useClientPackage",
  "usePackageReady",
  "defineLazyPackage",
  "defineClientOnlyPackage",
  "definePackageAdapter",
  "defineClientEnhancement",
  "useClientEnhancement",
  "onMounted",
  "definePageMeta",
  "defineProps"
]);

const BUILTIN_AUTO_IMPORTS: Array<{ from: string; name: string; as?: string }> = [
  { from: "resuxjs", name: "useRoute" },
  { from: "resuxjs", name: "useRouter" },
  { from: "resuxjs", name: "useLocalePath" },
  { from: "resuxjs", name: "useSwitchLocalePath" },
  { from: "resuxjs", name: "useI18n" },
  { from: "resuxjs", name: "useResuxApp" },
  { from: "resuxjs", name: "useDevice" },
  { from: "resuxjs", name: "navigateTo" },
  { from: "resuxjs", name: "abortNavigation" },
  { from: "resuxjs", name: "useHead" },
  { from: "resuxjs", name: "useSeoMeta" },
  { from: "resuxjs", name: "useRuntimeConfig" },
  { from: "resuxjs", name: "useState" },
  { from: "resuxjs", name: "useGlobalState" },
  { from: "resuxjs", name: "useFetch" },
  { from: "resuxjs", name: "useAsyncData" },
  { from: "resuxjs", name: "$fetch" },
  { from: "resuxjs", name: "useError" },
  { from: "resuxjs", name: "clearError" },
  { from: "resuxjs", name: "showError" },
  { from: "resuxjs", name: "createError" },
  { from: "resuxjs", name: "useLazyPackage" },
  { from: "resuxjs", name: "useClientPackage" },
  { from: "resuxjs", name: "usePackageReady" },
  { from: "resuxjs", name: "defineLazyPackage" },
  { from: "resuxjs", name: "defineClientOnlyPackage" },
  { from: "resuxjs", name: "definePackageAdapter" },
  { from: "resuxjs", name: "defineClientEnhancement" },
  { from: "resuxjs", name: "useClientEnhancement" }
];

const SUPPORT_CLIENT_RUNTIME_HELPERS = [
  "useLazyPackage",
  "useClientPackage",
  "usePackageReady",
  "defineLazyPackage",
  "defineClientOnlyPackage",
  "definePackageAdapter",
  "defineClientEnhancement",
  "useClientEnhancement",
] as const;

const CLIENT_ENHANCEMENT_DIR_CANDIDATES = [
  "client-enhancements",
  "enhancements",
  path.join("app", "client-enhancements"),
  path.join("app", "enhancements"),
] as const;

interface SupportModuleTranspileOptions {
  prefix?: string;
  autoImports?: Array<{ from: string; names: readonly string[] }>;
  rewriteImports?: Record<string, string>;
}

export async function buildProject(appRoot: string, outDir = path.join(appRoot, ".resux"), options: BuildOptions = {}): Promise<BuildResult> {
  const absoluteRoot = path.resolve(appRoot);
  const absoluteOut = path.resolve(outDir);
  const buildOptions = {
    vite: options.vite ?? "build",
    server: options.server ?? (options.vite === "dev" ? "modules" : "bundle"),
    hooks: options.hooks,
    traceBuild: options.traceBuild === true
  };
  const mode = buildOptions.vite === "dev" ? "dev" : "build";
  const incrementalDevBuild = mode === "dev" && typeof options.changedPath === "string" && options.changedPath.length > 0;
  const hooks = buildOptions.hooks ?? createResux({ rootDir: absoluteRoot, buildDir: absoluteOut, config: {} }).hooks;

  try {
    await hooks.callHook("build:before", { appRoot: absoluteRoot, outDir: absoluteOut, mode });
    if (!incrementalDevBuild) {
      await cleanGeneratedOutput(absoluteOut);
    }
    await ensureGeneratedDirs(absoluteOut, buildOptions.vite === "dev");

    const { config: runtimeConfig, moduleContainer } = await readRuntimeConfig(absoluteRoot, absoluteOut, hooks);
    const contributions = moduleContainer.contributions;
    await hooks.callHook("config:resolved", { rootDir: absoluteRoot, buildDir: absoluteOut, config: runtimeConfig });
    await hooks.callHook("app:resolve", { appRoot: absoluteRoot, outDir: absoluteOut });

    const routeRules = createRouteRules(runtimeConfig);
    const componentDirs = unique([
      path.join(absoluteRoot, "components"),
      path.join(absoluteRoot, "app", "components"),
      ...contributions.componentDirs.map((entry) => path.resolve(absoluteRoot, entry.path))
    ]);
    await hooks.callHook("components:dirs", { dirs: componentDirs });
    const componentFiles = await discoverVueFilesFromDirs(componentDirs);
    componentFiles.push(...contributions.components.map((entry) => path.resolve(absoluteRoot, entry.file)));
    const uniqueComponentFiles = unique(componentFiles).sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));

    const pageFiles = await discoverAppVueFiles(absoluteRoot, "pages");
    const layoutFiles = await discoverAppVueFiles(absoluteRoot, "layouts");
    const appFile = await optionalFile(path.join(absoluteRoot, "app.vue"))
      ?? await optionalFile(path.join(absoluteRoot, "app", "app.vue"));
    const errorFile = await optionalFile(path.join(absoluteRoot, "error.vue"))
      ?? await optionalFile(path.join(absoluteRoot, "app", "error.vue"));

    const pluginDirs = [
      path.join(absoluteRoot, "plugins"),
      path.join(absoluteRoot, "app", "plugins"),
      path.join(absoluteRoot, "enhancements"),
      path.join(absoluteRoot, "client-enhancements"),
      path.join(absoluteRoot, "app", "enhancements"),
      path.join(absoluteRoot, "app", "client-enhancements"),
    ];
    await hooks.callHook("plugins:dirs", { dirs: pluginDirs });
    const pluginFiles = await discoverSupportTsFiles(absoluteRoot, "plugins");
    const modulePluginEntries = contributions.plugins.map((entry) => ({
      file: path.resolve(absoluteRoot, entry.src),
      mode: entry.mode ?? "all"
    }));
    const pluginModeByFile = new Map<string, "all" | "server" | "client">();
    for (const entry of modulePluginEntries) {
      pluginModeByFile.set(entry.file, entry.mode);
      pluginFiles.push(entry.file);
    }
    const clientEnhancementFiles = await discoverClientEnhancementFiles(absoluteRoot);
    for (const file of clientEnhancementFiles) {
      if (!pluginModeByFile.has(file)) {
        pluginModeByFile.set(file, "client");
      }
      pluginFiles.push(file);
    }
    const clientEnhancementFileSet = new Set(
      clientEnhancementFiles.map((file) => normalizePath(path.resolve(file))),
    );

    const middlewareDirs = [path.join(absoluteRoot, "middleware"), path.join(absoluteRoot, "app", "middleware")];
    await hooks.callHook("middleware:dirs", { dirs: middlewareDirs });
    const middlewareFiles = await discoverSupportTsFiles(absoluteRoot, "middleware");
    const moduleMiddlewareEntries = contributions.middleware.map((entry) => ({
      file: path.resolve(absoluteRoot, entry.src),
      mode: entry.mode ?? "all",
      global: entry.global === true,
      name: entry.name
    }));
    const middlewareMetaByFile = new Map<string, { mode: "all" | "server" | "client"; global: boolean; name: string }>();
    for (const entry of moduleMiddlewareEntries) {
      middlewareMetaByFile.set(entry.file, entry);
      middlewareFiles.push(entry.file);
    }

    const serverMiddlewareFiles = await discoverSupportTsFiles(absoluteRoot, path.join("server", "middleware"));
    const serverHandlerFiles = [
      ...await discoverServerFiles(path.join(absoluteRoot, "server", "api"), "/api"),
      ...await discoverServerFiles(path.join(absoluteRoot, "server", "routes"), "")
    ];
    for (const handler of contributions.serverHandlers) {
      serverHandlerFiles.push({
        file: path.resolve(absoluteRoot, handler.handler),
        path: normalizeRoutePath(handler.route)
      });
    }

    const vueIslands = await discoverVueIslands(absoluteRoot);
    const allFiles = [...uniqueComponentFiles, ...layoutFiles, ...pageFiles, ...(appFile ? [appFile] : []), ...(errorFile ? [errorFile] : [])];
    const idByFile = new Map<string, string>();
    const compiledByFile = new Map<string, CompiledComponent>();
    let index = 0;

    for (const file of allFiles) {
      idByFile.set(file, `m${index++}`);
    }

    for (const file of allFiles) {
      const component = await compileVueFile(file, {
        id: idByFile.get(file)!,
        name: inferComponentName(absoluteRoot, file, componentDirs)
      });
      compiledByFile.set(file, component);
      await writeFile(path.join(absoluteOut, "server", `${component.id}.mjs`), component.serverSource, "utf8");
      await writeFile(path.join(absoluteOut, "vite-client", "handlers", `${component.id}.mjs`), component.clientSource, "utf8");
    }

    const baseRoutes = createRouteManifest(absoluteRoot, pageFiles, idByFile, compiledByFile);
    for (const extender of contributions.pagesExtenders) {
      await extender(baseRoutes as unknown as Array<Record<string, unknown>>);
    }
    await hooks.callHook("pages:extend", { pages: baseRoutes as unknown as Array<Record<string, unknown>> });
    const routes = localizeRouteManifest(baseRoutes, runtimeConfig);
    await hooks.callHook("pages:resolved", { pages: routes as unknown as Array<Record<string, unknown>> });

    const components = allFiles.map((file) => compiledByFile.get(file)!);
    const layouts = layoutFiles.map((file) => compiledByFile.get(file)!);
    const plugins = unique(pluginFiles).sort((left, right) => normalizePath(left).localeCompare(normalizePath(right))).map((file, pluginIndex) => {
      const compiled = compilePluginFile(file, pluginIndex);
      const mode = pluginModeByFile.get(file);
      if (mode) {
        compiled.mode = mode;
      }
      return compiled;
    });
    const clientEnhancements = plugins
      .filter((plugin) => (
        plugin.mode !== "server"
        && clientEnhancementFileSet.has(normalizePath(path.resolve(plugin.file)))
      ))
      .map((plugin) => ({
        name: supportFileBaseName(plugin.file),
        id: plugin.id,
        file: plugin.file,
        src: `/__resux/plugins/${plugin.id}.mjs`,
      }))
      .sort((left, right) => left.name.localeCompare(right.name) || normalizePath(left.file).localeCompare(normalizePath(right.file)));
    const middleware = unique(middlewareFiles).sort((left, right) => normalizePath(left).localeCompare(normalizePath(right))).map((file, middlewareIndex) => {
      const compiled = compileMiddlewareFile(file, middlewareIndex);
      const meta = middlewareMetaByFile.get(file);
      if (meta) {
        compiled.mode = meta.mode;
        compiled.global = meta.global;
        compiled.name = kebabCase(meta.name);
      }
      return compiled;
    });
    const serverMiddleware = serverMiddlewareFiles.map((file, middlewareIndex) => compileServerMiddlewareFile(file, middlewareIndex));
    const serverHandlers = uniqueServerHandlers(serverHandlerFiles).map((record, handlerIndex) => compileServerHandlerFile(record.file, handlerIndex, record.path));
    const app = appFile ? compiledByFile.get(appFile) : undefined;
    const error = errorFile ? compiledByFile.get(errorFile) : undefined;
    await hooks.callHook("components:extend", { components: components as unknown as Array<Record<string, unknown>> });
    await hooks.callHook("plugins:extend", { plugins: plugins as unknown as Array<Record<string, unknown>> });
    await hooks.callHook("middleware:extend", { middleware: middleware as unknown as Array<Record<string, unknown>> });

    for (const plugin of plugins) {
      if (plugin.mode !== "client") {
        await writeFile(path.join(absoluteOut, "server", "resux-plugins", `${plugin.id}.mjs`), plugin.serverSource, "utf8");
      }
      if (plugin.mode !== "server") {
        await writeFile(path.join(absoluteOut, "vite-client", "plugins", `${plugin.id}.mjs`), plugin.clientSource, "utf8");
      }
    }
    await writeClientEnhancementManifests(absoluteOut, clientEnhancements);

    for (const entry of middleware) {
      if (entry.mode !== "client") {
        await writeFile(path.join(absoluteOut, "server", "resux-middleware", `${entry.id}.mjs`), entry.serverSource, "utf8");
      }
      if (entry.mode !== "server") {
        await writeFile(path.join(absoluteOut, "vite-client", "middleware", `${entry.id}.mjs`), entry.clientSource, "utf8");
      }
    }

    for (const entry of serverMiddleware) {
      await writeFile(path.join(absoluteOut, "server", "request-middleware", `${entry.id}.mjs`), entry.source, "utf8");
    }

    for (const handler of serverHandlers) {
      await writeFile(path.join(absoluteOut, "server", "handlers", `${handler.id}.mjs`), handler.source, "utf8");
    }

    for (const island of vueIslands) {
      const islandEntryDir = path.join(absoluteOut, "vite-client", "vue-islands");
      await writeFile(path.join(islandEntryDir, `${island.name}.mjs`), createVueIslandClientSource(island, islandEntryDir), "utf8");
    }

    const importDirs = unique([
      path.join(absoluteRoot, "composables"),
      path.join(absoluteRoot, "utils"),
      path.join(absoluteRoot, "shared"),
      path.join(absoluteRoot, "server", "utils"),
      ...contributions.importDirs.map((dir) => path.resolve(absoluteRoot, dir))
    ]);
    await hooks.callHook("imports:dirs", { dirs: importDirs });
    const discoveredAutoImports = await discoverAutoImportsFromDirs(absoluteRoot, importDirs);
    const mergedImports = dedupeImports([...contributions.imports, ...discoveredAutoImports]);
    await hooks.callHook("imports:extend", { imports: mergedImports as unknown as Array<Record<string, unknown>> });
    await hooks.callHook("app:templates", { outDir: absoluteOut, templatesDir: path.join(absoluteOut, "templates") });
    const generatedTemplateFiles = await writeModuleTemplates(absoluteOut, contributions);
    await hooks.callHook("app:templatesGenerated", { outDir: absoluteOut, files: generatedTemplateFiles });

    const additionalSharedPackageFiles = unique([
      ...await discoverSupportTsFiles(absoluteRoot, "composables"),
      ...await discoverSupportTsFiles(absoluteRoot, "utils"),
      ...await discoverSupportTsFiles(absoluteRoot, "shared"),
    ]);
    const additionalServerPackageFiles = unique([
      ...await discoverSupportTsFiles(absoluteRoot, path.join("server", "utils")),
      ...await discoverSupportTsFiles(absoluteRoot, path.join("server", "plugins")),
    ]);
    const packageSources: PackageSourceFileInput[] = uniquePackageSourceFiles([
      ...components.map((component) => ({ file: component.file, mode: "all" as const })),
      ...plugins.map((plugin) => ({ file: plugin.file, mode: plugin.mode as PackageUsageMode })),
      ...middleware.map((entry) => ({ file: entry.file, mode: entry.mode as PackageUsageMode })),
      ...serverMiddleware.map((entry) => ({ file: entry.file, mode: "server" as const })),
      ...serverHandlers.map((entry) => ({ file: entry.file, mode: "server" as const })),
      ...additionalSharedPackageFiles.map((file) => ({ file, mode: "all" as const })),
      ...additionalServerPackageFiles.map((file) => ({ file, mode: "server" as const })),
    ]);
    const packageDiagnostics = await analyzePackageUsage(
      absoluteRoot,
      packageSources,
      runtimeConfig,
    );
    const packageRegistry = createClientRuntimePackageRegistry(
      absoluteRoot,
      readConfiguredPackages(runtimeConfig),
      packageDiagnostics,
    );
    const buildCompatibilityId = createBuildCompatibilityId({
      runtimeConfig,
      routes,
      components,
      plugins,
      middleware,
      serverMiddleware,
      serverHandlers,
      packages: packageDiagnostics,
    });
    injectRuntimeBuildCompatibilityId(runtimeConfig, buildCompatibilityId);

    if (buildOptions.vite === "dev") {
      await writeViteClientRuntime(absoluteOut, packageRegistry);
      await hooks.callHook("vite:compiled", { outDir: absoluteOut, dev: true });
    } else {
      await buildClientAssets(
        absoluteRoot,
        absoluteOut,
        components,
        plugins,
        middleware,
        vueIslands,
        packageRegistry,
        hooks,
        contributions,
      );
      await hooks.callHook("vite:compiled", { outDir: absoluteOut, dev: false });
    }
    await ensureServerComponentModules(absoluteOut, components);

    const runtimeArtifacts = buildRuntimeArtifacts({
      routes,
      components,
      layouts,
      plugins,
      clientEnhancements,
      middleware,
      serverMiddleware,
      serverHandlers,
      vueIslands,
      app,
      error,
      runtimeConfig,
      routeRules,
      packages: packageDiagnostics,
      buildOptions: { vite: buildOptions.vite, server: buildOptions.server },
      contributions: {
        ...contributions,
        imports: mergedImports
      }
    });

    await hooks.callHook("build:manifest", { manifest: runtimeArtifacts.manifest as Record<string, unknown>, outDir: absoluteOut });
    await writeFile(
      path.join(absoluteOut, "server", "manifest.mjs"),
      createServerManifestSource(routes, components, layouts, plugins, middleware, serverMiddleware, serverHandlers, vueIslands, app, error, runtimeConfig, buildOptions),
      "utf8"
    );
    await writeGeneratedArtifacts(absoluteOut, runtimeArtifacts, buildOptions.vite === "dev");
    await hooks.callHook("prepare:types", {
      outDir: absoluteOut,
      files: [
        path.join(absoluteOut, "resux.d.ts"),
        path.join(absoluteOut, "imports.d.ts"),
        path.join(absoluteOut, "components.d.ts"),
        path.join(absoluteOut, "server-routes.d.ts")
      ]
    });

    if (buildOptions.server === "bundle") {
      await buildServerBundle(absoluteRoot, absoluteOut);
    }

    await hooks.callHook("build:done", { appRoot: absoluteRoot, outDir: absoluteOut, mode });
    return {
      appRoot: absoluteRoot,
      outDir: absoluteOut,
      routes,
      components,
      layouts,
      plugins,
      clientEnhancements,
      middleware,
      serverMiddleware,
      serverHandlers,
      vueIslands,
      routeRules,
      app,
      error
    };
  } catch (error) {
    await hooks.callHook("build:error", { appRoot: absoluteRoot, outDir: absoluteOut, mode, error });
    throw error;
  }
}

function createBuildCompatibilityId(input: {
  runtimeConfig: Record<string, unknown>;
  routes: RouteManifestRecord[];
  components: CompiledComponent[];
  plugins: CompiledPlugin[];
  middleware: CompiledMiddleware[];
  serverMiddleware: CompiledServerMiddleware[];
  serverHandlers: ServerHandlerRecord[];
  packages: PackageManifestEntry[];
}): string {
  const hash = createHash("sha256");
  hash.update("resux-build-compatibility-v1\0");
  hash.update(getClientRuntimeSource());
  hash.update(JSON.stringify(input.runtimeConfig));
  hash.update(JSON.stringify(input.routes.map(({ id, path: routePath, params, componentId, meta }) => ({ id, path: routePath, params, componentId, meta }))));
  for (const component of input.components) {
    hash.update(component.id);
    hash.update(component.serverSource);
    hash.update(component.clientSource);
  }
  for (const plugin of input.plugins) {
    hash.update(plugin.id);
    hash.update(plugin.serverSource);
    hash.update(plugin.clientSource);
  }
  for (const entry of input.middleware) {
    hash.update(entry.id);
    hash.update(entry.serverSource);
    hash.update(entry.clientSource);
  }
  for (const entry of input.serverMiddleware) {
    hash.update(entry.id);
    hash.update(entry.source);
  }
  for (const entry of input.serverHandlers) {
    hash.update(entry.id);
    hash.update(entry.source);
  }
  hash.update(JSON.stringify(input.packages));
  return hash.digest("hex").slice(0, 24);
}

function injectRuntimeBuildCompatibilityId(runtimeConfig: Record<string, unknown>, buildId: string): void {
  const configuredRuntime = isPlainObject(runtimeConfig.runtimeConfig)
    ? runtimeConfig.runtimeConfig
    : {};
  const publicConfig = isPlainObject(configuredRuntime.public)
    ? configuredRuntime.public
    : {};
  configuredRuntime.public = {
    ...publicConfig,
    __resuxBuildId: buildId,
  };
  runtimeConfig.runtimeConfig = configuredRuntime;
}

async function cleanGeneratedOutput(outDir: string): Promise<void> {
  const directoryRmOptions = {
    recursive: true,
    force: true,
    maxRetries: 6,
    retryDelay: 40,
  } as const;
  await mkdir(outDir, { recursive: true });
  await rm(path.join(outDir, "server"), directoryRmOptions);
  await rm(path.join(outDir, "server-bundle"), directoryRmOptions);
  await rm(path.join(outDir, "client"), directoryRmOptions);
  await rm(path.join(outDir, "vite-client"), directoryRmOptions);
  await rm(path.join(outDir, "manifest"), directoryRmOptions);
  await rm(path.join(outDir, "types"), directoryRmOptions);
  await rm(path.join(outDir, "cache"), directoryRmOptions);
  await rm(path.join(outDir, "dev"), directoryRmOptions);
  await rm(path.join(outDir, "templates"), directoryRmOptions);
  await rm(path.join(outDir, "app.mjs"), { force: true });
  await rm(path.join(outDir, "routes.mjs"), { force: true });
  await rm(path.join(outDir, "plugins.mjs"), { force: true });
  await rm(path.join(outDir, "middleware.mjs"), { force: true });
  await rm(path.join(outDir, "components.mjs"), { force: true });
  await rm(path.join(outDir, "imports.mjs"), { force: true });
  await rm(path.join(outDir, "resux.d.ts"), { force: true });
  await rm(path.join(outDir, "imports.d.ts"), { force: true });
  await rm(path.join(outDir, "components.d.ts"), { force: true });
  await rm(path.join(outDir, "server-routes.d.ts"), { force: true });
  await rm(path.join(outDir, "manifest.json"), { force: true });
  await rm(path.join(outDir, "client-enhancements.mjs"), { force: true });
}

async function ensureGeneratedDirs(outDir: string, _dev: boolean): Promise<void> {
  await mkdir(path.join(outDir, "server"), { recursive: true });
  await mkdir(path.join(outDir, "server", "resux-plugins"), { recursive: true });
  await mkdir(path.join(outDir, "server", "resux-middleware"), { recursive: true });
  await mkdir(path.join(outDir, "server", "request-middleware"), { recursive: true });
  await mkdir(path.join(outDir, "server", "handlers"), { recursive: true });
  await mkdir(path.join(outDir, "server", "config-modules"), { recursive: true });
  await mkdir(path.join(outDir, "client", "handlers"), { recursive: true });
  await mkdir(path.join(outDir, "client", "vue-islands"), { recursive: true });
  await mkdir(path.join(outDir, "client", "plugins"), { recursive: true });
  await mkdir(path.join(outDir, "client", "middleware"), { recursive: true });
  await mkdir(path.join(outDir, "vite-client", "handlers"), { recursive: true });
  await mkdir(path.join(outDir, "vite-client", "vue-islands"), { recursive: true });
  await mkdir(path.join(outDir, "vite-client", "plugins"), { recursive: true });
  await mkdir(path.join(outDir, "vite-client", "middleware"), { recursive: true });
  await mkdir(path.join(outDir, "manifest"), { recursive: true });
  await mkdir(path.join(outDir, "types"), { recursive: true });
  await mkdir(path.join(outDir, "cache"), { recursive: true });
  await mkdir(path.join(outDir, "templates"), { recursive: true });
  await mkdir(path.join(outDir, "dev"), { recursive: true });
}

async function buildServerBundle(root: string, outDir: string): Promise<void> {
  try {
    await viteBuild({
      root,
      configFile: false,
      publicDir: false,
      appType: "custom",
      clearScreen: false,
      logLevel: "warn",
      build: {
        ssr: path.join(outDir, "server", "manifest.mjs"),
        outDir: path.join(outDir, "server-bundle"),
        emptyOutDir: true,
        minify: "oxc",
        sourcemap: false,
        manifest: false,
        rollupOptions: {
          external: (id: string) => {
            if (id === "resuxjs" || id.startsWith("resuxjs/")) return true;
            if (id.includes("node_modules") || (!id.startsWith(".") && !path.isAbsolute(id))) return true;
            return false;
          },
          output: {
            format: "es",
            entryFileNames: "index.mjs",
            chunkFileNames: "chunks/[name]-[hash].mjs"
          }
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Vite server build failed. Ensure vite is installed. ${message}`);
  }
}

async function buildClientAssets(
  root: string,
  outDir: string,
  components: CompiledComponent[],
  plugins: CompiledPlugin[],
  middleware: CompiledMiddleware[],
  vueIslands: VueIslandRecord[],
  packageRegistry: ClientRuntimePackageRegistry,
  hooks?: ResuxHooks,
  contributions?: ResuxModuleContributions
): Promise<void> {
  const inputRoot = path.join(outDir, "vite-client");
  const runtimeInput = await writeViteClientRuntime(outDir, packageRegistry);

  const input: Record<string, string> = {
    "runtime-client": runtimeInput
  };

  for (const component of components) {
    input[`handlers/${component.id}`] = path.join(inputRoot, "handlers", `${component.id}.mjs`);
  }

  for (const plugin of plugins.filter((entry) => entry.mode !== "server")) {
    input[`plugins/${plugin.id}`] = path.join(inputRoot, "plugins", `${plugin.id}.mjs`);
  }

  for (const entry of middleware.filter((candidate) => candidate.mode !== "server")) {
    input[`middleware/${entry.id}`] = path.join(inputRoot, "middleware", `${entry.id}.mjs`);
  }

  for (const island of vueIslands) {
    input[`vue-islands/${island.name}`] = path.join(inputRoot, "vue-islands", `${island.name}.mjs`);
  }

  try {
    const viteConfig: Record<string, unknown> = {
      root,
      configFile: false,
      publicDir: false,
      base: "/__resux/",
      appType: "custom",
      clearScreen: false,
      logLevel: "warn",
      plugins: [vuePlugin(), ...(contributions?.vitePlugins ?? [])],
      resolve: {
        alias: {
          vue: require.resolve("vue"),
          "@": normalizePath(root),
          "~": normalizePath(root)
        }
      },
      build: {
        outDir: path.join(outDir, "client"),
        emptyOutDir: false,
        minify: "oxc",
        sourcemap: false,
        manifest: false,
        rollupOptions: {
          input,
          preserveEntrySignatures: "strict",
          external: (id: string) => id === "/__resux/runtime-client.mjs",
          output: {
            format: "es",
            entryFileNames: "[name].mjs",
            chunkFileNames: "chunks/[name]-[hash].mjs",
            assetFileNames: "assets/[name]-[hash][extname]"
          }
        }
      }
    };
    console.log("resux build client viteConfig:", JSON.stringify(viteConfig, null, 2));
    for (const extender of contributions?.viteConfigExtenders ?? []) {
      await extender(viteConfig);
    }
    if (hooks) {
      await hooks.callHook("vite:extendConfig", { config: viteConfig, dev: false });
    }
    await viteBuild(viteConfig as Parameters<typeof viteBuild>[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Vite client build failed. Ensure vite is installed. ${message}`);
  } finally {
    await rm(inputRoot, { recursive: true, force: true });
  }
}

async function writeViteClientRuntime(
  outDir: string,
  packageRegistry: ClientRuntimePackageRegistry,
): Promise<string> {
  const runtimeInput = path.join(outDir, "vite-client", "runtime-client.mjs");
  await writeFile(
    runtimeInput,
    getClientRuntimeSource({
      packageRegistry: {
        importers: packageRegistry.importers,
        css: packageRegistry.cssByPackage,
        declared: packageRegistry.declared,
      },
    }),
    "utf8",
  );
  return runtimeInput;
}

function createClientEnhancementManifestSource(entries: ClientEnhancementManifestEntry[]): string {
  const imports = entries
    .map((entry) => `import ${JSON.stringify(entry.src)};`)
    .join("\n");
  const names = [...new Set(entries.map((entry) => entry.name))];
  if (imports) {
    return `${imports}\n\nexport const clientEnhancements = ${JSON.stringify(names, null, 2)};\n`;
  }
  return `export const clientEnhancements = ${JSON.stringify(names, null, 2)};\n`;
}

async function writeClientEnhancementManifests(
  outDir: string,
  entries: ClientEnhancementManifestEntry[],
): Promise<void> {
  const source = createClientEnhancementManifestSource(entries);
  await writeFile(path.join(outDir, "client-enhancements.mjs"), source, "utf8");
  await writeFile(path.join(outDir, "vite-client", "client-enhancements.mjs"), source, "utf8");
  await writeFile(path.join(outDir, "client", "client-enhancements.mjs"), source, "utf8");
}

export async function compileVueFile(file: string, options: { id: string; name?: string }): Promise<CompiledComponent> {
  const source = await readFile(file, "utf8");
  return compileVueSource(source, {
    file,
    id: options.id,
    name: options.name ?? pascalCase(path.basename(file, ".vue"))
  });
}

export function compileVueSource(source: string, options: { file: string; id: string; name: string }): CompiledComponent {
  const parsed = parseSfc(source, { filename: options.file });
  const descriptor = parsed.descriptor;

  if (!descriptor.template) {
    throw new ResuxCompileError("Resux components need a <template> block.", locationFromOffset(options.file, source, 0));
  }

  const script = descriptor.scriptSetup?.content ?? "";
  const templateRefBindings = inferTemplateRefBindings(script, options.file);
  const template = compileTemplate(descriptor.template.content, options.file, templateRefBindings);
  const analysis = analyzeScript(script, options.file, template.inlineHandlers);
  const compiledStyles = compileSfcStyles(descriptor.styles, {
    id: options.id,
    file: options.file
  });
  validateTemplateHandlers(template.handlers, analysis, options.file, source, template.allLocals);
  const serverSource = createComponentModuleSource({
    id: options.id,
    name: options.name,
    file: options.file,
    template: template.nodes,
    analysis,
    styles: compiledStyles.styles,
    styleScopeId: compiledStyles.styleScopeId,
    client: false,
    expressions: template.expressions
  });
  const clientSource = createComponentModuleSource({
    id: options.id,
    name: options.name,
    file: options.file,
    template: template.nodes,
    analysis,
    styles: compiledStyles.styles,
    styleScopeId: compiledStyles.styleScopeId,
    client: true,
    expressions: template.expressions
  });

  return {
    id: options.id,
    name: options.name,
    file: options.file,
    serverSource,
    clientSource,
    template: template.nodes,
    handlers: [...new Set(template.handlers.map((event) => event.handler))],
    styles: compiledStyles.styles,
    styleScopeId: compiledStyles.styleScopeId,
    meta: analysis.pageMeta,
    expressions: template.expressions
  };
}

function compileSfcStyles(
  styleBlocks: SFCStyleBlock[],
  options: { id: string; file: string }
): { styles: ComponentStyle[]; styleScopeId?: string } {
  const scopeId = `rx-s-${options.id}`;
  const styles: ComponentStyle[] = [];
  let hasScopedStyles = false;

  for (let index = 0; index < styleBlocks.length; index++) {
    const style = styleBlocks[index];
    const lang = style.lang ?? (typeof style.attrs.lang === "string" ? style.attrs.lang : undefined);

    if (lang && lang !== "css") {
      throw new ResuxCompileError(
        `Resux <style> only supports plain CSS in resumable components. Unsupported lang "${lang}".`,
        styleBlockLocation(options.file, style)
      );
    }
    if (style.module) {
      throw new ResuxCompileError(
        "Resux <style module> is not supported in resumable components yet.",
        styleBlockLocation(options.file, style)
      );
    }
    if (style.src) {
      throw new ResuxCompileError(
        "Resux <style src> is not supported in resumable components yet.",
        styleBlockLocation(options.file, style)
      );
    }

    const result = compileStyle({
      id: scopeId,
      filename: options.file,
      source: style.content,
      scoped: Boolean(style.scoped),
      isProd: true
    });

    if (result.errors.length > 0) {
      const error = result.errors[0];
      const message = error instanceof Error ? error.message : String(error);
      throw new ResuxCompileError(message, styleBlockLocation(options.file, style));
    }

    const css = result.code.trim();
    if (!css) {
      continue;
    }

    hasScopedStyles ||= Boolean(style.scoped);
    styles.push({
      id: `${options.id}-${index}`,
      css,
      scoped: Boolean(style.scoped)
    });
  }

  return {
    styles,
    styleScopeId: hasScopedStyles ? `data-v-${scopeId}` : undefined
  };
}

function styleBlockLocation(file: string, style: SFCStyleBlock): CompileErrorLocation {
  return {
    file,
    line: style.loc.start.line,
    column: style.loc.start.column
  };
}

export function createRouteManifest(
  root: string,
  files: string[],
  idByFile?: Map<string, string>,
  compiledByFile?: Map<string, CompiledComponent>
): RouteManifestRecord[] {
  return files
    .map((file, index) => {
      const normalizedRoot = normalizePath(path.resolve(root));
      const normalizedFile = normalizePath(path.resolve(file));
      const appPagesRoot = `${normalizedRoot}/app/pages/`;
      const pagesRoot = `${normalizedRoot}/pages/`;
      const relative = normalizedFile.startsWith(appPagesRoot)
        ? normalizedFile.slice(appPagesRoot.length)
        : normalizedFile.startsWith(pagesRoot)
          ? normalizedFile.slice(pagesRoot.length)
          : normalizePath(path.relative(path.join(root, "pages"), file));
      const withoutExtension = relative.replace(/\.vue$/, "");
      const parts = withoutExtension.split("/");
      const params: string[] = [];
      const routeParts = parts
        .filter((part, partIndex) => !(part === "index" && partIndex === parts.length - 1))
        .map((part) => {
          const catchAllMatch = /^\[\.\.\.([A-Za-z0-9_]+)\]$/.exec(part);
          if (catchAllMatch) {
            params.push(catchAllMatch[1]);
            return `:${catchAllMatch[1]}*`;
          }
          const match = /^\[([A-Za-z0-9_]+)\]$/.exec(part);
          if (match) {
            params.push(match[1]);
            return `:${match[1]}`;
          }
          return part;
        });
      const routePath = `/${routeParts.join("/")}`.replace(/\/$/, "") || "/";

      return {
        id: `r${index}`,
        path: routePath,
        file,
        params,
        componentId: idByFile?.get(file) ?? `m${index}`,
        meta: compiledByFile?.get(file)?.meta
      };
    })
    .sort((a, b) => routeScore(b.path) - routeScore(a.path) || a.path.localeCompare(b.path));
}

async function ensureServerComponentModules(outDir: string, components: CompiledComponent[]): Promise<void> {
  for (const component of components) {
    const file = path.join(outDir, "server", `${component.id}.mjs`);
    if (await existsFile(file)) {
      continue;
    }
    await writeFile(file, component.serverSource, "utf8");
  }
}

function localizeRouteManifest(routes: RouteManifestRecord[], runtimeConfig: Record<string, unknown>): RouteManifestRecord[] {
  const i18n = readRuntimeI18nConfig(runtimeConfig);
  if (!i18n) {
    return routes;
  }

  const localeCodes = i18n.strategy === "no_prefix"
    ? [i18n.defaultLocale]
    : i18n.locales.map((locale) => locale.code);
  const localized: RouteManifestRecord[] = [];
  const seenPaths = new Set<string>();

  for (const route of routes) {
    for (const localeCode of localeCodes) {
      const localizedPath = buildLocalePath(route.path, localeCode, i18n);
      if (seenPaths.has(localizedPath)) {
        continue;
      }
      seenPaths.add(localizedPath);
      localized.push({
        ...route,
        path: localizedPath,
        id: route.id
      });
    }
  }

  return localized
    .sort((a, b) => routeScore(b.path) - routeScore(a.path) || a.path.localeCompare(b.path))
    .map((route, index) => ({
      ...route,
      id: `r${index}`
    }));
}

function readRuntimeI18nConfig(runtimeConfig: Record<string, unknown>): ResuxI18nRuntimeConfig | null {
  const directPublicConfig = isPlainObject(runtimeConfig.public)
    ? runtimeConfig.public
    : null;
  const nestedRuntimeConfig = isPlainObject(runtimeConfig.runtimeConfig)
    ? runtimeConfig.runtimeConfig
    : null;
  const nestedPublicConfig = nestedRuntimeConfig && isPlainObject(nestedRuntimeConfig.public)
    ? nestedRuntimeConfig.public
    : null;
  const publicConfig = directPublicConfig ?? nestedPublicConfig;
  if (!publicConfig) {
    return null;
  }
  const i18n = publicConfig.i18n;
  return normalizeI18nRuntimeConfig(i18n);
}

function compileTemplate(
  template: string,
  file: string,
  templateRefBindings: Set<string> = new Set()
): {
  nodes: TemplateNode[];
  handlers: TemplateEvent[];
  inlineHandlers: GeneratedHandler[];
  expressions: { id: string; original: string; transformed: string; locals: string[] }[];
  allLocals: string[];
} {
  const ast = parseTemplate(template, { comments: false });
  const state: CompileTemplateState = {
    file,
    templateRefBindings,
    bindingIndex: 0,
    inlineHandlerIndex: 0,
    handlers: [],
    inlineHandlers: [],
    expressions: [],
    activeLocals: [],
    allLocals: new Set<string>()
  };

  const nodes = compileTemplateChildren(ast.children, state);
  return {
    nodes,
    handlers: state.handlers,
    inlineHandlers: state.inlineHandlers,
    expressions: state.expressions,
    allLocals: Array.from(state.allLocals)
  };
}

function compileTemplateChildren(children: TemplateChildNode[], state: CompileTemplateState): TemplateNode[] {
  const nodes: TemplateNode[] = [];
  let conditionalChainExpressions: string[] | null = null;

  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      const conditionalDirective = resolveConditionalDirective(child, state);
      if (!conditionalDirective) {
        conditionalChainExpressions = null;
        const compiledNode = compileTemplateNode(child, state);
        if (compiledNode) {
          nodes.push(compiledNode);
        }
        continue;
      }

      if (conditionalDirective.kind === "if") {
        const expressionResult = transformTemplateExpressionCode(
          conditionalDirective.expression!,
          state.templateRefBindings,
          state.file,
          conditionalDirective.directive
        );
        conditionalChainExpressions = [expressionResult.transformed];
        const compiledNode = compileTemplateNode(child, state, { ifExpressionOverride: expressionResult.transformed });
        if (compiledNode) {
          nodes.push(compiledNode);
        }
        continue;
      }

      if (!conditionalChainExpressions || conditionalChainExpressions.length === 0) {
        throw new ResuxCompileError(
          `v-${conditionalDirective.kind} must follow a sibling with v-if or v-else-if.`,
          locationFromVueNode(state.file, conditionalDirective.directive),
        );
      }

      if (conditionalDirective.kind === "else-if") {
        const branchExpressionResult = transformTemplateExpressionCode(
          conditionalDirective.expression!,
          state.templateRefBindings,
          state.file,
          conditionalDirective.directive
        );
        const expression = `${buildConditionalChainGuard(conditionalChainExpressions)} && (${branchExpressionResult.transformed})`;
        conditionalChainExpressions.push(branchExpressionResult.transformed);
        const compiledNode = compileTemplateNode(child, state, { ifExpressionOverride: expression });
        if (compiledNode) {
          nodes.push(compiledNode);
        }
        continue;
      }

      const expression = buildConditionalChainGuard(conditionalChainExpressions);
      conditionalChainExpressions = null;
      const compiledNode = compileTemplateNode(child, state, { ifExpressionOverride: expression });
      if (compiledNode) {
        nodes.push(compiledNode);
      }
      continue;
    }

    if (child.type !== NodeTypes.TEXT || child.content.trim().length > 0) {
      conditionalChainExpressions = null;
    }

    const compiledNode = compileTemplateNode(child, state);
    if (compiledNode) {
      nodes.push(compiledNode);
    }
  }

  return nodes;
}

function buildConditionalChainGuard(expressions: string[]): string {
  return expressions.map((expression) => `!(${expression})`).join(" && ");
}

function resolveConditionalDirective(node: ElementNode, state: CompileTemplateState): ConditionalDirectiveInfo | null {
  let conditional: ConditionalDirectiveInfo | null = null;
  for (const prop of node.props) {
    if (prop.type !== NodeTypes.DIRECTIVE) {
      continue;
    }
    if (prop.name !== "if" && prop.name !== "else-if" && prop.name !== "else") {
      continue;
    }
    if (conditional) {
      throw new ResuxCompileError(
        "Only one conditional directive is allowed per element.",
        locationFromVueNode(state.file, prop),
      );
    }

    const expression = expressionContent(prop.exp).trim();
    if ((prop.name === "if" || prop.name === "else-if") && expression.length === 0) {
      throw new ResuxCompileError(
        `v-${prop.name} needs an expression.`,
        locationFromVueNode(state.file, prop),
      );
    }
    if (prop.name === "else" && expression.length > 0) {
      throw new ResuxCompileError(
        "v-else does not accept an expression.",
        locationFromVueNode(state.file, prop),
      );
    }

    conditional = {
      kind: prop.name,
      directive: prop,
      expression: expression.length > 0 ? expression : undefined,
    };
  }

  return conditional;
}

function expressionContent(node: unknown): string {
  if (node && typeof node === "object" && "content" in node && typeof node.content === "string") {
    return node.content;
  }
  return "";
}

function compileTemplateNode(
  node: TemplateChildNode,
  state: CompileTemplateState,
  options: CompileTemplateNodeOptions = {},
): TemplateNode | null {
  if (node.type === NodeTypes.TEXT) {
    return {
      type: "text",
      value: node.content
    };
  }

  if (node.type === NodeTypes.INTERPOLATION) {
    return {
      type: "interpolation",
      expression: registerTemplateExpression(expressionContent(node.content), state.templateRefBindings, state.file, node, state),
      bindingId: nextBindingId(state)
    };
  }

  if (node.type !== NodeTypes.ELEMENT) {
    return null;
  }

  // Find v-for to track locals for children
  const forProp = node.props.find((prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === "for") as DirectiveNode | undefined;
  let addedLocals = 0;
  if (forProp) {
    const expression = expressionContent(forProp.exp);
    if (expression) {
      const parsedFor = parseForExpression(expression, state.file, forProp, state);
      state.activeLocals.push(parsedFor.value);
      state.allLocals.add(parsedFor.value);
      addedLocals++;
      if (parsedFor.index) {
        state.activeLocals.push(parsedFor.index);
        state.allLocals.add(parsedFor.index);
        addedLocals++;
      }
    }
  }

  // Find slot props to track locals for children
  const slotProp = node.props.find((prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === "slot") as DirectiveNode | undefined;
  if (slotProp) {
    const expression = expressionContent(slotProp.exp);
    if (expression) {
      const slotLocals = parseBindingNames(expression);
      for (const local of slotLocals) {
        state.activeLocals.push(local);
        state.allLocals.add(local);
        addedLocals++;
      }
    }
  }

  const attrs: TemplateAttribute[] = [];
  const events: TemplateEvent[] = [];
  const element: ElementTemplateNode = {
    type: "element",
    tag: node.tag,
    attrs,
    events,
    children: compileTemplateChildren(node.children, state)
  };

  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      attrs.push({
        kind: "static",
        name: prop.name,
        value: prop.value?.content ?? ""
      });
      continue;
    }

    if (prop.type !== NodeTypes.DIRECTIVE) {
      continue;
    }

    if (prop.name === "bind") {
      const arg = expressionContent(prop.arg);
      const expression = expressionContent(prop.exp);
      if (!arg || !expression) {
        throw new ResuxCompileError("Dynamic bindings need an argument and expression.", locationFromVueNode(state.file, prop));
      }
      attrs.push({
        kind: "dynamic",
        name: arg,
        value: registerTemplateExpression(expression, state.templateRefBindings, state.file, prop, state),
        bindingId: nextBindingId(state)
      });
      continue;
    }

    if (prop.name === "on") {
      const arg = expressionContent(prop.arg);
      const expression = expressionContent(prop.exp);
      const modifiers = normalizeEventModifiers(prop.modifiers ?? [], state.file, prop);
      if (!arg || !expression) {
        throw new ResuxCompileError("Events need an argument and expression.", locationFromVueNode(state.file, prop));
      }
      const isSimpleIdentifier = /^[A-Za-z_$][\w$]*$/.test(expression);
      const handler = (isSimpleIdentifier && !state.activeLocals.includes(expression))
        ? expression
        : createInlineEventHandler(expression, state, prop);
      const event = {
        name: arg,
        handler,
        modifiers
      };
      events.push(event);
      state.handlers.push(event);
      continue;
    }

    if (prop.name === "if") {
      if (options.ifExpressionOverride) {
        continue;
      }
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-if needs an expression.", locationFromVueNode(state.file, prop));
      }
      element.if = {
        expression: registerTemplateExpression(expression, state.templateRefBindings, state.file, prop, state),
        blockId: nextBindingId(state)
      };
      continue;
    }

    if (prop.name === "else-if" || prop.name === "else") {
      if (options.ifExpressionOverride) {
        continue;
      }
      throw new ResuxCompileError(
        `v-${prop.name} must follow a sibling with v-if or v-else-if.`,
        locationFromVueNode(state.file, prop),
      );
    }

    if (prop.name === "for") {
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-for needs an expression.", locationFromVueNode(state.file, prop));
      }
      element.for = parseForExpression(expression, state.file, prop, state);
      element.for.source = registerTemplateExpression(element.for.source, state.templateRefBindings, state.file, prop, state);
      continue;
    }

    if (prop.name === "show") {
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-show needs an expression.", locationFromVueNode(state.file, prop));
      }
      attrs.push({
        kind: "dynamic",
        name: "hidden",
        value: registerRawTemplateExpression(`!(${transformTemplateExpressionCode(expression, state.templateRefBindings, state.file, prop).transformed})`, expression, transformTemplateExpressionCode(expression, state.templateRefBindings, state.file, prop).identifiers, state),
        bindingId: nextBindingId(state)
      });
      continue;
    }

    if (prop.name === "text") {
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-text needs an expression.", locationFromVueNode(state.file, prop));
      }
      element.children = [{
        type: "interpolation",
        expression: registerTemplateExpression(expression, state.templateRefBindings, state.file, prop, state),
        bindingId: nextBindingId(state)
      }];
      continue;
    }

    if (prop.name === "html") {
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-html needs an expression.", locationFromVueNode(state.file, prop));
      }
      element.html = {
        expression: registerTemplateExpression(expression, state.templateRefBindings, state.file, prop, state),
        bindingId: nextBindingId(state)
      };
      element.children = [];
      continue;
    }

    if (prop.name === "model") {
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-model needs an expression.", locationFromVueNode(state.file, prop));
      }
      if (!isAssignableExpression(expression)) {
        throw new ResuxCompileError("v-model needs an assignable expression like \"message.value\".", locationFromVueNode(state.file, prop));
      }
      const model = createModelBinding(node.tag, node.props, expression, state);
      attrs.push({
        kind: "dynamic",
        name: model.attribute,
        value: registerTemplateExpression(model.value, state.templateRefBindings, state.file, prop, state),
        bindingId: nextBindingId(state)
      });
      const event = {
        name: model.event,
        handler: model.handler,
        modifiers: []
      };
      events.push(event);
      state.handlers.push(event);
      continue;
    }

    const argSuffix = prop.arg ? `:${expressionContent(prop.arg)}` : "";
    const name = `v-${prop.name}${argSuffix}`;
    const expression = expressionContent(prop.exp);
    if (expression) {
      attrs.push({
        kind: "dynamic",
        name,
        value: registerTemplateExpression(expression, state.templateRefBindings, state.file, prop, state),
        bindingId: nextBindingId(state)
      });
    } else {
      attrs.push({
        kind: "static",
        name,
        value: ""
      });
    }
    continue;
  }

  if (options.ifExpressionOverride) {
    element.if = {
      expression: registerRawTemplateExpression(options.ifExpressionOverride, options.ifExpressionOverride, [], state),
      blockId: nextBindingId(state),
    };
  }

  if (addedLocals > 0) {
    state.activeLocals.splice(state.activeLocals.length - addedLocals, addedLocals);
  }

  return element;
}

function createInlineEventHandler(expression: string, state: CompileTemplateState, node?: VueCompilerNode): string {
  const name = nextInlineHandlerName(state);
  const transformed = transformTemplateExpressionCode(expression, state.templateRefBindings, state.file, node ?? ({} as any)).transformed;
  state.inlineHandlers.push({
    name,
    source: `function ${name}($event) {\n${transformed}\n}`,
    locals: [...state.activeLocals]
  });
  return name;
}

function createModelBinding(
  tag: string,
  props: Array<AttributeNode | DirectiveNode>,
  expression: string,
  state: CompileTemplateState
): { attribute: string; value: string; event: string; handler: string } {
  const normalizedTag = tag.toLowerCase();
  const inputType = normalizedTag === "input" ? staticAttributeValue(props, "type")?.toLowerCase() : undefined;
  const isCheckbox = inputType === "checkbox";
  const handler = nextInlineHandlerName(state);
  const target = "$event.target";
  const assignmentExpression = state.templateRefBindings.has(expression.trim()) ? `${expression.trim()}.value` : expression;
  const assignment = isCheckbox
    ? `${assignmentExpression} = Boolean(${target} && ${target}.checked)`
    : `${assignmentExpression} = ${target} ? ${target}.value : ""`;

  state.inlineHandlers.push({
    name: handler,
    source: `function ${handler}($event) {\n${assignment}\n}`,
    locals: [...state.activeLocals]
  });

  return {
    attribute: isCheckbox ? "checked" : "value",
    value: expression,
    event: isCheckbox || normalizedTag === "select" ? "change" : "input",
    handler
  };
}

function staticAttributeValue(props: Array<AttributeNode | DirectiveNode>, name: string): string | undefined {
  const attr = props.find((prop): prop is AttributeNode => prop.type === NodeTypes.ATTRIBUTE && prop.name === name);
  return attr?.value?.content;
}

function registerTemplateExpression(
  expression: string,
  templateRefBindings: Set<string>,
  file: string,
  node: VueCompilerNode,
  state: CompileTemplateState
): string {
  const result = transformTemplateExpressionCode(expression, templateRefBindings, file, node);
  return registerRawTemplateExpression(result.transformed, expression, result.identifiers, state);
}

function registerRawTemplateExpression(
  transformed: string,
  original: string,
  identifiers: string[],
  state: CompileTemplateState
): string {
  const id = `__rx_expr_${state.expressions.length}`;
  state.expressions.push({
    id,
    original,
    transformed,
    locals: identifiers // repurposing locals to store the free identifiers needed for the closure
  });
  return id;
}

function transformTemplateExpressionCode(
  expression: string,
  templateRefBindings: Set<string>,
  file: string,
  node: VueCompilerNode
): { transformed: string; identifiers: string[] } {
  if (expression.trim() === "") {
    return { transformed: expression, identifiers: [] };
  }

  const wrapped = `(${expression})`;
  const sourceFile = ts.createSourceFile(`${file}?template-expression`, wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (((sourceFile as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics ?? []).length > 0) {
    throw new ResuxCompileError("Template expression is not valid JavaScript.", locationFromVueNode(file, node));
  }

  const insertions: number[] = [];
  const identifiers = new Set<string>();

  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current)) {
      if (shouldAutoUnwrapTemplateIdentifier(current)) {
        if (templateRefBindings.has(current.text)) {
          const position = current.end - 1;
          if (position >= 0 && position <= expression.length) {
            insertions.push(position);
          }
        }
      }

      let isPropertyName = false;
      const parent = current.parent;
      if (parent) {
        if (ts.isPropertyAccessExpression(parent) && parent.name === current) {
          isPropertyName = true;
        }
        if (ts.isPropertyAssignment(parent) && parent.name === current) {
          isPropertyName = true;
        }
      }

      if (!isPropertyName && !["undefined", "NaN", "Infinity", "arguments", "this"].includes(current.text)) {
        identifiers.add(current.text);
      }
    }

    ts.forEachChild(current, visit);
  };

  visit(sourceFile);
  
  let transformed = expression;
  if (insertions.length > 0) {
    const uniqueInsertions = [...new Set(insertions)].sort((a, b) => b - a);
    for (const position of uniqueInsertions) {
      transformed = `${transformed.slice(0, position)}.value${transformed.slice(position)}`;
    }
  }
  
  return { transformed, identifiers: [...identifiers] };
}

function shouldAutoUnwrapTemplateIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return true;
  }

  if (ts.isPropertyAccessExpression(parent)) {
    if (parent.expression === node && parent.name.text === "value") {
      return false;
    }
    return parent.name !== node;
  }

  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }

  if (ts.isShorthandPropertyAssignment(parent) || ts.isBindingElement(parent)) {
    return false;
  }

  return true;
}

function isAssignableExpression(expression: string): boolean {
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*$/.test(expression.trim());
}

function normalizeEventModifiers(modifiers: SimpleExpressionNode[], file: string, node: VueCompilerNode): string[] {
  const modifierNames = modifiers.map((modifier) => String(modifier.content));
  const supported = new Set([
    "prevent",
    "stop",
    "self",
    "once",
    "capture",
    "passive",
    "ctrl",
    "shift",
    "alt",
    "meta",
    "exact",
    "left",
    "middle",
    "right",
    "enter",
    "tab",
    "delete",
    "esc",
    "escape",
    "space",
    "up",
    "down",
    "left",
    "right"
  ]);
  const unsupported = modifierNames.find((modifier) => !supported.has(modifier));

  if (unsupported) {
    throw new ResuxCompileError(
      `Event modifier ".${unsupported}" is not supported in the resumability runtime yet.`,
      locationFromVueNode(file, node)
    );
  }

  return modifierNames;
}

function parseForExpression(expression: string, file: string, node: VueCompilerNode, state: CompileTemplateState) {
  const match = /^\s*(?:\(([^)]+)\)|([A-Za-z_$][\w$]*))\s+(?:in|of)\s+(.+)\s*$/.exec(expression);
  if (!match) {
    throw new ResuxCompileError("v-for must look like \"item in items\" or \"(item, index) in items\".", locationFromVueNode(file, node));
  }
  const aliases = (match[1] ?? match[2]).split(",").map((part) => part.trim()).filter(Boolean);
  if (!aliases[0] || aliases.length > 2) {
    throw new ResuxCompileError("v-for supports only value and optional index aliases.", locationFromVueNode(file, node));
  }
  return {
    value: aliases[0],
    index: aliases[1],
    source: match[3],
    blockId: nextBindingId(state)
  };
}

function parseBindingNames(expression: string): string[] {
  const source = `const ${expression} = null;`;
  const sf = ts.createSourceFile("temp.ts", source, ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  if (sf.statements.length > 0) {
    const stmt = sf.statements[0];
    if (ts.isVariableStatement(stmt)) {
      const decl = stmt.declarationList.declarations[0];
      if (decl) {
        names.push(...collectBindingNames(decl.name));
      }
    }
  }
  return names;
}

function rewriteImportStatementText(
  statement: ts.ImportDeclaration | ts.ImportEqualsDeclaration,
  sourceFile: ts.SourceFile,
  file: string
): string {
  if (ts.isImportDeclaration(statement)) {
    const specifier = statement.moduleSpecifier;
    if (ts.isStringLiteral(specifier)) {
      const importPath = specifier.text;
      if (importPath.startsWith(".")) {
        const absoluteImported = path.resolve(path.dirname(file), importPath);
        const resolvedPath = resolveFileExtension(absoluteImported);
        const normalized = fileUrl(resolvedPath);
        const fullText = statement.getFullText(sourceFile);
        const start = specifier.getStart(sourceFile) - statement.getFullStart();
        const end = specifier.getEnd() - statement.getFullStart();
        return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
      }
    }
  } else if (ts.isImportEqualsDeclaration(statement)) {
    const moduleRef = statement.moduleReference;
    if (ts.isExternalModuleReference(moduleRef) && ts.isStringLiteral(moduleRef.expression)) {
      const specifier = moduleRef.expression;
      const importPath = specifier.text;
      if (importPath.startsWith(".")) {
        const absoluteImported = path.resolve(path.dirname(file), importPath);
        const resolvedPath = resolveFileExtension(absoluteImported);
        const normalized = fileUrl(resolvedPath);
        const fullText = statement.getFullText(sourceFile);
        const start = specifier.getStart(sourceFile) - statement.getFullStart();
        const end = specifier.getEnd() - statement.getFullStart();
        return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
      }
    }
  }
  return statement.getFullText(sourceFile);
}

function findProjectRoot(startFile: string): string {
  let dir = path.dirname(startFile);
  while (true) {
    if (existsSync(path.join(dir, "resux.config.ts")) || 
        existsSync(path.join(dir, "package.json")) ||
        existsSync(path.join(dir, "nuxt.config.ts"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return path.dirname(startFile);
}

const IMAGE_VIDEO_FONT_EXTENSIONS = new Set([
  ".webp", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".ico", ".webm", ".mp4",
  ".wav", ".mp3", ".ogg", ".woff", ".woff2", ".ttf", ".eot"
]);

const STYLESHEET_EXTENSIONS = new Set([
  ".css", ".scss", ".sass", ".less", ".styl", ".stylus"
]);

function ensureCompiledUserModule(
  resolvedFile: string,
  projectRoot: string,
  outDir: string,
  compiledSet = new Set<string>()
): string {
  const relativePath = path.relative(projectRoot, resolvedFile);
  const targetJsFile = path.join(outDir, "server", "imported", relativePath.replace(/\.[ct]sx?$/, ".mjs"));

  if (compiledSet.has(resolvedFile)) {
    return targetJsFile;
  }
  compiledSet.add(resolvedFile);

  let sourceText = "";
  try {
    sourceText = ts.sys.readFile(resolvedFile) ?? "";
  } catch {
    return resolvedFile;
  }

  const sourceFile = ts.createSourceFile(resolvedFile, sourceText, ts.ScriptTarget.ES2022, true);
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier;
      const importPath = specifier.text;
      if (importPath.startsWith(".") || importPath.startsWith("@/") || importPath.startsWith("~/")) {
        let resolvedImported = "";
        if (importPath.startsWith(".")) {
          resolvedImported = path.resolve(path.dirname(resolvedFile), importPath);
        } else {
          resolvedImported = path.resolve(projectRoot, importPath.slice(2));
        }
        resolvedImported = resolveFileExtension(resolvedImported);
        const ext = path.extname(resolvedImported).toLowerCase();
        if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
          const compiledTarget = ensureCompiledUserModule(resolvedImported, projectRoot, outDir, compiledSet);
          const relativeToCompiled = path.relative(path.dirname(targetJsFile), compiledTarget);
          const relativeImportPath = relativeToCompiled.startsWith(".")
            ? relativeToCompiled.replace(/\\/g, "/")
            : "./" + relativeToCompiled.replace(/\\/g, "/");
          replacements.push({
            start: specifier.getStart(sourceFile),
            end: specifier.getEnd(),
            replacement: JSON.stringify(relativeImportPath)
          });
        }
      }
    }
  }

  replacements.sort((a, b) => b.start - a.start);
  let rewrittenSource = sourceText;
  for (const r of replacements) {
    rewrittenSource = rewrittenSource.slice(0, r.start) + r.replacement + rewrittenSource.slice(r.end);
  }

  const transpiled = ts.transpileModule(rewrittenSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  }).outputText;

  const targetDir = path.dirname(targetJsFile);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  writeFileSync(targetJsFile, transpiled, "utf8");

  return targetJsFile;
}

function processImportDeclaration(
  statement: ts.ImportDeclaration | ts.ImportEqualsDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  client: boolean
): string {
  if (ts.isImportDeclaration(statement)) {
    const specifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(specifier)) {
      return statement.getFullText(sourceFile);
    }
    const importPath = specifier.text;
    const isRelative = importPath.startsWith(".");
    const isAlias = importPath.startsWith("@/") || importPath.startsWith("~/");
    const ext = path.extname(importPath).toLowerCase();

    if (IMAGE_VIDEO_FONT_EXTENSIONS.has(ext) || STYLESHEET_EXTENSIONS.has(ext)) {
      if (client) {
        if (isRelative) {
          const absoluteImported = path.resolve(path.dirname(file), importPath);
          const normalized = fileUrl(absoluteImported);
          const fullText = statement.getFullText(sourceFile);
          const start = specifier.getStart(sourceFile) - statement.getFullStart();
          const end = specifier.getEnd() - statement.getFullStart();
          return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
        }
        if (isAlias) {
          const projectRoot = findProjectRoot(file);
          const absoluteImported = path.resolve(projectRoot, importPath.slice(2));
          const normalized = fileUrl(absoluteImported);
          const fullText = statement.getFullText(sourceFile);
          const start = specifier.getStart(sourceFile) - statement.getFullStart();
          const end = specifier.getEnd() - statement.getFullStart();
          return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
        }
        return statement.getFullText(sourceFile);
      } else {
        if (STYLESHEET_EXTENSIONS.has(ext)) {
          return "";
        }
        const projectRoot = findProjectRoot(file);
        let absolutePath = "";
        if (isAlias) {
          absolutePath = path.resolve(projectRoot, importPath.slice(2));
        } else if (isRelative) {
          absolutePath = path.resolve(path.dirname(file), importPath);
        } else {
          absolutePath = importPath;
        }

        let webPath = importPath;
        const relativeToRoot = path.relative(projectRoot, absolutePath);
        const isInsideProject = relativeToRoot === ""
          || (relativeToRoot !== ".."
            && !relativeToRoot.startsWith(`..${path.sep}`)
            && !path.isAbsolute(relativeToRoot));
        if (isInsideProject) {
          webPath = "/" + relativeToRoot.replace(/\\/g, "/");
        }

        const clause = statement.importClause;
        if (!clause) {
          return "";
        }

        const bindings: string[] = [];
        if (clause.name) {
          bindings.push(clause.name.text);
        }
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            bindings.push(clause.namedBindings.name.text);
          } else {
            for (const element of clause.namedBindings.elements) {
              bindings.push(element.name.text);
            }
          }
        }

        if (bindings.length === 0) {
          return "";
        }

        return bindings.map(name => `const ${name} = ${JSON.stringify(webPath)};`).join("\n");
      }
    }

    if (isRelative) {
      const absoluteImported = path.resolve(path.dirname(file), importPath);
      const resolvedPath = resolveFileExtension(absoluteImported);
      const resolvedExt = path.extname(resolvedPath).toLowerCase();
      
      let normalized = "";
      if (!client && (resolvedExt === ".ts" || resolvedExt === ".tsx" || resolvedExt === ".js" || resolvedExt === ".jsx")) {
        const projectRoot = findProjectRoot(file);
        const outDir = path.join(projectRoot, ".resux");
        const compiledTarget = ensureCompiledUserModule(resolvedPath, projectRoot, outDir);
        normalized = fileUrl(compiledTarget);
      } else {
        normalized = fileUrl(resolvedPath);
      }
      
      const fullText = statement.getFullText(sourceFile);
      const start = specifier.getStart(sourceFile) - statement.getFullStart();
      const end = specifier.getEnd() - statement.getFullStart();
      return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
    }

    if (!client && isAlias) {
      const projectRoot = findProjectRoot(file);
      const absoluteImported = path.resolve(projectRoot, importPath.slice(2));
      const resolvedPath = resolveFileExtension(absoluteImported);
      const resolvedExt = path.extname(resolvedPath).toLowerCase();
      
      let normalized = "";
      if (resolvedExt === ".ts" || resolvedExt === ".tsx" || resolvedExt === ".js" || resolvedExt === ".jsx") {
        const outDir = path.join(projectRoot, ".resux");
        const compiledTarget = ensureCompiledUserModule(resolvedPath, projectRoot, outDir);
        normalized = fileUrl(compiledTarget);
      } else {
        normalized = fileUrl(resolvedPath);
      }
      
      const fullText = statement.getFullText(sourceFile);
      const start = specifier.getStart(sourceFile) - statement.getFullStart();
      const end = specifier.getEnd() - statement.getFullStart();
      return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
    }
  } else if (ts.isImportEqualsDeclaration(statement)) {
    const moduleRef = statement.moduleReference;
    if (ts.isExternalModuleReference(moduleRef) && ts.isStringLiteral(moduleRef.expression)) {
      const specifier = moduleRef.expression;
      const importPath = specifier.text;
      const isRelative = importPath.startsWith(".");
      const isAlias = importPath.startsWith("@/") || importPath.startsWith("~/");
      const ext = path.extname(importPath).toLowerCase();

      if (IMAGE_VIDEO_FONT_EXTENSIONS.has(ext) || STYLESHEET_EXTENSIONS.has(ext)) {
        if (client) {
          if (isRelative) {
            const absoluteImported = path.resolve(path.dirname(file), importPath);
            const normalized = fileUrl(absoluteImported);
            const fullText = statement.getFullText(sourceFile);
            const start = specifier.getStart(sourceFile) - statement.getFullStart();
            const end = specifier.getEnd() - statement.getFullStart();
            return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
          }
          if (isAlias) {
            const projectRoot = findProjectRoot(file);
            const absoluteImported = path.resolve(projectRoot, importPath.slice(2));
            const normalized = fileUrl(absoluteImported);
            const fullText = statement.getFullText(sourceFile);
            const start = specifier.getStart(sourceFile) - statement.getFullStart();
            const end = specifier.getEnd() - statement.getFullStart();
            return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
          }
          return statement.getFullText(sourceFile);
        } else {
          if (STYLESHEET_EXTENSIONS.has(ext)) {
            return "";
          }
          const projectRoot = findProjectRoot(file);
          let absolutePath = "";
          if (isAlias) {
            absolutePath = path.resolve(projectRoot, importPath.slice(2));
          } else if (isRelative) {
            absolutePath = path.resolve(path.dirname(file), importPath);
          } else {
            absolutePath = importPath;
          }

          let webPath = importPath;
          const relativeToRoot = path.relative(projectRoot, absolutePath);
          const isInsideProject = relativeToRoot === ""
            || (relativeToRoot !== ".."
              && !relativeToRoot.startsWith(`..${path.sep}`)
              && !path.isAbsolute(relativeToRoot));
          if (isInsideProject) {
            webPath = "/" + relativeToRoot.replace(/\\/g, "/");
          }

          if (!statement.name) {
            return "";
          }
          return `const ${statement.name.text} = ${JSON.stringify(webPath)};`;
        }
      }

      if (isRelative) {
        const absoluteImported = path.resolve(path.dirname(file), importPath);
        const resolvedPath = resolveFileExtension(absoluteImported);
        const resolvedExt = path.extname(resolvedPath).toLowerCase();
        
        let normalized = "";
        if (!client && (resolvedExt === ".ts" || resolvedExt === ".tsx" || resolvedExt === ".js" || resolvedExt === ".jsx")) {
          const projectRoot = findProjectRoot(file);
          const outDir = path.join(projectRoot, ".resux");
          const compiledTarget = ensureCompiledUserModule(resolvedPath, projectRoot, outDir);
          normalized = fileUrl(compiledTarget);
        } else {
          normalized = fileUrl(resolvedPath);
        }
        
        const fullText = statement.getFullText(sourceFile);
        const start = specifier.getStart(sourceFile) - statement.getFullStart();
        const end = specifier.getEnd() - statement.getFullStart();
        return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
      }

      if (!client && isAlias) {
        const projectRoot = findProjectRoot(file);
        const absoluteImported = path.resolve(projectRoot, importPath.slice(2));
        const resolvedPath = resolveFileExtension(absoluteImported);
        const resolvedExt = path.extname(resolvedPath).toLowerCase();
        
        let normalized = "";
        if (resolvedExt === ".ts" || resolvedExt === ".tsx" || resolvedExt === ".js" || resolvedExt === ".jsx") {
          const outDir = path.join(projectRoot, ".resux");
          const compiledTarget = ensureCompiledUserModule(resolvedPath, projectRoot, outDir);
          normalized = fileUrl(compiledTarget);
        } else {
          normalized = fileUrl(resolvedPath);
        }
        
        const fullText = statement.getFullText(sourceFile);
        const start = specifier.getStart(sourceFile) - statement.getFullStart();
        const end = specifier.getEnd() - statement.getFullStart();
        return fullText.slice(0, start) + JSON.stringify(normalized) + fullText.slice(end);
      }
    }
  }
  return statement.getFullText(sourceFile);
}

function analyzeScript(script: string, file: string, inlineHandlers: GeneratedHandler[] = []): ScriptAnalysis {
  const sourceFile = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: string[] = [];
  const importDeclarations: (ts.ImportDeclaration | ts.ImportEqualsDeclaration)[] = [];
  const body: string[] = [];
  const bindings = new Set<string>();
  const handlerNames = new Set<string>();
  const resumableBindings = new Set<string>();
  const importedBindings = new Set<string>();
  const inlineHandlerLocals = new Map<string, string[]>();
  const templateRefBindings = inferTemplateRefBindings(script, file);
  const handlers = new Map<string, ts.Node>();
  let pageMeta: PageMeta | undefined;

  for (const h of inlineHandlers) {
    if (h.locals) {
      inlineHandlerLocals.set(h.name, h.locals);
    }
  }

  for (const statement of sourceFile.statements) {
    const text = statement.getFullText(sourceFile);
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
      imports.push(rewriteImportStatementText(statement, sourceFile, file));
      importDeclarations.push(statement);
      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        if (clause) {
          if (clause.name) {
            bindings.add(clause.name.text);
            importedBindings.add(clause.name.text);
          }
          if (clause.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) {
              bindings.add(clause.namedBindings.name.text);
              importedBindings.add(clause.namedBindings.name.text);
            } else {
              for (const element of clause.namedBindings.elements) {
                bindings.add(element.name.text);
                importedBindings.add(element.name.text);
              }
            }
          }
        }
      } else if (ts.isImportEqualsDeclaration(statement) && statement.name) {
        bindings.add(statement.name.text);
        importedBindings.add(statement.name.text);
      }
      continue;
    }

    if (isDefinePageMetaStatement(statement)) {
      pageMeta = readPageMeta(statement, sourceFile, file);
      continue;
    }

    body.push(text);

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      bindings.add(statement.name.text);
      handlerNames.add(statement.name.text);
      handlers.set(statement.name.text, statement);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of collectBindingNames(declaration.name)) {
          bindings.add(name);
        }

        if (ts.isIdentifier(declaration.name)) {
          if (isHandlerLikeInitializer(declaration.initializer)) {
            handlerNames.add(declaration.name.text);
            handlers.set(declaration.name.text, declaration);
          }
        }
        if (isResumableInitializer(declaration.initializer)) {
          for (const name of collectBindingNames(declaration.name)) {
            resumableBindings.add(name);
          }
        }
      }
    }
  }

  if (inlineHandlers.length > 0) {
    const inlineSource = inlineHandlers.map((handler) => handler.source).join("\n");
    const inlineSourceFile = ts.createSourceFile(`${file}?inline-handlers`, inlineSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    body.push(inlineSource);

    for (const statement of inlineSourceFile.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        bindings.add(statement.name.text);
        handlerNames.add(statement.name.text);
        handlers.set(statement.name.text, statement);
      }
    }
  }

  return {
    imports: imports.join("\n"),
    importDeclarations,
    setupBody: body.join("\n"),
    bindings: [...bindings],
    handlerNames,
    resumableBindings,
    importedBindings,
    inlineHandlerLocals,
    templateRefBindings,
    handlers,
    sourceFile,
    pageMeta
  };
}

function inferTemplateRefBindings(script: string, file: string): Set<string> {
  const sourceFile = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bindings = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      const initializer = unwrapAwaitExpression(declaration.initializer);
      if (!initializer || !ts.isCallExpression(initializer)) {
        continue;
      }

      const callee = initializer.expression;
      const calleeName = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)
          ? callee.name.text
          : "";

      if (ts.isIdentifier(declaration.name) && isTemplateRefFactory(calleeName)) {
        bindings.add(declaration.name.text);
        continue;
      }

      if (ts.isObjectBindingPattern(declaration.name) && isObjectTemplateRefFactory(calleeName)) {
        for (const element of declaration.name.elements) {
          if (!ts.isBindingElement(element) || !ts.isIdentifier(element.name)) {
            continue;
          }
          const propertyName = element.propertyName && ts.isIdentifier(element.propertyName)
            ? element.propertyName.text
            : element.name.text;
          if (calleeName === "toRefs" || ["data", "pending", "error", "value"].includes(propertyName)) {
            bindings.add(element.name.text);
          }
        }
      }
    }
  }

  return bindings;
}

function unwrapAwaitExpression(node: ts.Expression | undefined): ts.Expression | undefined {
  return node && ts.isAwaitExpression(node) ? node.expression : node;
}

function isTemplateRefFactory(name: string): boolean {
    return ["ref", "computed", "toRef", "useState", "useAsyncData", "useFetch", "useResuxImage", "useError"].includes(name);
}

function isAsyncDataFactory(name: string): boolean {
  return ["useAsyncData", "useFetch"].includes(name);
}

function isObjectTemplateRefFactory(name: string): boolean {
  return isAsyncDataFactory(name) || name === "toRefs";
}

function isDefinePageMetaStatement(statement: ts.Statement): boolean {
  return ts.isExpressionStatement(statement)
    && ts.isCallExpression(statement.expression)
    && ts.isIdentifier(statement.expression.expression)
    && statement.expression.expression.text === "definePageMeta";
}

function readPageMeta(statement: ts.Statement, sourceFile: ts.SourceFile, file: string): PageMeta {
  if (!isDefinePageMetaStatement(statement)) {
    return {};
  }

  const call = (statement as ts.ExpressionStatement).expression as ts.CallExpression;
  const firstArg = call.arguments[0];
  if (!firstArg || !ts.isObjectLiteralExpression(firstArg)) {
    throw new ResuxCompileError("definePageMeta only supports an object literal in Resux.", locationFromTsNode(file, sourceFile, statement));
  }

  return readObjectLiteral(firstArg, sourceFile, file) as PageMeta;
}

function readObjectLiteral(node: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile, file: string): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new ResuxCompileError("Only plain object properties are supported here.", locationFromTsNode(file, sourceFile, property));
    }

    const name = readPropertyName(property.name, sourceFile, file);
    output[name] = readLiteralValue(property.initializer, sourceFile, file);
  }

  return output;
}

function readLiteralValue(node: ts.Expression, sourceFile: ts.SourceFile, file: string): unknown {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => readLiteralValue(element as ts.Expression, sourceFile, file));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return readObjectLiteral(node, sourceFile, file);
  }

  throw new ResuxCompileError("Only JSON-like literals are supported here.", locationFromTsNode(file, sourceFile, node));
}

function readPropertyName(name: ts.PropertyName, sourceFile: ts.SourceFile, file: string): string {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  throw new ResuxCompileError("Only simple property names are supported here.", locationFromTsNode(file, sourceFile, name));
}

function validateTemplateHandlers(events: TemplateEvent[], analysis: ScriptAnalysis, file: string, fullSource: string, templateLocals: string[] = []): void {
  const allowedHandlers = new Set([...analysis.handlerNames, ...templateLocals]);
  for (const event of events) {
    if (!allowedHandlers.has(event.handler)) {
      throw new ResuxCompileError(`Handler "${event.handler}" must be a top-level function or arrow function.`, locationFromOffset(file, fullSource, 0));
    }

    const handlerNode = analysis.handlers.get(event.handler);
    if (!handlerNode) {
      continue;
    }

    const locals = analysis.inlineHandlerLocals.get(event.handler) ?? [];
    const unsupportedCapture = findUnsupportedCapture(handlerNode, event.handler, analysis, locals);
    if (unsupportedCapture) {
      throw new ResuxCompileError(
        `Handler "${event.handler}" captures "${unsupportedCapture}", which is not resumable in Resux.`,
        locationFromTsNode(file, analysis.sourceFile, handlerNode)
      );
    }
  }
}

function findUnsupportedCapture(
  node: ts.Node,
  handlerName: string,
  analysis: ScriptAnalysis,
  templateLocals: string[] = []
): string | null {
  const locals = new Set<string>([handlerName, "event", ...templateLocals]);
  const allowedTopLevel = new Set([
    ...analysis.resumableBindings,
    ...analysis.handlerNames,
    ...analysis.importedBindings
  ]);

  function registerPattern(name: ts.BindingName): void {
    for (const binding of collectBindingNames(name)) {
      locals.add(binding);
    }
  }

  if (ts.isFunctionDeclaration(node)) {
    for (const parameter of node.parameters) {
      registerPattern(parameter.name);
    }
  }

  if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    for (const parameter of node.initializer.parameters) {
      registerPattern(parameter.name);
    }
  }

  let unsupported: string | null = null;

  function visit(current: ts.Node): void {
    if (unsupported) {
      return;
    }

    if (ts.isVariableDeclaration(current)) {
      registerPattern(current.name);
    }

    if (ts.isIdentifier(current) && isValueIdentifier(current)) {
      const name = current.text;
      if (!locals.has(name) && !RESUMABLE_HANDLER_ALLOWED_GLOBALS.has(name) && !allowedTopLevel.has(name)) {
        unsupported = name;
        return;
      }
    }

    ts.forEachChild(current, visit);
  }

  ts.forEachChild(node, visit);
  return unsupported;
}

function isValueIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return true;
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }
  if ((ts.isVariableDeclaration(parent) || ts.isFunctionDeclaration(parent) || ts.isParameter(parent)) && parent.name === node) {
    return false;
  }
  if (ts.isBindingElement(parent) && parent.name === node) {
    return false;
  }
  return true;
}

function isHandlerLikeInitializer(node: ts.Expression | undefined): boolean {
  return Boolean(node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node)));
}

function isResumableInitializer(node: ts.Expression | undefined): boolean {
  if (!node) {
    return false;
  }
  if (ts.isNumericLiteral(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    return true;
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    if (node.expression.text.startsWith("use")) {
      return true;
    }
    return [
      "ref",
      "reactive",
      "computed",
      "readonly",
      "toRef",
      "toRefs",
      "watch",
      "watchEffect",
      "useState",
      "useAsyncData",
      "useRoute",
      "useRouter",
      "useRuntimeConfig",
      "useResuxApp",
      "useResuxImage",
      "usePackageReady",
      "defineProps",
      "defineEmits"
    ].includes(node.expression.text);
  }
  if (ts.isAwaitExpression(node) && ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
    if (node.expression.expression.text.startsWith("use")) {
      return true;
    }
    return ["useAsyncData", "useFetch"].includes(node.expression.expression.text);
  }
  return false;
}

function collectBindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }

  const names: string[] = [];
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) {
      names.push(...collectBindingNames(element.name));
    }
  }
  return names;
}

function createComponentModuleSource(options: {
  id: string;
  name: string;
  file: string;
  template: TemplateNode[];
  analysis: ScriptAnalysis;
  styles: ComponentStyle[];
  styleScopeId?: string;
  client: boolean;
  expressions?: { id: string; original: string; transformed: string; locals: string[] }[];
}): string {
  const importPath = options.client ? "/__resux/runtime-client.mjs" : "resuxjs/runtime";
  const factory = options.client ? "createClientComponent" : "defineComponent";
  
  const expressionClosures = (options.expressions ?? []).map((expr) => {
    const destructure = expr.locals.length > 0
      ? expr.locals.map(id => `let ${id} = (locals && "${id}" in locals) ? locals.${id} : (scope && "${id}" in scope) ? scope.${id} : (typeof globalThis !== "undefined" && "${id}" in globalThis) ? globalThis.${id} : undefined;
      if (typeof ${id} === "string" && ${id}.startsWith("__rx_callback:")) {
        const parts = ${id}.split(":");
        const cbScopeId = parts[2];
        const cbHandler = parts[3];
        ${id} = async (...args) => {
          const payload = globalThis.__RESUX__;
          if (payload && payload.scopes[cbScopeId]) {
            const comp = await importComponent(payload.scopes[cbScopeId].moduleId, payload.modules, devImportRevision);
            let sRec = scopeCache.get(cbScopeId);
            if (!sRec) {
              sRec = await comp.createScope(payload.scopes[cbScopeId], payload.route);
              scopeCache.set(cbScopeId, sRec);
            }
            const patches = await comp.run(sRec, cbHandler, args[0]);
            const serialized = comp.serialize(sRec);
            payload.scopes[cbScopeId].props = serialized.props;
            payload.scopes[cbScopeId].state = serialized.state;
            payload.scopes[cbScopeId].asyncData = serialized.asyncData;
            applyPatches(cbScopeId, patches);
          }
        };
      }`).join("\n      ")
      : "";
    return `    ${JSON.stringify(expr.id)}: function(scope, locals) {
      ${destructure}
      return (${expr.transformed});
    },`;
  }).join("\n");

  const importsText = (options.analysis.importDeclarations ?? []).map((decl) => {
    return processImportDeclaration(decl, options.analysis.sourceFile, options.file, options.client);
  }).filter(Boolean).join("\n");

  const source = [
    `import { ${factory} } from ${JSON.stringify(importPath)};`,
    importsText,
    `const __template = ${JSON.stringify(options.template, null, 2)};`,
    `async function __rx_setup(__ctx) {`,
    `const { ref, reactive, computed, watch, watchEffect, readonly, toRef, toRefs, unref, isRef, isReactive, isReadonly, nextTick, useState, useAsyncData, useRoute, useRouter, useHead, useSeoMeta, useRuntimeConfig, useResuxApp, useResuxImage, apiURL, useFetch, $fetch, useError, clearError, showError, createError, useLazyPackage, useClientPackage, usePackageReady, defineLazyPackage, defineClientOnlyPackage, definePackageAdapter, defineClientEnhancement, useClientEnhancement, onMounted, definePageMeta, defineProps, defineEmits, useLocalePath, useSwitchLocalePath, useI18n, useDevice, $device, importComponent, scopeCache, devImportRevision, applyPatches } = __ctx;`,
    options.analysis.setupBody,
    `const __rx_expressions = {`,
    expressionClosures,
    `};`,
    `return { ${options.analysis.bindings.join(", ")}, __rx_expressions };`,
    `}`,
    `export default ${factory}({`,
    `id: ${JSON.stringify(options.id)},`,
    `name: ${JSON.stringify(options.name)},`,
    `file: ${JSON.stringify(normalizePath(options.file))},`,
    `script: __rx_setup,`,
    `template: __template,`,
    `handlers: ${JSON.stringify([...options.analysis.handlerNames])},`,
    `styles: ${JSON.stringify(options.styles)},`,
    `styleScopeId: ${JSON.stringify(options.styleScopeId)},`,
    `meta: ${JSON.stringify(options.analysis.pageMeta ?? {})}`,
    `});`
  ].join("\n");

  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  }).outputText;
}

function createVueIslandClientSource(island: VueIslandRecord, entryDir: string): string {
  const componentImport = relativeImportPath(entryDir, island.file);
  return [
    `import { createApp } from "vue";`,
    `import Component from ${JSON.stringify(componentImport)};`,
    `export function mount(el, props = {}) {`,
    `  const app = createApp(Component, props);`,
    `  app.mount(el);`,
    `  return app;`,
    `}`,
    `export default { mount };`
  ].join("\n");
}

function relativeImportPath(fromDir: string, file: string): string {
  const relative = normalizePath(path.relative(fromDir, file));
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function createServerManifestSource(
  routes: RouteManifestRecord[],
  components: CompiledComponent[],
  layouts: CompiledComponent[],
  plugins: CompiledPlugin[],
  middleware: CompiledMiddleware[],
  serverMiddleware: CompiledServerMiddleware[],
  serverHandlers: ServerHandlerRecord[],
  vueIslands: VueIslandRecord[],
  app?: CompiledComponent,
  error?: CompiledComponent,
  runtimeConfig: Record<string, unknown> = {},
  buildOptions: BuildOptions = {}
): string {
  const importSuffix = buildOptions.vite === "dev" ? `?t=${Date.now()}` : "";
  const serverPlugins = plugins.filter((entry) => entry.mode !== "client");
  const clientPlugins = plugins.filter((entry) => entry.mode !== "server");
  const serverRouteMiddleware = middleware.filter((entry) => entry.mode !== "client");
  const clientRouteMiddleware = middleware.filter((entry) => entry.mode !== "server");
  const imports = components.map((component) => `import ${component.id} from "./${component.id}.mjs${importSuffix}";`).join("\n");
  const pluginImports = serverPlugins.map((plugin) => `import ${plugin.id} from "./resux-plugins/${plugin.id}.mjs${importSuffix}";`).join("\n");
  const middlewareImports = serverRouteMiddleware.map((entry) => `import ${entry.id} from "./resux-middleware/${entry.id}.mjs${importSuffix}";`).join("\n");
  const serverMiddlewareImports = serverMiddleware.map((entry) => `import ${entry.id} from "./request-middleware/${entry.id}.mjs${importSuffix}";`).join("\n");
  const handlerImports = serverHandlers.map((handler) => `import ${handler.id} from "./handlers/${handler.id}.mjs${importSuffix}";`).join("\n");
  const componentEntries = components.map((component) => `${JSON.stringify(component.name)}: ${component.id}`).join(",\n");
  const layoutEntries = layouts.map((layout) => `${JSON.stringify(layoutNameFromFile(layout.file))}: ${layout.id}`).join(",\n");
  const moduleEntries = components
    .map((component) => `${JSON.stringify(component.id)}: ${JSON.stringify(`/__resux/handlers/${component.id}.mjs`)}`)
    .join(",\n");
  const vueIslandEntries = vueIslands
    .map((island) => `${JSON.stringify(island.name)}: ${JSON.stringify(`/__resux/vue-islands/${island.name}.mjs`)}`)
    .join(",\n");
  const pluginEntries = serverPlugins
    .map((plugin) => plugin.id)
    .join(",\n");
  const clientPluginEntries = clientPlugins
    .map((plugin) => `{
      id: ${JSON.stringify(plugin.id)},
      file: ${JSON.stringify(normalizePath(plugin.file))},
      mode: ${JSON.stringify(plugin.mode)},
      src: ${JSON.stringify(`/__resux/plugins/${plugin.id}.mjs`)}
    }`)
    .join(",\n");
  const middlewareEntries = serverRouteMiddleware
    .map((entry) => `{
      id: ${JSON.stringify(entry.id)},
      name: ${JSON.stringify(entry.name)},
      file: ${JSON.stringify(normalizePath(entry.file))},
      global: ${JSON.stringify(entry.global)},
      mode: ${JSON.stringify(entry.mode)},
      handler: ${entry.id}
    }`)
    .join(",\n");
  const clientMiddlewareEntries = clientRouteMiddleware
    .map((entry) => `{
      id: ${JSON.stringify(entry.id)},
      name: ${JSON.stringify(entry.name)},
      file: ${JSON.stringify(normalizePath(entry.file))},
      global: ${JSON.stringify(entry.global)},
      mode: ${JSON.stringify(entry.mode)},
      src: ${JSON.stringify(`/__resux/middleware/${entry.id}.mjs`)}
    }`)
    .join(",\n");
  const serverMiddlewareEntries = serverMiddleware
    .map((entry) => `{
      id: ${JSON.stringify(entry.id)},
      file: ${JSON.stringify(normalizePath(entry.file))},
      handler: ${entry.id}
    }`)
    .join(",\n");
  const serverHandlerEntries = serverHandlers
    .map((handler) => `{
      id: ${JSON.stringify(handler.id)},
      path: ${JSON.stringify(handler.path)},
      file: ${JSON.stringify(normalizePath(handler.file))},
      params: ${JSON.stringify(handler.params)},
      handler: ${handler.id},
      match: createMatcher(${JSON.stringify(handler.path)})
    }`)
    .join(",\n");
  const routeEntries = routes
    .map((route) => {
      const component = components.find((candidate) => candidate.id === route.componentId);
      if (!component) {
        throw new Error(`Missing compiled component for ${route.file}.`);
      }
      return `{
        id: ${JSON.stringify(route.id)},
        path: ${JSON.stringify(route.path)},
        file: ${JSON.stringify(normalizePath(route.file))},
        params: ${JSON.stringify(route.params)},
        meta: ${JSON.stringify(route.meta ?? {})},
        component: ${route.componentId},
        match: createMatcher(${JSON.stringify(route.path)})
      }`;
    })
    .join(",\n");
  const appHead = createAppHead(runtimeConfig);
  const appRuntimeConfig = createRuntimeConfig(runtimeConfig);
  const routeRules = createRouteRules(runtimeConfig);

  return `${imports}
${pluginImports}
${middlewareImports}
${serverMiddlewareImports}
${handlerImports}
export const app = ${app ? app.id : "undefined"};
export const errorComponent = ${error ? error.id : "undefined"};
export const components = {
${componentEntries}
};
export const layouts = {
${layoutEntries}
};
export const modules = {
${moduleEntries}
};
export const vueIslands = {
${vueIslandEntries}
};
export const resuxPlugins = [
${pluginEntries}
];
export const clientPlugins = [
${clientPluginEntries}
];
export const middleware = [
${middlewareEntries}
];
export const clientMiddleware = [
${clientMiddlewareEntries}
];
export const serverMiddleware = [
${serverMiddlewareEntries}
];
export const serverHandlers = [
${serverHandlerEntries}
];
export const runtimeConfig = ${JSON.stringify(appRuntimeConfig, null, 2)};
export const appHead = ${JSON.stringify(appHead, null, 2)};
export const routeRules = ${JSON.stringify(routeRules, null, 2)};
export const routes = [
${routeEntries}
];
export function matchRoute(pathname) {
  for (const route of routes) {
    const params = route.match(pathname);
    if (params) return { route, params };
  }
  return null;
}
export function matchServerHandler(pathname) {
  for (const route of serverHandlers) {
    const params = route.match(pathname);
    if (params) return { route, params };
  }
  return null;
}
function createMatcher(pattern) {
  const names = [];
  const source = pattern === "/" ? "^/$" : "^" + pattern.split("/").map((part) => {
    if (!part) return "";
    if (part.startsWith(":") && part.endsWith("*")) {
      names.push(part.slice(1, -1));
      return "(?:/(.*))?";
    }
    if (part.startsWith(":")) {
      names.push(part.slice(1));
      return "/([^/]+)";
    }
    return "/" + part.replace(/[.*+?^${"${"}}()|[\\]\\\\]/g, "\\\\$&");
  }).join("") + "$";
  const regex = new RegExp(source);
  return (pathname) => {
    const match = regex.exec(pathname);
    if (!match) return null;
    const params = {};
    names.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] ?? "");
    });
    return params;
  };
}
`;
}

function createAppHead(runtimeConfig: Record<string, unknown>) {
  const config = runtimeConfig as ResuxConfig;
  const head = typeof config.app === "object" && config.app && "head" in config.app
    ? config.app.head
    : {};
  const links = Array.isArray(config.css)
    ? config.css.map((href) => ({ rel: "stylesheet", href: String(href) }))
    : [];

  return {
    ...(typeof head === "object" && head ? head : {}),
    link: [
      ...(((head as { link?: Array<Record<string, string>> })?.link) ?? []),
      ...links
    ]
  };
}

function scanRuntimeConfigForSecrets(config: Record<string, unknown>, halalConfig: any): void {
  const publicConfig = config.public as Record<string, unknown> | undefined;
  if (!publicConfig || typeof publicConfig !== "object") {
    return;
  }

  const isStrict = halalConfig?.strict === true;
  const unsafeKeys = ["SECRET", "TOKEN", "PASSWORD", "PRIVATE", "DATABASE", "KEY"];
  const secretValuePatterns = [
    /^[a-f0-9]{32,128}$/i,
    /ey[a-zA-Z0-9_-]{15,}\.ey[a-zA-Z0-9_-]{15,}\.[a-zA-Z0-9_-]{15,}/,
    /sk_live_[0-9a-zA-Z]{24}/,
    /AIzaSy[0-9a-zA-Z_-]{33}/,
    /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i,
    /https?:\/\/[^/]+:[^/]+@/
  ];

  for (const [key, value] of Object.entries(publicConfig)) {
    const upperKey = key.toUpperCase();
    const matchesUnsafeKey = unsafeKeys.some(unsafe => upperKey.includes(unsafe));
    if (matchesUnsafeKey) {
      const msg = `[resux-safety] Unsafe key name "${key}" found in public runtimeConfig. Do not expose secrets to the client.`;
      if (isStrict) {
        throw new Error(msg);
      } else {
        console.warn(`\x1b[33m${msg}\x1b[0m`);
      }
    }

    if (typeof value === "string") {
      const looksLikeSecret = secretValuePatterns.some(pattern => pattern.test(value));
      if (looksLikeSecret) {
        const msg = `[resux-safety] Value of public runtimeConfig key "${key}" looks like a private credential or API secret. Do not expose secrets to the client.`;
        if (isStrict) {
          throw new Error(msg);
        } else {
          console.warn(`\x1b[33m${msg}\x1b[0m`);
        }
      }
    }
  }
}

function createRuntimeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const runtimeConfig = (config as ResuxConfig).runtimeConfig;
  const packagesConfig = isPlainObject((config as ResuxConfig).packages)
    ? (config as ResuxConfig).packages as Record<string, unknown>
    : null;
  const videoConfig = isPlainObject((config as ResuxConfig).video)
    ? (config as ResuxConfig).video as Record<string, unknown>
    : null;
  const publicConfig = (runtimeConfig?.public && typeof runtimeConfig.public === "object" && !Array.isArray(runtimeConfig.public))
    ? runtimeConfig.public as Record<string, unknown>
    : {};
  const appRuntimeConfig = {
    ...(runtimeConfig ?? {}),
    public: {
      ...publicConfig,
      ...(packagesConfig ? { packages: packagesConfig } : {}),
      ...(videoConfig ? { video: videoConfig } : {}),
    }
  };

  const halalConfig = (config as any).halalAI;
  scanRuntimeConfigForSecrets(appRuntimeConfig, halalConfig);

  return appRuntimeConfig;
}

function createRouteRules(config: Record<string, unknown>): Record<string, RouteRuleConfig> {
  const routeRules = (config as ResuxConfig).routeRules;

  if (!routeRules || typeof routeRules !== "object" || Array.isArray(routeRules)) {
    return {};
  }

  const normalized: Record<string, RouteRuleConfig> = {};

  for (const [routePath, rule] of Object.entries(routeRules)) {
    if (!routePath.startsWith("/") || !rule || typeof rule !== "object" || Array.isArray(rule)) {
      continue;
    }

    const routeRule = rule as RouteRuleConfig;
    normalized[routePath] = {
      ...(routeRule.headers && typeof routeRule.headers === "object" ? { headers: normalizeStringRecord(routeRule.headers) } : {}),
      ...(typeof routeRule.redirect === "string" || isRedirectObject(routeRule.redirect)
        ? { redirect: routeRule.redirect }
        : {}),
      ...(isStatusCode(routeRule.statusCode) ? { statusCode: routeRule.statusCode } : {}),
      ...(normalizeCacheRule(routeRule.cache) !== undefined ? { cache: normalizeCacheRule(routeRule.cache) } : {}),
      ...(normalizeCorsRule(routeRule.cors) !== undefined ? { cors: normalizeCorsRule(routeRule.cors) } : {})
    };
  }

  return normalized;
}

function isStatusCode(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 100 && (value as number) <= 599;
}

function normalizeCacheRule(value: RouteRuleConfig["cache"]): RouteRuleConfig["cache"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === false || typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const cache: { maxAge?: number; swr?: number } = {};
  if (Number.isFinite(value.maxAge) && value.maxAge! >= 0) {
    cache.maxAge = Math.floor(value.maxAge!);
  }
  if (Number.isFinite(value.swr) && value.swr! >= 0) {
    cache.swr = Math.floor(value.swr!);
  }
  return Object.keys(cache).length > 0 ? cache : undefined;
}

function normalizeCorsRule(value: RouteRuleConfig["cors"]): RouteRuleConfig["cors"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return {
    ...(typeof value.origin === "string" ? { origin: value.origin } : {}),
    ...(Array.isArray(value.methods) ? { methods: value.methods.map(String) } : {}),
    ...(Array.isArray(value.headers) ? { headers: value.headers.map(String) } : {}),
    ...(typeof value.credentials === "boolean" ? { credentials: value.credentials } : {})
  };
}

function normalizeStringRecord(record: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== null) {
      output[key] = String(value);
    }
  }

  return output;
}

function isRedirectObject(value: unknown): value is { to: string; statusCode?: number } {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value)
      && typeof (value as { to?: unknown }).to === "string"
  );
}

function layoutNameFromFile(file: string): string {
  return kebabCase(path.basename(file, ".vue"));
}

function supportFileMode(file: string): "all" | "server" | "client" {
  if (file.includes(".client.")) {
    return "client";
  }
  if (file.includes(".server.")) {
    return "server";
  }
  return "all";
}

function supportFileBaseName(file: string): string {
  const extensionStripped = path.basename(file).replace(/\.[cm]?[tj]s$/, "");
  return extensionStripped.replace(/(?:\.global|\.client|\.server)+$/, "");
}

function compilePluginFile(file: string, index: number): CompiledPlugin {
  const mode = supportFileMode(file);
  return {
    id: `p${index}`,
    file,
    mode,
    serverSource: transpileSupportModule(file, {
      prefix: `import { defineResuxPlugin } from "resuxjs/runtime";\nconst defineNuxtPlugin = defineResuxPlugin;\n`,
      autoImports: [{
        from: "resuxjs/runtime",
        names: SUPPORT_CLIENT_RUNTIME_HELPERS,
      }],
    }),
    clientSource: transpileSupportModule(file, {
      prefix: `import { defineResuxPlugin } from "/__resux/runtime-client.mjs";\nconst defineNuxtPlugin = defineResuxPlugin;\n`,
      autoImports: [{
        from: "/__resux/runtime-client.mjs",
        names: SUPPORT_CLIENT_RUNTIME_HELPERS,
      }],
      rewriteImports: {
        "resuxjs": "/__resux/runtime-client.mjs",
        "resuxjs/runtime": "/__resux/runtime-client.mjs",
      },
    })
  };
}

function compileMiddlewareFile(file: string, index: number): CompiledMiddleware {
  const baseName = supportFileBaseName(file);
  const mode = supportFileMode(file);
  const global = /\.global(?:\.(?:client|server))?\.[cm]?[tj]s$/.test(file);

  return {
    id: `w${index}`,
    name: kebabCase(baseName),
    file,
    mode,
    global,
    serverSource: transpileSupportModule(
      file,
      `import { defineResuxRouteMiddleware, navigateTo, abortNavigation } from "resuxjs/runtime";\n`
    ),
    clientSource: transpileSupportModule(
      file,
      `import { defineResuxRouteMiddleware, defineClientRouteRedirect as navigateTo, defineClientRouteAbort as abortNavigation } from "/__resux/runtime-client.mjs";\n`
    )
  };
}

function compileServerMiddlewareFile(file: string, index: number): CompiledServerMiddleware {
  return {
    id: `s${index}`,
    file,
    source: transpileSupportModule(file, `import { defineServerMiddleware, defineEventHandler, eventHandler, readBody, getQuery, setHeader } from "resuxjs/runtime";\n`)
  };
}

function compileServerHandlerFile(file: string, index: number, routePath: string): ServerHandlerRecord {
  const params = collectRouteParams(routePath);

  return {
    id: `h${index}`,
    path: routePath,
    file,
    params,
    source: transpileSupportModule(file, `import { defineEventHandler, eventHandler, readBody, getQuery, setHeader } from "resuxjs/runtime";\n`)
  };
}

function transpileSupportModule(file: string, input: string | SupportModuleTranspileOptions = ""): string {
  const source = ts.sys.readFile(file) ?? "";
  const options: SupportModuleTranspileOptions = typeof input === "string"
    ? { prefix: input }
    : input;
  const rewrittenSource = rewriteSupportModuleImports(source, options.rewriteImports);
  const autoImportPrefix = createSupportModuleAutoImportPrefix(file, rewrittenSource, options.autoImports ?? []);
  return ts.transpileModule(`${options.prefix ?? ""}${autoImportPrefix}${rewrittenSource}`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  }).outputText;
}

function rewriteSupportModuleImports(source: string, rewrites?: Record<string, string>): string {
  if (!rewrites || Object.keys(rewrites).length === 0) {
    return source;
  }
  let output = source;
  for (const [from, to] of Object.entries(rewrites)) {
    if (!from || !to || from === to) {
      continue;
    }
    const escapedFrom = escapeRegExp(from);
    output = output.replace(
      new RegExp(`(\\bfrom\\s+["'])${escapedFrom}(["'])`, "g"),
      `$1${to}$2`,
    );
    output = output.replace(
      new RegExp(`(\\bimport\\s*\\(\\s*["'])${escapedFrom}(["']\\s*\\))`, "g"),
      `$1${to}$2`,
    );
  }
  return output;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createSupportModuleAutoImportPrefix(
  file: string,
  source: string,
  autoImports: Array<{ from: string; names: readonly string[] }>,
): string {
  if (!autoImports.length) {
    return "";
  }

  const declared = collectSupportModuleTopLevelBindings(file, source);
  const lines: string[] = [];

  for (const entry of autoImports) {
    const seen = new Set<string>();
    const names: string[] = [];

    for (const name of entry.names) {
      if (seen.has(name) || declared.has(name)) {
        continue;
      }
      seen.add(name);
      const pattern = new RegExp(`\\b${name}\\b`);
      if (!pattern.test(source)) {
        continue;
      }
      names.push(name);
    }

    if (names.length > 0) {
      lines.push(`import { ${names.join(", ")} } from ${JSON.stringify(entry.from)};`);
    }
  }

  if (!lines.length) {
    return "";
  }

  return `${lines.join("\n")}\n`;
}

function collectSupportModuleTopLevelBindings(file: string, source: string): Set<string> {
  const bindings = new Set<string>();
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (!clause) {
        continue;
      }
      if (clause.name) {
        bindings.add(clause.name.text);
      }
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          bindings.add(clause.namedBindings.name.text);
        } else {
          for (const element of clause.namedBindings.elements) {
            bindings.add(element.name.text);
          }
        }
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of collectBindingNames(declaration.name)) {
          bindings.add(name);
        }
      }
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      bindings.add(statement.name.text);
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      bindings.add(statement.name.text);
      continue;
    }

    if (ts.isEnumDeclaration(statement)) {
      bindings.add(statement.name.text);
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement)) {
      bindings.add(statement.name.text);
      continue;
    }

    if (ts.isInterfaceDeclaration(statement)) {
      bindings.add(statement.name.text);
      continue;
    }
  }

  return bindings;
}

interface RuntimeConfigReadResult {
  config: Record<string, unknown>;
  moduleContainer: ResuxModuleContainer;
}

async function readRuntimeConfig(root: string, outDir: string, hooks: ResuxHooks): Promise<RuntimeConfigReadResult> {
  const moduleContainer = new ResuxModuleContainer();
  const candidates = [
    "resux.config.ts",
    "resux.config.mjs",
    "resux.config.js"
  ];

  for (const candidate of candidates) {
    const file = await optionalFile(path.join(root, candidate));
    if (!file) {
      continue;
    }

    const source = normalizeConfigHelpers(await readFile(file, "utf8"));
    const outputFile = path.join(outDir, "server", "config.mjs");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022
      }
    }).outputText;
    await writeFile(outputFile, compiled, "utf8");
    const imported = await import(`${pathToFileURL(outputFile).href}?t=${Date.now()}`);
    const config = (imported.default ?? {}) as ResuxConfig;
    Object.assign(config, createResux({ rootDir: root, buildDir: outDir, config }).options);
    const context = moduleContainer.createContext(config, root, outDir, hooks);
    await applyConfiguredModules(config, root, outDir, context);
    delete config.modules;
    await writeFile(outputFile, `export default ${JSON.stringify(config, null, 2)};`, "utf8");
    return { config, moduleContainer };
  }

  return { config: createResux({ rootDir: root, buildDir: outDir, config: {} }).options, moduleContainer };
}

function normalizeConfigHelpers(source: string): string {
  return source
    .replace(/\bdefineResuxConfig\s*\(/g, "(")
    .replace(/\bdefineResuxModule\s*\(/g, "(");
}

async function applyConfiguredModules(
  config: ResuxConfig,
  root: string,
  outDir: string,
  context: ResuxModuleContext
): Promise<void> {
  const modules = Array.isArray(config.modules) ? config.modules : [];

  for (const moduleEntry of modules) {
    const { module, options } = await resolveModuleEntry(moduleEntry, root, outDir);
    const setup = getModuleSetup(module);
    await Promise.resolve(withResuxKitContext(context, () => setup(createModuleOptions(module, options), context)));
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, next: Record<string, unknown>): T {
  const output = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(next)) {
    const current = output[key];
    output[key] = isPlainObject(current) && isPlainObject(value)
      ? deepMerge(current, value)
      : value;
  }

  return output as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function resolveModuleEntry(
  entry: unknown,
  root: string,
  outDir: string
): Promise<{ module: unknown; options: unknown }> {
  if (Array.isArray(entry)) {
    return {
      module: await loadModule(entry[0], root, outDir),
      options: entry[1] ?? {}
    };
  }

  return {
    module: await loadModule(entry, root, outDir),
    options: {}
  };
}

async function loadModule(module: unknown, root: string, outDir: string): Promise<unknown> {
  if (typeof module === "function" || isPlainObject(module)) {
    return module;
  }

  if (typeof module !== "string") {
    throw new Error("Resux modules must be functions, module objects, module specifiers, or [module, options] tuples.");
  }

  const builtin = resolveBuiltinModule(module);
  if (builtin) {
    return builtin;
  }

  const resolved = resolveModuleSpecifier(module, root);
  const imported = await import(`${await moduleImportUrl(resolved, outDir)}?t=${Date.now()}`);
  return imported.default ?? imported;
}

function getModuleSetup(module: unknown): ResuxModuleSetup {
  if (typeof module === "function") {
    return module as ResuxModuleSetup;
  }

  if (isPlainObject(module) && typeof module.setup === "function") {
    return module.setup as ResuxModuleSetup;
  }

  throw new Error("Resux modules must export a setup function or defineResuxModule({ setup }).");
}

function createModuleOptions(module: unknown, options: unknown): unknown {
  if (isPlainObject(module) && isPlainObject(module.defaults)) {
    return {
      ...module.defaults,
      ...(isPlainObject(options) ? options : {})
    };
  }

  return options;
}

function resolveBuiltinModule(specifier: string): BuiltinResuxModule | null {
  const normalized = specifier.startsWith("resux:") ? specifier.slice("resux:".length) : specifier;
  return builtinModules[normalized] ?? null;
}

const i18nBuiltinModule: BuiltinResuxModule = {
  async setup(options, resux) {
    const imported = await import("../i18n/index.js");
    const module = imported.default ?? imported;
    const setup = getModuleSetup(module);
    await setup(options, resux);
  }
};

const builtinModules: Record<string, BuiltinResuxModule> = {
  i18n: i18nBuiltinModule,
  "resuxjs/i18n": i18nBuiltinModule,
  "@resuxjs/i18n": i18nBuiltinModule,
  security: {
    defaults: {
      route: "/**",
      contentSecurityPolicy: false
    },
    setup(options, resux) {
      const input = isPlainObject(options) ? options : {};
      const routePath = firstString(input.route) ?? "/**";
      const headers: Record<string, string> = {
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-frame-options": "SAMEORIGIN",
        "cross-origin-opener-policy": "same-origin",
        "permissions-policy": "camera=(), microphone=(), geolocation=()",
        ...(isPlainObject(input.headers) ? normalizeStringRecord(input.headers) : {})
      };
      const csp = firstString(input.contentSecurityPolicy);

      if (csp) {
        headers["content-security-policy"] = csp;
      }

      resux.addRouteRule(routePath, { headers });
      resux.extendRuntimeConfig({ public: { securityHeaders: true } });
    }
  },
  performance: {
    defaults: {
      assetMaxAge: 31536000,
      routePayloadNoStore: true
    },
    setup(options, resux) {
      const input = isPlainObject(options) ? options : {};
      const maxAge = Number.isFinite(input.assetMaxAge) ? Math.max(0, Math.floor(input.assetMaxAge as number)) : 31536000;
      const assetCache = { maxAge };
      resux.addRouteRule("/__resux/runtime-client.mjs", { cache: assetCache });
      resux.addRouteRule("/__resux/handlers/**", { cache: assetCache });
      resux.addRouteRule("/__resux/vue-islands/**", { cache: assetCache });
      resux.addRouteRule("/__resux/image", { cache: assetCache });
      resux.addRouteRule("/__resux/video", { cache: assetCache });

      if (input.routePayloadNoStore !== false) {
        resux.addRouteRule("/__resux/route", { cache: false });
      }

      resux.extendRuntimeConfig({ public: { performanceModule: { assetMaxAge: maxAge } } });
    }
  }
};

function firstString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function resolveModuleSpecifier(specifier: string, root: string): string {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("file:")) {
    const resolved = specifier.startsWith("file:")
      ? new URL(specifier)
      : path.resolve(root, specifier);
    const file = resolved instanceof URL ? fileURLToPath(resolved) : resolved;
    return resolveLocalModuleFile(file);
  }

  return require.resolve(specifier, { paths: [root] });
}

function resolveLocalModuleFile(file: string): string {
  const candidates = [
    file,
    `${file}.ts`,
    `${file}.mts`,
    `${file}.js`,
    `${file}.mjs`,
    path.join(file, "index.ts"),
    path.join(file, "index.mts"),
    path.join(file, "index.js"),
    path.join(file, "index.mjs")
  ];
  const found = candidates.find((candidate) => ts.sys.fileExists(candidate));

  if (!found) {
    throw new Error(`Cannot resolve Resux module "${file}".`);
  }

  return found;
}

async function moduleImportUrl(file: string, outDir: string): Promise<string> {
  if (/\.[cm]?ts$/.test(file)) {
    const outputFile = path.join(outDir, "server", "config-modules", `${safeModuleFileName(file)}.mjs`);
    await writeFile(outputFile, transpileConfigSupportModule(file), "utf8");
    return pathToFileURL(outputFile).href;
  }

  return pathToFileURL(file).href;
}

function transpileConfigSupportModule(file: string): string {
  const source = normalizeConfigHelpers(ts.sys.readFile(file) ?? "");
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  }).outputText;
}

function safeModuleFileName(file: string): string {
  return normalizePath(path.resolve(file)).replace(/[^A-Za-z0-9_-]+/g, "_");
}

function nextBindingId(state: CompileTemplateState): string {
  return `b${state.bindingIndex++}`;
}

function nextInlineHandlerName(state: CompileTemplateState): string {
  return `__rx_inline_${state.inlineHandlerIndex++}`;
}

function routeScore(routePath: string): number {
  return routePath
    .split("/")
    .filter(Boolean)
    .reduce((score, part) => score + (part.startsWith(":") ? 1 : 3), 0);
}

async function discoverVueFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await discoverVueFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".vue")) {
        files.push(fullPath);
      }
    }

    return files.sort();
  } catch {
    return [];
  }
}

async function discoverAppVueFiles(root: string, dirName: string): Promise<string[]> {
  return unique([
    ...await discoverVueFiles(path.join(root, dirName)),
    ...await discoverVueFiles(path.join(root, "app", dirName))
  ]);
}

async function discoverVueFilesFromDirs(dirs: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const dir of dirs) {
    files.push(...await discoverVueFiles(dir));
  }
  return unique(files);
}

async function discoverSupportTsFiles(root: string, dirName: string): Promise<string[]> {
  const dirs = [path.join(root, dirName), path.join(root, "app", dirName)];
  const files: string[] = [];

  for (const dir of dirs) {
    files.push(...await discoverSupportTsFilesInDir(dir));
  }

  return unique(files).sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

function isClientEnhancementSupportFile(file: string): boolean {
  return /\.client\.[cm]?[tj]s$/.test(file) && !/\.d\.[cm]?[tj]s$/.test(file);
}

async function discoverClientEnhancementFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const relativeDir of CLIENT_ENHANCEMENT_DIR_CANDIDATES) {
    const absoluteDir = path.join(root, relativeDir);
    files.push(...await discoverSupportTsFilesInDir(absoluteDir));
  }
  return unique(files)
    .map((file) => path.resolve(file))
    .filter((file) => isClientEnhancementSupportFile(file))
    .sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

async function discoverAutoImportsFromDirs(
  root: string,
  dirs: string[]
): Promise<Array<{ from: string; name: string; as?: string }>> {
  const entries: Array<{ from: string; name: string; as?: string }> = [];
  for (const dir of dirs) {
    const files = await discoverSupportTsFilesInDir(dir);
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const names = collectNamedExportsFromSource(file, source);
      const relative = normalizePath(path.relative(root, file).replace(/\.[cm]?[tj]s$/, ""));
      const from = relative.startsWith(".") ? relative : `./${relative}`;
      for (const name of names) {
        entries.push({ from, name });
      }
    }
  }
  return dedupeImports(entries);
}

function collectNamedExportsFromSource(file: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!isStatementExported(statement)) {
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      names.add(statement.name.text);
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      names.add(statement.name.text);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.add(declaration.name.text);
        }
      }
      continue;
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const specifier of statement.exportClause.elements) {
        names.add(specifier.name.text);
      }
    }
  }
  return [...names].sort();
}

function isStatementExported(statement: ts.Statement): boolean {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return Boolean(modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function uniqueServerHandlers(records: Array<{ file: string; path: string }>): Array<{ file: string; path: string }> {
  const map = new Map<string, { file: string; path: string }>();
  for (const record of records) {
    const key = `${normalizeRoutePath(record.path)}::${normalizePath(path.resolve(record.file))}`;
    map.set(key, { file: path.resolve(record.file), path: normalizeRoutePath(record.path) });
  }
  return [...map.values()].sort((left, right) => left.path.localeCompare(right.path) || normalizePath(left.file).localeCompare(normalizePath(right.file)));
}

async function writeModuleTemplates(outDir: string, contributions: ResuxModuleContributions): Promise<string[]> {
  const written: string[] = [];
  for (const template of [...contributions.templates, ...contributions.typeTemplates]) {
    if (template.write === false) {
      continue;
    }
    const target = path.join(outDir, "templates", template.filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, await template.getContents(), "utf8");
    written.push(target);
  }
  return written.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

interface RuntimeArtifactsInput {
  routes: RouteManifestRecord[];
  components: CompiledComponent[];
  layouts: CompiledComponent[];
  plugins: CompiledPlugin[];
  clientEnhancements: ClientEnhancementManifestEntry[];
  middleware: CompiledMiddleware[];
  serverMiddleware: CompiledServerMiddleware[];
  serverHandlers: ServerHandlerRecord[];
  vueIslands: VueIslandRecord[];
  app?: CompiledComponent;
  error?: CompiledComponent;
  runtimeConfig: Record<string, unknown>;
  routeRules: Record<string, RouteRuleConfig>;
  packages: PackageManifestEntry[];
  buildOptions: { vite: "build" | "dev"; server: "bundle" | "modules" };
  contributions: ResuxModuleContributions;
}

interface RuntimeArtifacts {
  manifest: Record<string, unknown>;
  buildManifest: Record<string, unknown>;
  routesSource: string;
  pluginsSource: string;
  middlewareSource: string;
  componentsSource: string;
  importsSource: string;
  appSource: string;
  resuxDts: string;
  importsDts: string;
  componentsDts: string;
  serverRoutesDts: string;
  diagnostics: {
    routeManifest: Record<string, unknown>[];
    pluginManifest: Record<string, unknown>[];
    clientEnhancementManifest: Record<string, unknown>[];
    middlewareManifest: Record<string, unknown>[];
    componentManifest: Record<string, unknown>[];
  };
}

function buildRuntimeArtifacts(input: RuntimeArtifactsInput): RuntimeArtifacts {
  const manifest = {
    routes: input.routes,
    components: input.components.map(({ id, name, file, handlers, styles, styleScopeId, meta }) => ({ id, name, file, handlers, styles, styleScopeId, meta })),
    layouts: input.layouts.map(({ id, name, file, styles, styleScopeId }) => ({ id, name, file, styles, styleScopeId })),
    plugins: input.plugins.map(({ id, file, mode }) => ({ id, file, mode })),
    clientEnhancements: input.clientEnhancements.map(({ name, id, file, src }) => ({ name, id, file, src })),
    middleware: input.middleware.map(({ id, name, file, global, mode }) => ({ id, name, file, global, mode })),
    serverMiddleware: input.serverMiddleware.map(({ id, file }) => ({ id, file })),
    serverHandlers: input.serverHandlers.map(({ id, path: routePath, file, params }) => ({ id, path: routePath, file, params })),
    vueIslands: input.vueIslands,
    app: input.app?.id,
    error: input.error?.id,
    runtimeConfig: input.runtimeConfig,
    routeRules: input.routeRules,
    packages: input.packages,
    features: input.buildOptions
  };

  const buildManifest = {
    routes: input.routes.map((route) => route.path),
    serverHandlers: input.serverHandlers.map((handler) => ({ path: handler.path, file: handler.file })),
    plugins: input.plugins.map((plugin) => ({ file: plugin.file, mode: plugin.mode })),
    clientEnhancements: input.clientEnhancements.map((entry) => ({ name: entry.name, id: entry.id, file: entry.file, src: entry.src })),
    middleware: input.middleware.map((entry) => ({ name: entry.name, file: entry.file, mode: entry.mode, global: entry.global })),
    components: input.components.map((component) => ({ name: component.name, file: component.file })),
    assets: [],
    imageTransforms: [],
    routeRules: Object.entries(input.routeRules).map(([routePath, rule]) => ({ path: routePath, rule })),
    runtimeConfig: input.runtimeConfig,
    packages: input.packages
  };

  const componentMap = new Map<string, typeof input.components[0]>();
  for (const component of input.components) {
    componentMap.set(component.name, component);
    const basename = pascalCase(path.basename(component.file, ".vue"));
    if (!componentMap.has(basename)) {
      componentMap.set(basename, component);
    }
  }
  const componentNames = unique([...componentMap.keys()].filter(Boolean)).sort();
  const imports = dedupeImports([...BUILTIN_AUTO_IMPORTS, ...input.contributions.imports]);
  const importsSignatures = imports
    .map((entry) => `${entry.name}${entry.as ? ` as ${entry.as}` : ""} from ${entry.from}`)
    .join("\n");

  const routesSource = `export default ${JSON.stringify(input.routes.map((route) => ({ id: route.id, path: route.path, file: route.file, params: route.params, componentId: route.componentId, meta: route.meta })), null, 2)};\n`;
  const pluginsSource = `export default ${JSON.stringify(input.plugins.map((plugin) => ({ id: plugin.id, file: plugin.file, mode: plugin.mode })), null, 2)};\n`;
  const middlewareSource = `export default ${JSON.stringify(input.middleware.map((entry) => ({ id: entry.id, name: entry.name, file: entry.file, global: entry.global, mode: entry.mode })), null, 2)};\n`;
  const componentsSource = `export default ${JSON.stringify([...componentMap.entries()].map(([name, comp]) => ({ id: comp.id, name, file: comp.file })), null, 2)};\n`;
  const importsSource = `export default ${JSON.stringify(imports, null, 2)};\n`;
  const appSource = [
    `import routes from "./routes.mjs";`,
    `import plugins from "./plugins.mjs";`,
    `import middleware from "./middleware.mjs";`,
    `import components from "./components.mjs";`,
    `import imports from "./imports.mjs";`,
    `export default {`,
    `  app: ${JSON.stringify(input.app?.id ?? null)},`,
    `  error: ${JSON.stringify(input.error?.id ?? null)},`,
    `  routes,`,
    `  plugins,`,
    `  middleware,`,
    `  components,`,
    `  imports`,
    `};`,
    ``
  ].join("\n");
  const resuxDts = [
    `export interface ResuxGeneratedAppManifest {`,
    `  app: string | null;`,
    `  error: string | null;`,
    `  routes: Array<{ id: string; path: string; file: string; params: string[]; componentId: string }>;`,
    `  plugins: Array<{ id: string; file: string; mode: "all" | "server" | "client" }>;`,
    `  clientEnhancements: Array<{ name: string; id: string; file: string; src: string }>;`,
    `  middleware: Array<{ id: string; name: string; file: string; mode: "all" | "server" | "client"; global: boolean }>;`,
    `  components: Array<{ id: string; name: string; file: string }>;`,
    `  imports: Array<{ from: string; name: string; as?: string }>;`,
    `}`,
    `declare const manifest: ResuxGeneratedAppManifest;`,
    `export default manifest;`,
    ``
  ].join("\n");
  const importsDts = [
    `// Generated by Resux`,
    `declare module "resuxjs" {`,
    `  export interface ResuxAutoImportsRegistry {`,
    ...(importsSignatures ? imports.map((entry) => `    "${entry.as ?? entry.name}": typeof import("${entry.from}")["${entry.name}"];`) : ["    // no user imports detected"]),
    `  }`,
    `}`,
    `export {};`,
    ``
  ].join("\n");
  const componentsDts = [
    `declare module "resuxjs/components" {`,
    `  export interface ResuxComponentsRegistry {`,
    ...(componentNames.length ? componentNames.map((name) => `    "${name}": unknown;`) : ["    // no components detected"]),
    `  }`,
    `}`,
    `export {};`,
    ``
  ].join("\n");
  const serverRoutesDts = [
    `declare module "resuxjs/server-routes" {`,
    `  export interface ResuxServerRouteMap {`,
    ...(input.serverHandlers.length
      ? input.serverHandlers.map((handler) => `    "${handler.path}": unknown;`)
      : ["    // no server routes detected"]),
    `  }`,
    `}`,
    `export {};`,
    ``
  ].join("\n");

  return {
    manifest: manifest as Record<string, unknown>,
    buildManifest: buildManifest as Record<string, unknown>,
    routesSource,
    pluginsSource,
    middlewareSource,
    componentsSource,
    importsSource,
    appSource,
    resuxDts,
    importsDts,
    componentsDts,
    serverRoutesDts,
    diagnostics: {
      routeManifest: input.routes.map((route) => ({ id: route.id, path: route.path, file: route.file, params: route.params })),
      pluginManifest: input.plugins.map((plugin) => ({ id: plugin.id, file: plugin.file, mode: plugin.mode })),
      clientEnhancementManifest: input.clientEnhancements.map((entry) => ({ name: entry.name, id: entry.id, file: entry.file, src: entry.src })),
      middlewareManifest: input.middleware.map((entry) => ({ id: entry.id, name: entry.name, file: entry.file, global: entry.global, mode: entry.mode })),
      componentManifest: input.components.map((component) => ({ id: component.id, name: component.name, file: component.file }))
    }
  };
}

async function writeGeneratedArtifacts(outDir: string, artifacts: RuntimeArtifacts, dev: boolean): Promise<void> {
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(artifacts.manifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "manifest", "build-manifest.json"), JSON.stringify(artifacts.buildManifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "routes.mjs"), artifacts.routesSource, "utf8");
  await writeFile(path.join(outDir, "plugins.mjs"), artifacts.pluginsSource, "utf8");
  await writeFile(path.join(outDir, "middleware.mjs"), artifacts.middlewareSource, "utf8");
  await writeFile(path.join(outDir, "components.mjs"), artifacts.componentsSource, "utf8");
  await writeFile(path.join(outDir, "imports.mjs"), artifacts.importsSource, "utf8");
  await writeFile(path.join(outDir, "app.mjs"), artifacts.appSource, "utf8");
  await writeFile(path.join(outDir, "resux.d.ts"), artifacts.resuxDts, "utf8");
  await writeFile(path.join(outDir, "imports.d.ts"), artifacts.importsDts, "utf8");
  await writeFile(path.join(outDir, "components.d.ts"), artifacts.componentsDts, "utf8");
  await writeFile(path.join(outDir, "server-routes.d.ts"), artifacts.serverRoutesDts, "utf8");
  await writeFile(path.join(outDir, "types", "resux.d.ts"), artifacts.resuxDts, "utf8");
  await writeFile(path.join(outDir, "types", "imports.d.ts"), artifacts.importsDts, "utf8");
  await writeFile(path.join(outDir, "types", "components.d.ts"), artifacts.componentsDts, "utf8");
  await writeFile(path.join(outDir, "types", "server-routes.d.ts"), artifacts.serverRoutesDts, "utf8");
  if (!dev) {
    return;
  }
  await mkdir(path.join(outDir, "dev"), { recursive: true });
  await writeFile(path.join(outDir, "dev", "route-manifest.json"), JSON.stringify(artifacts.diagnostics.routeManifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "dev", "plugin-manifest.json"), JSON.stringify(artifacts.diagnostics.pluginManifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "dev", "client-enhancement-manifest.json"), JSON.stringify(artifacts.diagnostics.clientEnhancementManifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "dev", "middleware-manifest.json"), JSON.stringify(artifacts.diagnostics.middlewareManifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "dev", "component-manifest.json"), JSON.stringify(artifacts.diagnostics.componentManifest, null, 2), "utf8");
  await writeFile(path.join(outDir, "dev", "imports.d.ts"), artifacts.importsDts, "utf8");
  await writeFile(path.join(outDir, "dev", "resux.d.ts"), artifacts.resuxDts, "utf8");
}

function uniquePackageSourceFiles(entries: PackageSourceFileInput[]): PackageSourceFileInput[] {
  const map = new Map<string, PackageSourceFileInput>();
  for (const entry of entries) {
    const resolved = path.resolve(entry.file);
    const key = normalizePath(resolved);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { file: resolved, mode: entry.mode });
      continue;
    }
    if (existing.mode === entry.mode) {
      continue;
    }
    map.set(key, { file: resolved, mode: "all" });
  }
  return [...map.values()].sort((left, right) => normalizePath(left.file).localeCompare(normalizePath(right.file)));
}

function isPackageSpecifier(specifier: string): boolean {
  if (!specifier) {
    return false;
  }
  if (
    specifier.startsWith(".")
    || specifier.startsWith("/")
    || specifier.startsWith("http://")
    || specifier.startsWith("https://")
    || specifier.startsWith("data:")
    || specifier.startsWith("file:")
    || specifier.startsWith("virtual:")
    || specifier.startsWith("node:")
  ) {
    return false;
  }
  return true;
}

function normalizePackageName(specifier: string): string {
  const clean = specifier.split("?")[0]?.split("#")[0] ?? specifier;
  const segments = clean.split("/");
  if (clean.startsWith("@")) {
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : clean;
  }
  return segments[0] ?? clean;
}

function collectPackageImportsFromSource(source: string): Array<{ specifier: string; dynamic: boolean; css: boolean }> {
  const imports: Array<{ specifier: string; dynamic: boolean; css: boolean }> = [];
  const staticRegex = /import\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  const requireRegex = /require\(\s*["']([^"']+)["']\s*\)/g;
  const packageApiRegex = /(?:useClientPackage|useLazyPackage|defineClientOnlyPackage|defineLazyPackage)(?:\s*<[\s\S]*?>)?\(\s*([A-Za-z_$][A-Za-z0-9_$]*|["'][^"']+["'])\s*(?:,\s*\{([\s\S]*?)\})?\s*\)/g;
  const packageConstRegex = /(?:^|[;\r\n])\s*const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*["']([^"']+)["']/g;
  const cssArrayRegex = /css\s*:\s*\[([\s\S]*?)\]/g;
  const cssStringRegex = /css\s*:\s*["']([^"']+)["']/g;
  const stringLiteralRegex = /["']([^"']+)["']/g;
  const packageConstMap = new Map<string, string>();

  for (const match of source.matchAll(packageConstRegex)) {
    const name = (match[1] ?? "").trim();
    const value = (match[2] ?? "").trim();
    if (!name || !value) {
      continue;
    }
    packageConstMap.set(name, value);
  }

  for (const match of source.matchAll(staticRegex)) {
    const specifier = match[1] ?? "";
    imports.push({
      specifier,
      dynamic: false,
      css: /\.css(?:[?#]|$)/i.test(specifier),
    });
  }
  for (const match of source.matchAll(dynamicRegex)) {
    const specifier = match[1] ?? "";
    imports.push({
      specifier,
      dynamic: true,
      css: /\.css(?:[?#]|$)/i.test(specifier),
    });
  }
  for (const match of source.matchAll(requireRegex)) {
    const specifier = match[1] ?? "";
    imports.push({
      specifier,
      dynamic: false,
      css: /\.css(?:[?#]|$)/i.test(specifier),
    });
  }
  for (const match of source.matchAll(packageApiRegex)) {
    const token = (match[1] ?? "").trim();
    const specifier = token.startsWith("\"") || token.startsWith("'")
      ? token.slice(1, -1).trim()
      : (packageConstMap.get(token) ?? "");
    const optionsSource = match[2] ?? "";
    if (specifier.length > 0) {
      imports.push({
        specifier,
        dynamic: true,
        css: false,
      });
    }
    for (const cssArray of optionsSource.matchAll(cssArrayRegex)) {
      const content = cssArray[1] ?? "";
      for (const cssEntry of content.matchAll(stringLiteralRegex)) {
        const cssSpecifier = (cssEntry[1] ?? "").trim();
        if (!cssSpecifier) {
          continue;
        }
        imports.push({
          specifier: cssSpecifier,
          dynamic: true,
          css: true,
        });
      }
    }
    for (const cssValue of optionsSource.matchAll(cssStringRegex)) {
      const cssSpecifier = (cssValue[1] ?? "").trim();
      if (!cssSpecifier) {
        continue;
      }
      imports.push({
        specifier: cssSpecifier,
        dynamic: true,
        css: true,
      });
    }
  }

  return imports;
}

function readConfiguredPackages(runtimeConfig: Record<string, unknown>): ResuxPackagesConfig {
  const directPackages = (runtimeConfig as ResuxConfig).packages;
  if (isPlainObject(directPackages)) {
    return directPackages as ResuxPackagesConfig;
  }
  const nestedRuntimeConfig = isPlainObject((runtimeConfig as ResuxConfig).runtimeConfig)
    ? (runtimeConfig as ResuxConfig).runtimeConfig as Record<string, unknown>
    : null;
  const nestedPublic = nestedRuntimeConfig && isPlainObject(nestedRuntimeConfig.public)
    ? nestedRuntimeConfig.public as Record<string, unknown>
    : null;
  const nestedPackages = nestedPublic?.packages;
  if (isPlainObject(nestedPackages)) {
    return nestedPackages as ResuxPackagesConfig;
  }
  return {};
}

function normalizeConfiguredPackageList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeConfiguredPackageCssMap(config: ResuxPackagesConfig): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  if (!config.css || typeof config.css !== "object" || Array.isArray(config.css)) {
    return output;
  }
  for (const [packageName, entries] of Object.entries(config.css)) {
    const normalizedPackageName = String(packageName || "").trim();
    if (!normalizedPackageName || !Array.isArray(entries)) {
      continue;
    }
    const normalizedEntries = [...new Set(entries
      .map((entry) => String(entry || "").trim())
      .filter((entry) => entry.length > 0))]
      .sort((left, right) => left.localeCompare(right));
    if (normalizedEntries.length > 0) {
      output[normalizedPackageName] = normalizedEntries;
    }
  }
  return output;
}

function canResolvePackageSpecifier(appRoot: string, specifier: string): boolean {
  try {
    require.resolve(specifier, { paths: [appRoot] });
    return true;
  } catch {
    return false;
  }
}

function createClientRuntimePackageRegistry(
  appRoot: string,
  configuredPackages: ResuxPackagesConfig,
  packageDiagnostics: PackageManifestEntry[],
): ClientRuntimePackageRegistry {
  const importers = new Set<string>();
  const declaredPackages = new Set<string>();
  const cssByPackage = normalizeConfiguredPackageCssMap(configuredPackages);
  const configuredModeMap = configuredPackages.mode && typeof configuredPackages.mode === "object" && !Array.isArray(configuredPackages.mode)
    ? configuredPackages.mode
    : {};
  const configuredLazy = normalizeConfiguredPackageList(configuredPackages.lazy);
  const configuredClientOnly = normalizeConfiguredPackageList(configuredPackages.clientOnly);

  for (const packageName of configuredLazy) {
    declaredPackages.add(packageName);
    importers.add(packageName);
  }
  for (const packageName of configuredClientOnly) {
    declaredPackages.add(packageName);
    importers.add(packageName);
  }
  for (const packageName of Object.keys(configuredModeMap)) {
    const normalizedPackageName = String(packageName || "").trim();
    if (!normalizedPackageName) {
      continue;
    }
    declaredPackages.add(normalizedPackageName);
    const mode = normalizeConfiguredPackageMode(configuredModeMap[normalizedPackageName], "ssr");
    if (mode !== "serverOnly") {
      importers.add(normalizedPackageName);
    }
  }
  for (const [packageName, cssEntries] of Object.entries(cssByPackage)) {
    declaredPackages.add(packageName);
    importers.add(packageName);
    for (const entry of cssEntries) {
      importers.add(entry);
    }
  }
  if (Array.isArray(configuredPackages.css)) {
    for (const entry of configuredPackages.css) {
      const normalized = String(entry || "").trim();
      if (!normalized) {
        continue;
      }
      importers.add(normalized);
    }
  }

  for (const packageEntry of packageDiagnostics) {
    declaredPackages.add(packageEntry.name);
    const includeImporter = packageEntry.declaredMode !== "serverOnly"
      && packageEntry.modes.some((mode) => mode !== "server");
    if (includeImporter) {
      importers.add(packageEntry.name);
      for (const specifier of packageEntry.specifiers) {
        const normalizedSpecifier = String(specifier || "").trim();
        if (!normalizedSpecifier || !isPackageSpecifier(normalizedSpecifier)) {
          continue;
        }
        importers.add(normalizedSpecifier);
        declaredPackages.add(normalizedSpecifier);
      }
    }
    for (const cssSpecifier of packageEntry.cssImports) {
      const normalizedCssSpecifier = String(cssSpecifier || "").trim();
      if (!normalizedCssSpecifier) {
        continue;
      }
      const cssOwner = normalizePackageName(normalizedCssSpecifier);
      if (!cssByPackage[cssOwner]) {
        cssByPackage[cssOwner] = [];
      }
      if (!cssByPackage[cssOwner].includes(normalizedCssSpecifier)) {
        cssByPackage[cssOwner].push(normalizedCssSpecifier);
      }
      importers.add(normalizedCssSpecifier);
    }
  }

  const resolvedImporters = [...importers]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => isPackageSpecifier(entry))
    .filter((entry) => canResolvePackageSpecifier(appRoot, entry))
    .sort((left, right) => left.localeCompare(right));

  const normalizedCssByPackage: Record<string, string[]> = {};
  for (const [packageName, entries] of Object.entries(cssByPackage)) {
    const normalizedEntries = [...new Set(entries
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0))]
      .sort((left, right) => left.localeCompare(right));
    if (normalizedEntries.length > 0) {
      normalizedCssByPackage[packageName] = normalizedEntries;
    }
  }

  return {
    importers: resolvedImporters,
    cssByPackage: normalizedCssByPackage,
    declared: [...declaredPackages].sort((left, right) => left.localeCompare(right)),
  };
}

function normalizeConfiguredPackageMode(value: unknown, fallback: ResuxPackageMode = "ssr"): ResuxPackageMode {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (
    normalized === "ssr"
    || normalized === "clientOnly"
    || normalized === "serverOnly"
    || normalized === "progressive"
  ) {
    return normalized;
  }
  return fallback;
}

function resolveConfiguredPackageMode(
  packageName: string,
  config: ResuxPackagesConfig,
): ResuxPackageMode {
  if (config.mode && typeof config.mode === "object" && !Array.isArray(config.mode)) {
    const direct = (config.mode as Record<string, unknown>)[packageName];
    if (direct) {
      return normalizeConfiguredPackageMode(direct, "ssr");
    }
  }
  const serverOnly = Array.isArray(config.serverOnly) ? config.serverOnly.map(String) : [];
  if (serverOnly.includes(packageName)) {
    return "serverOnly";
  }
  const clientOnly = Array.isArray(config.clientOnly) ? config.clientOnly.map(String) : [];
  if (clientOnly.includes(packageName)) {
    return "clientOnly";
  }
  return "ssr";
}

async function analyzePackageUsage(
  appRoot: string,
  sources: PackageSourceFileInput[],
  runtimeConfig: Record<string, unknown>,
): Promise<PackageManifestEntry[]> {
  const configuredPackages = readConfiguredPackages(runtimeConfig);
  const map = new Map<string, {
    files: Set<string>;
    modes: Set<PackageUsageMode>;
    dynamic: boolean;
    specifiers: Set<string>;
    cssImports: Set<string>;
    declaredMode: ResuxPackageMode;
    warnings: Set<string>;
  }>();
  const ignoredPackages = new Set(["resuxjs", "vue", "h3", "nitropack", "typescript"]);

  for (const entry of sources) {
    let sourceText = "";
    try {
      sourceText = await readFile(entry.file, "utf8");
    } catch {
      continue;
    }
    const imports = collectPackageImportsFromSource(sourceText);
    for (const imported of imports) {
      if (!isPackageSpecifier(imported.specifier)) {
        continue;
      }
      const packageName = normalizePackageName(imported.specifier);
      if (!packageName || ignoredPackages.has(packageName)) {
        continue;
      }
      const usage = map.get(packageName) ?? {
        files: new Set<string>(),
        modes: new Set<PackageUsageMode>(),
        dynamic: false,
        specifiers: new Set<string>(),
        cssImports: new Set<string>(),
        declaredMode: resolveConfiguredPackageMode(packageName, configuredPackages),
        warnings: new Set<string>(),
      };
      usage.files.add(normalizePath(path.relative(appRoot, entry.file)));
      usage.modes.add(entry.mode);
      usage.dynamic = usage.dynamic || imported.dynamic;
      usage.specifiers.add(imported.specifier);
      if (imported.css) {
        usage.cssImports.add(imported.specifier);
      }
      if (entry.mode === "server" && (usage.declaredMode === "clientOnly" || usage.declaredMode === "progressive")) {
        usage.warnings.add(`Package "${packageName}" is marked ${usage.declaredMode} but appears in server files.`);
      }
      if (entry.mode !== "server" && usage.declaredMode === "serverOnly") {
        usage.warnings.add(`Package "${packageName}" is marked serverOnly but appears in client files.`);
      }
      if (usage.declaredMode === "progressive" && entry.mode === "all") {
        usage.warnings.add(`Package "${packageName}" is marked progressive. Prefer loading it inside a client enhancement instead of setup-time imports.`);
      }
      if (
        entry.mode === "server"
        && usage.declaredMode === "ssr"
        && /(swiper|gsap|chart\.js|echarts|plyr|animejs|video\.js)/i.test(packageName)
      ) {
        usage.warnings.add(
          `Package "${packageName}" may be browser-only but is imported in server files. Consider packages.mode["${packageName}"] = "clientOnly" or "progressive".`,
        );
      }
      map.set(packageName, usage);
    }
  }

  const output: PackageManifestEntry[] = [];
  for (const [name, usage] of map.entries()) {
    let missing = false;
    try {
      require.resolve(name, { paths: [appRoot] });
    } catch {
      missing = true;
      usage.warnings.add(`Package "${name}" is imported but not installed.`);
    }
    output.push({
      name,
      specifiers: [...usage.specifiers].sort(),
      files: [...usage.files].sort(),
      modes: [...usage.modes].sort(),
      dynamic: usage.dynamic,
      cssImports: [...usage.cssImports].sort(),
      missing,
      declaredMode: usage.declaredMode,
      warnings: [...usage.warnings].sort(),
    });
  }

  return output.sort((left, right) => left.name.localeCompare(right.name));
}

function dedupeImports(entries: Array<{ from: string; name: string; as?: string }>): Array<{ from: string; name: string; as?: string }> {
  const map = new Map<string, { from: string; name: string; as?: string }>();
  for (const entry of entries) {
    const key = `${entry.from}::${entry.name}::${entry.as ?? ""}`;
    map.set(key, entry);
  }
  return [...map.values()].sort((left, right) => {
    const leftKey = `${left.from}:${left.name}:${left.as ?? ""}`;
    const rightKey = `${right.from}:${right.name}:${right.as ?? ""}`;
    return leftKey.localeCompare(rightKey);
  });
}

async function discoverSupportTsFilesInDir(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await discoverSupportTsFilesInDir(fullPath));
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!/\.[cm]?[tj]s$/.test(entry.name)) {
        continue;
      }
      if (/\.d\.[cm]?[tj]s$/.test(entry.name)) {
        continue;
      }
      files.push(fullPath);
    }

    return files;
  } catch {
    return [];
  }
}

async function discoverServerFiles(dir: string, routePrefix: string): Promise<Array<{ file: string; path: string }>> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: Array<{ file: string; path: string }> = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await discoverServerFiles(fullPath, `${routePrefix}/${entry.name}`));
      } else if (entry.isFile() && /\.[cm]?[tj]s$/.test(entry.name)) {
        const name = entry.name.replace(/\.[cm]?[tj]s$/, "");
        const segment = name === "index" ? "" : `/${name}`;
        files.push({
          file: fullPath,
          path: normalizeRoutePath(`${routePrefix}${segment}`)
        });
      }
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return [];
  }
}

async function discoverVueIslands(root: string): Promise<VueIslandRecord[]> {
  const islandRoot = path.join(root, "islands", "vue");
  const files = await discoverVueFiles(islandRoot);
  return files.map((file) => {
    const relative = path.relative(islandRoot, file).replace(/\.vue$/, "");
    return {
      name: pascalCase(relative),
      file
    };
  });
}

async function findFirstExisting(files: string[]): Promise<string | null> {
  for (const file of files) {
    const found = await optionalFile(file);
    if (found) {
      return found;
    }
  }
  return null;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

async function optionalFile(file: string): Promise<string | null> {
  try {
    await readFile(file, "utf8");
    return file;
  } catch {
    return null;
  }
}

async function existsFile(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function inferComponentName(root: string, file: string, componentDirs: string[] = []): string {
  const relative = normalizePath(path.relative(root, file));
  if (relative === "app.vue") {
    return "App";
  }
  const normalizedFile = normalizePath(path.resolve(file));
  for (const dir of componentDirs) {
    const normalizedDir = normalizePath(path.resolve(dir)) + "/";
    if (normalizedFile.startsWith(normalizedDir)) {
      const relToDir = normalizedFile.slice(normalizedDir.length).replace(/\.vue$/, "");
      const segments = relToDir.split("/").filter(Boolean);
      const parts: string[] = [];
      for (let i = 0; i < segments.length; i++) {
        const current = pascalCase(segments[i]);
        if (i < segments.length - 1) {
          const next = pascalCase(segments[i + 1]);
          if (next.toLowerCase().startsWith(current.toLowerCase())) {
            continue;
          }
        }
        parts.push(current);
      }
      return parts.join("");
    }
  }
  return pascalCase(path.basename(file, ".vue"));
}


function pascalCase(value: string): string {
  return value
    .replace(/\[[^\]]+\]/g, (match) => match.slice(1, -1))
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function kebabCase(value: string): string {
  return value
    .replace(/\[[^\]]+\]/g, (match) => match.slice(1, -1))
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\.global$/, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .join("-")
    .toLowerCase();
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function normalizeRoutePath(value: string): string {
  const normalized = value
    .replaceAll("\\", "/")
    .replace(/\.[cm]?[tj]s$/, "")
    .replace(/\[\.\.\.([A-Za-z0-9_]+)\]/g, ":$1*")
    .replace(/\[([A-Za-z0-9_]+)\]/g, ":$1")
    .replace(/\/index$/, "");

  return (`/${normalized}`.replace(/\/+/g, "/").replace(/\/$/, "")) || "/";
}

function collectRouteParams(routePath: string): string[] {
  return routePath
    .split("/")
    .filter((part) => part.startsWith(":"))
    .map((part) => part.slice(1).replace(/\*$/, ""));
}

function locationFromVueNode(file: string, node: VueCompilerNode): CompileErrorLocation {
  return {
    file,
    line: node.loc?.start?.line ?? 1,
    column: node.loc?.start?.column ?? 1
  };
}

function locationFromTsNode(file: string, sourceFile: ts.SourceFile, node: ts.Node): CompileErrorLocation {
  const nodeSourceFile = node.getSourceFile() ?? sourceFile;
  const position = nodeSourceFile.getLineAndCharacterOfPosition(node.getStart(nodeSourceFile));
  return {
    file,
    line: position.line + 1,
    column: position.character + 1
  };
}

function locationFromOffset(file: string, source: string, offset: number): CompileErrorLocation {
  const lines = source.slice(0, offset).split(/\r?\n/);
  return {
    file,
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

export function resolveFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  if (ext) {
    return filePath;
  }
  const extensions = [".ts", ".js", ".vue", ".tsx", ".jsx", ".mjs", ".cjs"];
  for (const ext of extensions) {
    const candidate = filePath + ext;
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    for (const ext of extensions) {
      const candidate = path.join(filePath, "index" + ext);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return filePath;
}

export function fileUrl(file: string): string {
  return pathToFileURL(file).href;
}
