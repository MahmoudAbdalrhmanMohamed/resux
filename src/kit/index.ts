import { AsyncLocalStorage } from "node:async_hooks";
import type {
  PagesExtender,
  ResuxComponentInput,
  ResuxComponentsDirInput,
  ResuxImportInput,
  ResuxModuleContext,
  ResuxPluginInput,
  ResuxRouteMiddlewareInput,
  ResuxServerHandlerInput,
  ResuxTemplateInput,
  ResuxTypeTemplateInput,
  ViteConfigExtender,
  NitroConfigExtender
} from "../core/module-container.js";

export interface ResuxModuleMeta {
  name?: string;
  configKey?: string;
}

export interface ResuxModuleDefinition<TOptions = Record<string, unknown>> {
  meta?: ResuxModuleMeta;
  defaults?: TOptions;
  setup: (options: TOptions, resux: ResuxModuleContext) => void | Promise<void>;
}

const kitContextStorage = new AsyncLocalStorage<ResuxModuleContext>();

export function withResuxKitContext<T>(context: ResuxModuleContext, run: () => Promise<T> | T): Promise<T> | T {
  return kitContextStorage.run(context, run);
}

export function defineResuxModule<TOptions = Record<string, unknown>>(module: ResuxModuleDefinition<TOptions>): ResuxModuleDefinition<TOptions> {
  return module;
}

export function addComponent(component: ResuxComponentInput | string): void {
  useContext("addComponent").addComponent(component);
}

export function addComponentsDir(dir: ResuxComponentsDirInput | string): void {
  useContext("addComponentsDir").addComponentsDir(dir);
}

export function addImports(imports: ResuxImportInput | ResuxImportInput[]): void {
  useContext("addImports").addImports(imports);
}

export function addImportsDir(dir: string): void {
  useContext("addImportsDir").addImportsDir(dir);
}

export function addPlugin(plugin: ResuxPluginInput | string): void {
  useContext("addPlugin").addPlugin(plugin);
}

export function addRouteMiddleware(middleware: ResuxRouteMiddlewareInput): void {
  useContext("addRouteMiddleware").addRouteMiddleware(middleware);
}

export function addServerHandler(handler: ResuxServerHandlerInput): void {
  useContext("addServerHandler").addServerHandler(handler);
}

export function addServerPlugin(plugin: string): void {
  useContext("addServerPlugin").addServerPlugin(plugin);
}

export function addTemplate(template: ResuxTemplateInput): void {
  useContext("addTemplate").addTemplate(template);
}

export function addTypeTemplate(template: ResuxTypeTemplateInput): void {
  useContext("addTypeTemplate").addTypeTemplate(template);
}

export function extendPages(extender: PagesExtender): void {
  useContext("extendPages").extendPages(extender);
}

export function extendRuntimeConfig(config: Record<string, unknown>): void {
  useContext("extendRuntimeConfig").extendRuntimeConfig(config);
}

export function extendViteConfig(extender: ViteConfigExtender): void {
  useContext("extendViteConfig").extendViteConfig(extender);
}

export function extendNitroConfig(extender: NitroConfigExtender): void {
  useContext("extendNitroConfig").extendNitroConfig(extender);
}

export function addVitePlugin(plugin: unknown): void {
  useContext("addVitePlugin").addVitePlugin(plugin);
}

export function addRouteRule(path: string, rule: Record<string, unknown>): void {
  useContext("addRouteRule").addRouteRule(path, rule);
}

export function addPrerenderRoutes(route: string | string[]): void {
  useContext("addPrerenderRoutes").addPrerenderRoutes(route);
}

function useContext(api: string): ResuxModuleContext {
  const context = kitContextStorage.getStore();
  if (!context) {
    throw new Error(`Resux Kit "${api}" was called outside of a module setup context.`);
  }
  return context;
}
