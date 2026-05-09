import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NodeTypes, parse as parseTemplate, type AttributeNode, type DirectiveNode, type ElementNode, type Node as VueCompilerNode, type SimpleExpressionNode, type TemplateChildNode } from "@vue/compiler-dom";
import { compileStyle, parse as parseSfc, type SFCStyleBlock } from "@vue/compiler-sfc";
import vuePlugin from "@vitejs/plugin-vue";
import ts from "typescript";
import { build as viteBuild } from "vite";
import { getClientRuntimeSource, type ComponentStyle, type ElementTemplateNode, type PageMeta, type TemplateAttribute, type TemplateEvent, type TemplateNode } from "../runtime/index.js";

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
}

interface ScriptAnalysis {
  setupBody: string;
  imports: string;
  bindings: string[];
  handlerNames: Set<string>;
  resumableBindings: Set<string>;
  templateRefBindings: Set<string>;
  handlers: Map<string, ts.Node>;
  sourceFile: ts.SourceFile;
  pageMeta?: PageMeta;
}

interface CompileTemplateState {
  file: string;
  templateRefBindings: Set<string>;
  bindingIndex: number;
  inlineHandlerIndex: number;
  handlers: TemplateEvent[];
  inlineHandlers: GeneratedHandler[];
}

interface GeneratedHandler {
  name: string;
  source: string;
}

type ResuxConfig = Record<string, unknown> & {
  app?: { head?: unknown };
  css?: unknown;
  modules?: unknown;
  deploy?: {
    target?: "auto" | "node" | "vercel" | "netlify" | "cloudflare" | "static";
    nitroPreset?: string;
  };
  routeRules?: Record<string, RouteRuleConfig>;
  runtimeConfig?: Record<string, unknown>;
};

interface ResuxModuleContext {
  rootDir: string;
  buildDir: string;
  options: ResuxConfig;
  addCss(href: string): void;
  addHead(head: Record<string, unknown>): void;
  addRouteRule(path: string, rule: RouteRuleConfig): void;
  extendRuntimeConfig(config: Record<string, unknown>): void;
}

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
  "useAsyncData",
  "useRoute",
  "useRouter",
  "useHead",
  "useSeoMeta",
  "useRuntimeConfig",
  "useResuxApp",
  "useResuxImage",
  "apiURL",
  "useFetch",
  "$fetch",
  "onMounted",
  "definePageMeta",
  "defineProps"
]);

export async function buildProject(appRoot: string, outDir = path.join(appRoot, ".resux"), options: BuildOptions = {}): Promise<BuildResult> {
  const absoluteRoot = path.resolve(appRoot);
  const absoluteOut = path.resolve(outDir);
  const buildOptions = {
    vite: options.vite ?? "build",
    server: options.server ?? (options.vite === "dev" ? "modules" : "bundle")
  };
  await cleanGeneratedOutput(absoluteOut);
  await mkdir(path.join(absoluteOut, "server"), { recursive: true });
  await mkdir(path.join(absoluteOut, "server", "resux-plugins"), { recursive: true });
  await mkdir(path.join(absoluteOut, "server", "resux-middleware"), { recursive: true });
  await mkdir(path.join(absoluteOut, "server", "request-middleware"), { recursive: true });
  await mkdir(path.join(absoluteOut, "server", "handlers"), { recursive: true });
  await mkdir(path.join(absoluteOut, "server", "config-modules"), { recursive: true });
  await mkdir(path.join(absoluteOut, "client", "handlers"), { recursive: true });
  await mkdir(path.join(absoluteOut, "client", "vue-islands"), { recursive: true });
  await mkdir(path.join(absoluteOut, "client", "plugins"), { recursive: true });
  await mkdir(path.join(absoluteOut, "client", "middleware"), { recursive: true });
  await mkdir(path.join(absoluteOut, "vite-client", "handlers"), { recursive: true });
  await mkdir(path.join(absoluteOut, "vite-client", "vue-islands"), { recursive: true });
  await mkdir(path.join(absoluteOut, "vite-client", "plugins"), { recursive: true });
  await mkdir(path.join(absoluteOut, "vite-client", "middleware"), { recursive: true });

  const runtimeConfig = await readRuntimeConfig(absoluteRoot, absoluteOut);
  const routeRules = createRouteRules(runtimeConfig);
  const componentFiles = await discoverAppVueFiles(absoluteRoot, "components");
  const pageFiles = await discoverAppVueFiles(absoluteRoot, "pages");
  const layoutFiles = await discoverAppVueFiles(absoluteRoot, "layouts");
  const appFile = await optionalFile(path.join(absoluteRoot, "app.vue"))
    ?? await optionalFile(path.join(absoluteRoot, "app", "app.vue"));
  const errorFile = await optionalFile(path.join(absoluteRoot, "error.vue"))
    ?? await optionalFile(path.join(absoluteRoot, "app", "error.vue"));
  const pluginFiles = await discoverSupportTsFiles(absoluteRoot, "plugins");
  const middlewareFiles = await discoverSupportTsFiles(absoluteRoot, "middleware");
  const serverMiddlewareFiles = await discoverSupportTsFiles(absoluteRoot, path.join("server", "middleware"));
  const serverHandlerFiles = [
    ...await discoverServerFiles(path.join(absoluteRoot, "server", "api"), "/api"),
    ...await discoverServerFiles(path.join(absoluteRoot, "server", "routes"), "")
  ];
  const vueIslands = await discoverVueIslands(absoluteRoot);
  const allFiles = [...componentFiles, ...layoutFiles, ...pageFiles, ...(appFile ? [appFile] : []), ...(errorFile ? [errorFile] : [])];
  const idByFile = new Map<string, string>();
  const compiledByFile = new Map<string, CompiledComponent>();
  let index = 0;

  for (const file of allFiles) {
    idByFile.set(file, `m${index++}`);
  }

  for (const file of allFiles) {
    const component = await compileVueFile(file, {
      id: idByFile.get(file)!,
      name: inferComponentName(absoluteRoot, file)
    });
    compiledByFile.set(file, component);
    await writeFile(path.join(absoluteOut, "server", `${component.id}.mjs`), component.serverSource, "utf8");
    await writeFile(path.join(absoluteOut, "vite-client", "handlers", `${component.id}.mjs`), component.clientSource, "utf8");
  }

  const routes = createRouteManifest(absoluteRoot, pageFiles, idByFile, compiledByFile);
  const components = allFiles.map((file) => compiledByFile.get(file)!);
  const layouts = layoutFiles.map((file) => compiledByFile.get(file)!);
  const plugins = pluginFiles.map((file, pluginIndex) => compilePluginFile(file, pluginIndex));
  const middleware = middlewareFiles.map((file, middlewareIndex) => compileMiddlewareFile(file, middlewareIndex));
  const serverMiddleware = serverMiddlewareFiles.map((file, middlewareIndex) => compileServerMiddlewareFile(file, middlewareIndex));
  const serverHandlers = serverHandlerFiles.map((record, handlerIndex) => compileServerHandlerFile(record.file, handlerIndex, record.path));
  const app = appFile ? compiledByFile.get(appFile) : undefined;
  const error = errorFile ? compiledByFile.get(errorFile) : undefined;

  for (const plugin of plugins) {
    if (plugin.mode !== "client") {
      await writeFile(path.join(absoluteOut, "server", "resux-plugins", `${plugin.id}.mjs`), plugin.serverSource, "utf8");
    }
    if (plugin.mode !== "server") {
      await writeFile(path.join(absoluteOut, "vite-client", "plugins", `${plugin.id}.mjs`), plugin.clientSource, "utf8");
    }
  }

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

  if (buildOptions.vite === "dev") {
    await writeViteClientRuntime(absoluteOut);
  } else {
    await buildClientAssets(absoluteRoot, absoluteOut, components, plugins, middleware, vueIslands);
  }
  await writeFile(
    path.join(absoluteOut, "server", "manifest.mjs"),
    createServerManifestSource(routes, components, layouts, plugins, middleware, serverMiddleware, serverHandlers, vueIslands, app, error, runtimeConfig, buildOptions),
    "utf8"
  );
  if (buildOptions.server === "bundle") {
    await buildServerBundle(absoluteRoot, absoluteOut);
  }
  await writeFile(path.join(absoluteOut, "manifest.json"), JSON.stringify({
    routes,
    components: components.map(({ id, name, file, handlers, styles, styleScopeId, meta }) => ({ id, name, file, handlers, styles, styleScopeId, meta })),
    layouts: layouts.map(({ id, name, file, styles, styleScopeId }) => ({ id, name, file, styles, styleScopeId })),
    plugins: plugins.map(({ id, file, mode }) => ({ id, file, mode })),
    middleware: middleware.map(({ id, name, file, global, mode }) => ({ id, name, file, global, mode })),
    serverMiddleware: serverMiddleware.map(({ id, file }) => ({ id, file })),
    serverHandlers: serverHandlers.map(({ id, path: routePath, file, params }) => ({ id, path: routePath, file, params })),
    vueIslands,
    app: app?.id,
    error: error?.id,
    runtimeConfig,
    routeRules,
    features: buildOptions
  }, null, 2), "utf8");

  return {
    appRoot: absoluteRoot,
    outDir: absoluteOut,
    routes,
    components,
    layouts,
    plugins,
    middleware,
    serverMiddleware,
    serverHandlers,
    vueIslands,
    routeRules,
    app,
    error
  };
}

async function cleanGeneratedOutput(outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await rm(path.join(outDir, "server"), { recursive: true, force: true });
  await rm(path.join(outDir, "server-bundle"), { recursive: true, force: true });
  await rm(path.join(outDir, "client"), { recursive: true, force: true });
  await rm(path.join(outDir, "vite-client"), { recursive: true, force: true });
  await rm(path.join(outDir, "manifest.json"), { force: true });
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
          external: ["resuxjs/runtime"],
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
  vueIslands: VueIslandRecord[]
): Promise<void> {
  const inputRoot = path.join(outDir, "vite-client");
  const runtimeInput = await writeViteClientRuntime(outDir);

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
    await viteBuild({
      root,
      configFile: false,
      publicDir: false,
      appType: "custom",
      clearScreen: false,
      logLevel: "warn",
      plugins: [vuePlugin()],
      resolve: {
        alias: {
          vue: require.resolve("vue")
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
          external: (id) => id === "/__resux/runtime-client.mjs",
          output: {
            format: "es",
            entryFileNames: "[name].mjs",
            chunkFileNames: "chunks/[name]-[hash].mjs",
            assetFileNames: "assets/[name]-[hash][extname]"
          }
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Vite client build failed. Ensure vite is installed. ${message}`);
  } finally {
    await rm(inputRoot, { recursive: true, force: true });
  }
}

async function writeViteClientRuntime(outDir: string): Promise<string> {
  const runtimeInput = path.join(outDir, "vite-client", "runtime-client.mjs");
  await writeFile(runtimeInput, getClientRuntimeSource(), "utf8");
  return runtimeInput;
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
  validateTemplateHandlers(template.handlers, analysis, options.file, source);
  const serverSource = createComponentModuleSource({
    id: options.id,
    name: options.name,
    file: options.file,
    template: template.nodes,
    analysis,
    styles: compiledStyles.styles,
    styleScopeId: compiledStyles.styleScopeId,
    client: false
  });
  const clientSource = createComponentModuleSource({
    id: options.id,
    name: options.name,
    file: options.file,
    template: template.nodes,
    analysis,
    styles: compiledStyles.styles,
    styleScopeId: compiledStyles.styleScopeId,
    client: true
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
    meta: analysis.pageMeta
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

function compileTemplate(
  template: string,
  file: string,
  templateRefBindings: Set<string> = new Set()
): { nodes: TemplateNode[]; handlers: TemplateEvent[]; inlineHandlers: GeneratedHandler[] } {
  const ast = parseTemplate(template, { comments: false });
  const state: CompileTemplateState = {
    file,
    templateRefBindings,
    bindingIndex: 0,
    inlineHandlerIndex: 0,
    handlers: [],
    inlineHandlers: []
  };

  return {
    nodes: ast.children.map((child) => compileTemplateNode(child, state)).filter(Boolean) as TemplateNode[],
    handlers: state.handlers,
    inlineHandlers: state.inlineHandlers
  };
}

function expressionContent(node: unknown): string {
  if (node && typeof node === "object" && "content" in node && typeof node.content === "string") {
    return node.content;
  }
  return "";
}

function compileTemplateNode(node: TemplateChildNode, state: CompileTemplateState): TemplateNode | null {
  if (node.type === NodeTypes.TEXT) {
    return {
      type: "text",
      value: node.content
    };
  }

  if (node.type === NodeTypes.INTERPOLATION) {
    return {
      type: "interpolation",
      expression: transformTemplateExpression(expressionContent(node.content), state.templateRefBindings, state.file, node),
      bindingId: nextBindingId(state)
    };
  }

  if (node.type !== NodeTypes.ELEMENT) {
    return null;
  }

  const attrs: TemplateAttribute[] = [];
  const events: TemplateEvent[] = [];
  const element: ElementTemplateNode = {
    type: "element",
    tag: node.tag,
    attrs,
    events,
    children: node.children.map((child) => compileTemplateNode(child, state)).filter(Boolean) as TemplateNode[]
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
        value: transformTemplateExpression(expression, state.templateRefBindings, state.file, prop),
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
      const handler = /^[A-Za-z_$][\w$]*$/.test(expression)
        ? expression
        : createInlineEventHandler(expression, state);
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
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-if needs an expression.", locationFromVueNode(state.file, prop));
      }
      element.if = {
        expression: transformTemplateExpression(expression, state.templateRefBindings, state.file, prop),
        blockId: nextBindingId(state)
      };
      continue;
    }

    if (prop.name === "for") {
      const expression = expressionContent(prop.exp);
      if (!expression) {
        throw new ResuxCompileError("v-for needs an expression.", locationFromVueNode(state.file, prop));
      }
      element.for = parseForExpression(expression, state.file, prop, state);
      element.for.source = transformTemplateExpression(element.for.source, state.templateRefBindings, state.file, prop);
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
        value: `!(${transformTemplateExpression(expression, state.templateRefBindings, state.file, prop)})`,
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
        expression: transformTemplateExpression(expression, state.templateRefBindings, state.file, prop),
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
        expression: transformTemplateExpression(expression, state.templateRefBindings, state.file, prop),
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
        value: transformTemplateExpression(model.value, state.templateRefBindings, state.file, prop),
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

    throw new ResuxCompileError(`v-${prop.name} is not supported in the v1 compiler.`, locationFromVueNode(state.file, prop));
  }

  return element;
}

function createInlineEventHandler(expression: string, state: CompileTemplateState): string {
  const name = nextInlineHandlerName(state);
  state.inlineHandlers.push({
    name,
    source: `function ${name}($event) {\n${expression}\n}`
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
    source: `function ${handler}($event) {\n${assignment}\n}`
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

function transformTemplateExpression(
  expression: string,
  templateRefBindings: Set<string>,
  file: string,
  node: VueCompilerNode
): string {
  if (templateRefBindings.size === 0) {
    return expression;
  }

  const wrapped = `(${expression})`;
  const sourceFile = ts.createSourceFile(`${file}?template-expression`, wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (((sourceFile as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics ?? []).length > 0) {
    throw new ResuxCompileError("Template expression is not valid JavaScript.", locationFromVueNode(file, node));
  }

  const insertions: number[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current) && templateRefBindings.has(current.text) && shouldAutoUnwrapTemplateIdentifier(current)) {
      const position = current.end - 1;
      if (position >= 0 && position <= expression.length) {
        insertions.push(position);
      }
    }

    ts.forEachChild(current, visit);
  };

  visit(sourceFile);
  if (insertions.length === 0) {
    return expression;
  }

  const uniqueInsertions = [...new Set(insertions)].sort((a, b) => b - a);
  let transformed = expression;
  for (const position of uniqueInsertions) {
    transformed = `${transformed.slice(0, position)}.value${transformed.slice(position)}`;
  }
  return transformed;
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

function analyzeScript(script: string, file: string, inlineHandlers: GeneratedHandler[] = []): ScriptAnalysis {
  const sourceFile = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: string[] = [];
  const body: string[] = [];
  const bindings = new Set<string>();
  const handlerNames = new Set<string>();
  const resumableBindings = new Set<string>();
  const templateRefBindings = inferTemplateRefBindings(script, file);
  const handlers = new Map<string, ts.Node>();
  let pageMeta: PageMeta | undefined;

  for (const statement of sourceFile.statements) {
    const text = statement.getFullText(sourceFile);
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
      imports.push(text);
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
          if (isResumableInitializer(declaration.initializer)) {
            resumableBindings.add(declaration.name.text);
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
    setupBody: body.join("\n"),
    bindings: [...bindings],
    handlerNames,
    resumableBindings,
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
    return ["ref", "computed", "toRef", "useState", "useAsyncData", "useFetch", "useResuxImage"].includes(name);
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

function validateTemplateHandlers(events: TemplateEvent[], analysis: ScriptAnalysis, file: string, fullSource: string): void {
  for (const event of events) {
    if (!analysis.handlerNames.has(event.handler)) {
      throw new ResuxCompileError(`Handler "${event.handler}" must be a top-level function or arrow function.`, locationFromOffset(file, fullSource, 0));
    }

    const handlerNode = analysis.handlers.get(event.handler);
    if (!handlerNode) {
      continue;
    }

    const unsupportedCapture = findUnsupportedCapture(handlerNode, event.handler, analysis);
    if (unsupportedCapture) {
      throw new ResuxCompileError(
        `Handler "${event.handler}" captures "${unsupportedCapture}", which is not resumable in Resux.`,
        locationFromTsNode(file, analysis.sourceFile, handlerNode)
      );
    }
  }
}

function findUnsupportedCapture(node: ts.Node, handlerName: string, analysis: ScriptAnalysis): string | null {
  const locals = new Set<string>([handlerName, "event"]);
  const allowedTopLevel = new Set([...analysis.resumableBindings]);

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
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
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
      "defineProps"
    ].includes(node.expression.text);
  }
  if (ts.isAwaitExpression(node) && ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
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
}): string {
  const importPath = options.client ? "/__resux/runtime-client.mjs" : "resuxjs/runtime";
  const factory = options.client ? "createClientComponent" : "defineComponent";
  const source = [
    `import { ${factory} } from ${JSON.stringify(importPath)};`,
    options.analysis.imports,
    `const __template = ${JSON.stringify(options.template, null, 2)};`,
    `async function __rx_setup(__ctx) {`,
    `const { ref, reactive, computed, watch, watchEffect, readonly, toRef, toRefs, unref, isRef, isReactive, isReadonly, nextTick, useState, useAsyncData, useRoute, useRouter, useHead, useSeoMeta, useRuntimeConfig, useResuxApp, useResuxImage, apiURL, useFetch, $fetch, onMounted, definePageMeta, defineProps } = __ctx;`,
    options.analysis.setupBody,
    `return { ${options.analysis.bindings.join(", ")} };`,
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

function createRuntimeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const runtimeConfig = (config as ResuxConfig).runtimeConfig;
  return {
    ...(runtimeConfig ?? {}),
    public: {
      ...((runtimeConfig?.public && typeof runtimeConfig.public === "object" && !Array.isArray(runtimeConfig.public))
        ? runtimeConfig.public as Record<string, unknown>
        : {})
    }
  };
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
    serverSource: transpileSupportModule(file, `import { defineResuxPlugin } from "resuxjs/runtime";\n`),
    clientSource: transpileSupportModule(file, `import { defineResuxPlugin } from "/__resux/runtime-client.mjs";\n`)
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

function transpileSupportModule(file: string, prefix = ""): string {
  const source = ts.sys.readFile(file) ?? "";
  return ts.transpileModule(`${prefix}${source}`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  }).outputText;
}

async function readRuntimeConfig(root: string, outDir: string): Promise<Record<string, unknown>> {
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
    await applyConfiguredModules(config, root, outDir);
    delete config.modules;
    await writeFile(outputFile, `export default ${JSON.stringify(config, null, 2)};`, "utf8");
    return config;
  }

  return {};
}

function normalizeConfigHelpers(source: string): string {
  return source
    .replace(/\bdefineResuxConfig\s*\(/g, "(")
    .replace(/\bdefineResuxModule\s*\(/g, "(");
}

async function applyConfiguredModules(config: ResuxConfig, root: string, outDir: string): Promise<void> {
  const modules = Array.isArray(config.modules) ? config.modules : [];
  const context = createModuleContext(config, root, outDir);

  for (const moduleEntry of modules) {
    const { module, options } = await resolveModuleEntry(moduleEntry, root, outDir);
    const setup = getModuleSetup(module);
    await setup(createModuleOptions(module, options), context);
  }
}

function createModuleContext(config: ResuxConfig, root: string, outDir: string): ResuxModuleContext {
  return {
    rootDir: root,
    buildDir: outDir,
    options: config,
    addCss(href: string): void {
      config.css = [...(Array.isArray(config.css) ? config.css : []), href];
    },
    addHead(head: Record<string, unknown>): void {
      const app = config.app && typeof config.app === "object" ? config.app : {};
      const currentHead = app.head && typeof app.head === "object" ? app.head as Record<string, unknown> : {};
      app.head = mergeHeadConfig(currentHead, head);
      config.app = app;
    },
    addRouteRule(routePath: string, rule: RouteRuleConfig): void {
      if (!routePath.startsWith("/")) {
        throw new Error(`Route rules need an absolute path. Received "${routePath}".`);
      }
      config.routeRules = {
        ...(config.routeRules ?? {}),
        [routePath]: {
          ...(config.routeRules?.[routePath] ?? {}),
          ...rule,
          headers: {
            ...(config.routeRules?.[routePath]?.headers ?? {}),
            ...(rule.headers ?? {})
          }
        }
      };
    },
    extendRuntimeConfig(runtimeConfig: Record<string, unknown>): void {
      config.runtimeConfig = deepMerge(config.runtimeConfig ?? {}, runtimeConfig);
    }
  };
}

function mergeHeadConfig(current: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  return {
    ...current,
    ...next,
    meta: [
      ...(Array.isArray(current.meta) ? current.meta : []),
      ...(Array.isArray(next.meta) ? next.meta : [])
    ],
    link: [
      ...(Array.isArray(current.link) ? current.link : []),
      ...(Array.isArray(next.link) ? next.link : [])
    ]
  };
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

const builtinModules: Record<string, BuiltinResuxModule> = {
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

async function discoverSupportTsFiles(root: string, dirName: string): Promise<string[]> {
  const dirs = [path.join(root, dirName), path.join(root, "app", dirName)];
  const files: string[] = [];

  for (const dir of dirs) {
    files.push(...await discoverSupportTsFilesInDir(dir));
  }

  return unique(files).sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
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

function inferComponentName(root: string, file: string): string {
  const relative = normalizePath(path.relative(root, file));
  if (relative === "app.vue") {
    return "App";
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

export function fileUrl(file: string): string {
  return pathToFileURL(file).href;
}
