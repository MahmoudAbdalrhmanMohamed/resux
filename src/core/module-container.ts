import type { ResuxHooks, ResuxHookName, ResuxHookPayloads } from "./hooks.js";

export type ResuxSupportMode = "all" | "server" | "client";

export interface ResuxTemplateInput {
  filename: string;
  getContents: () => string | Promise<string>;
  write?: boolean;
}

export interface ResuxTypeTemplateInput extends ResuxTemplateInput {}

export interface ResuxComponentInput {
  file: string;
  name?: string;
  global?: boolean;
  mode?: ResuxSupportMode;
  lazy?: boolean;
}

export interface ResuxComponentsDirInput {
  path: string;
  global?: boolean;
  mode?: ResuxSupportMode;
  pathPrefix?: boolean;
}

export interface ResuxImportInput {
  from: string;
  name: string;
  as?: string;
}

export interface ResuxPluginInput {
  src: string;
  mode?: ResuxSupportMode;
}

export interface ResuxRouteMiddlewareInput {
  name: string;
  src: string;
  global?: boolean;
  mode?: ResuxSupportMode;
}

export interface ResuxServerHandlerInput {
  route: string;
  handler: string;
  middleware?: boolean;
  method?: string;
}

export interface ResuxPrerenderRouteInput {
  route: string;
}

export type PagesExtender = (pages: Array<Record<string, unknown>>) => void | Promise<void>;
export type ViteConfigExtender = (config: Record<string, unknown>) => void | Promise<void>;
export type NitroConfigExtender = (config: Record<string, unknown>) => void | Promise<void>;

export interface ResuxModuleContributions {
  components: ResuxComponentInput[];
  componentDirs: ResuxComponentsDirInput[];
  imports: ResuxImportInput[];
  importDirs: string[];
  plugins: ResuxPluginInput[];
  middleware: ResuxRouteMiddlewareInput[];
  serverHandlers: ResuxServerHandlerInput[];
  serverPlugins: string[];
  templates: ResuxTemplateInput[];
  typeTemplates: ResuxTypeTemplateInput[];
  pagesExtenders: PagesExtender[];
  runtimeConfigExtends: Record<string, unknown>[];
  viteConfigExtenders: ViteConfigExtender[];
  nitroConfigExtenders: NitroConfigExtender[];
  vitePlugins: unknown[];
  routeRules: Array<{ path: string; rule: Record<string, unknown> }>;
  prerenderRoutes: ResuxPrerenderRouteInput[];
}

export interface ResuxModuleContext {
  rootDir: string;
  buildDir: string;
  options: Record<string, unknown>;
  addCss(href: string): void;
  addHead(head: Record<string, unknown>): void;
  addRouteRule(path: string, rule: Record<string, unknown>): void;
  extendRuntimeConfig(config: Record<string, unknown>): void;
  hook<K extends ResuxHookName>(name: K, handler: (payload: ResuxHookPayloads[K]) => void | Promise<void>): () => void;
  addComponent(component: ResuxComponentInput | string): void;
  addComponentsDir(dir: ResuxComponentsDirInput | string): void;
  addImports(imports: ResuxImportInput | ResuxImportInput[]): void;
  addImportsDir(dir: string): void;
  addPlugin(plugin: ResuxPluginInput | string): void;
  addRouteMiddleware(middleware: ResuxRouteMiddlewareInput): void;
  addServerHandler(handler: ResuxServerHandlerInput): void;
  addServerPlugin(plugin: string): void;
  addTemplate(template: ResuxTemplateInput): void;
  addTypeTemplate(template: ResuxTypeTemplateInput): void;
  extendPages(extender: PagesExtender): void;
  extendViteConfig(extender: ViteConfigExtender): void;
  extendNitroConfig(extender: NitroConfigExtender): void;
  addVitePlugin(plugin: unknown): void;
  addPrerenderRoutes(route: string | string[]): void;
}

export class ResuxModuleContainer {
  readonly contributions: ResuxModuleContributions = {
    components: [],
    componentDirs: [],
    imports: [],
    importDirs: [],
    plugins: [],
    middleware: [],
    serverHandlers: [],
    serverPlugins: [],
    templates: [],
    typeTemplates: [],
    pagesExtenders: [],
    runtimeConfigExtends: [],
    viteConfigExtenders: [],
    nitroConfigExtenders: [],
    vitePlugins: [],
    routeRules: [],
    prerenderRoutes: []
  };

  createContext(
    config: Record<string, unknown>,
    rootDir: string,
    buildDir: string,
    hooks: ResuxHooks
  ): ResuxModuleContext {
    return {
      rootDir,
      buildDir,
      options: config,
      addCss: (href) => {
        const css = Array.isArray(config.css) ? config.css : [];
        if (!css.includes(href)) {
          css.push(href);
        }
        config.css = css;
      },
      addHead: (head) => {
        const app = isObject(config.app) ? config.app : {};
        const current = isObject(app.head) ? app.head : {};
        app.head = mergeHead(current, head);
        config.app = app;
      },
      addRouteRule: (path, rule) => {
        if (!path.startsWith("/")) {
          throw new Error(`Route rules need an absolute path. Received "${path}".`);
        }
        const routeRules = isObject(config.routeRules) ? config.routeRules : {};
        const current = isObject(routeRules[path]) ? routeRules[path] : {};
        const merged = {
          ...current,
          ...rule,
          headers: {
            ...(isObject(current.headers) ? current.headers : {}),
            ...(isObject(rule.headers) ? rule.headers : {})
          }
        };
        routeRules[path] = merged;
        config.routeRules = routeRules;
        this.contributions.routeRules.push({ path, rule: merged });
      },
      extendRuntimeConfig: (runtimeConfig) => {
        this.contributions.runtimeConfigExtends.push(runtimeConfig);
        const current = isObject(config.runtimeConfig) ? config.runtimeConfig : {};
        config.runtimeConfig = deepMergeObjects(current, runtimeConfig);
      },
      hook: (name, handler) => hooks.hook(name, handler),
      addComponent: (component) => {
        if (typeof component === "string") {
          this.contributions.components.push({ file: component });
          return;
        }
        this.contributions.components.push(component);
      },
      addComponentsDir: (dir) => {
        if (typeof dir === "string") {
          this.contributions.componentDirs.push({ path: dir });
          return;
        }
        this.contributions.componentDirs.push(dir);
      },
      addImports: (imports) => {
        const list = Array.isArray(imports) ? imports : [imports];
        this.contributions.imports.push(...list);
      },
      addImportsDir: (dir) => {
        this.contributions.importDirs.push(dir);
      },
      addPlugin: (plugin) => {
        if (typeof plugin === "string") {
          this.contributions.plugins.push({ src: plugin, mode: "all" });
          return;
        }
        this.contributions.plugins.push({ mode: "all", ...plugin });
      },
      addRouteMiddleware: (middleware) => {
        this.contributions.middleware.push(middleware);
      },
      addServerHandler: (handler) => {
        this.contributions.serverHandlers.push(handler);
      },
      addServerPlugin: (plugin) => {
        this.contributions.serverPlugins.push(plugin);
      },
      addTemplate: (template) => {
        this.contributions.templates.push(template);
      },
      addTypeTemplate: (template) => {
        this.contributions.typeTemplates.push(template);
      },
      extendPages: (extender) => {
        this.contributions.pagesExtenders.push(extender);
      },
      extendViteConfig: (extender) => {
        this.contributions.viteConfigExtenders.push(extender);
      },
      extendNitroConfig: (extender) => {
        this.contributions.nitroConfigExtenders.push(extender);
      },
      addVitePlugin: (plugin) => {
        this.contributions.vitePlugins.push(plugin);
      },
      addPrerenderRoutes: (route) => {
        const list = Array.isArray(route) ? route : [route];
        for (const item of list) {
          this.contributions.prerenderRoutes.push({ route: item });
        }
      }
    };
  }
}

function mergeHead(current: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  return {
    ...current,
    ...next,
    meta: mergeHeadArray(current.meta, next.meta),
    link: mergeHeadArray(current.link, next.link),
    style: mergeHeadArray(current.style, next.style),
    script: mergeHeadArray(current.script, next.script),
    noscript: mergeHeadArray(current.noscript, next.noscript),
    htmlAttrs: {
      ...(isObject(current.htmlAttrs) ? current.htmlAttrs : {}),
      ...(isObject(next.htmlAttrs) ? next.htmlAttrs : {}),
    },
    bodyAttrs: {
      ...(isObject(current.bodyAttrs) ? current.bodyAttrs : {}),
      ...(isObject(next.bodyAttrs) ? next.bodyAttrs : {}),
    },
  };
}

function mergeHeadArray(current: unknown, next: unknown): unknown[] {
  return [
    ...(Array.isArray(current) ? current : []),
    ...(Array.isArray(next) ? next : []),
  ];
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function deepMergeObjects(base: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(next)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) {
      throw new Error(`Runtime config contains unsafe key "${key}".`);
    }
    const current = Object.hasOwn(output, key)
      ? output[key]
      : undefined;
    output[key] = isObject(current) && isObject(value)
      ? deepMergeObjects(current, value)
      : value;
  }
  return output;
}
