import type {
  AsyncDataResource,
  HeadEntry,
  ResuxAppLike,
  PageMeta,
  Ref,
  RouteContext,
  ResuxRouter,
  RuntimeConfig,
  SeoMetaInput
} from "./runtime/index.js";

interface ResuxModuleContext {
  rootDir: string;
  buildDir: string;
  options: Record<string, unknown>;
  addCss(href: string): void;
  addHead(head: Record<string, unknown>): void;
  addRouteRule(path: string, rule: Record<string, unknown>): void;
  extendRuntimeConfig(config: Record<string, unknown>): void;
}

type ResuxModule<TOptions = Record<string, unknown>> =
  | ((options: TOptions, context: ResuxModuleContext) => unknown | Promise<unknown>)
  | {
      defaults?: TOptions;
      setup: (options: TOptions, context: ResuxModuleContext) => unknown | Promise<unknown>;
    };

declare global {
  const useState: <T = unknown>(key: string, factory?: () => T) => Ref<T>;
  const useAsyncData: <T = unknown>(key: string, handler?: () => T | Promise<T>) => AsyncDataResource<T>;
  const useRoute: () => RouteContext;
  const useRouter: () => ResuxRouter;
  const useHead: (input: HeadEntry) => void;
  const useSeoMeta: (input: SeoMetaInput) => void;
  const useRuntimeConfig: () => RuntimeConfig;
  const useResuxApp: () => ResuxAppLike;
  const apiURL: (path: string) => string;
  const useFetch: <T = unknown>(url: string) => Promise<Ref<T>>;
  const $fetch: <T = unknown>(url: string) => Promise<T>;
  const onMounted: (callback: () => unknown | Promise<unknown>) => void;
  const definePageMeta: (_meta: PageMeta) => void;
  const defineResuxConfig: <T extends Record<string, unknown>>(config: T) => T;
  const defineResuxPlugin: (plugin: (resuxApp: ResuxAppLike) => unknown | Promise<unknown>) => (resuxApp: ResuxAppLike) => unknown | Promise<unknown>;
  const defineResuxRouteMiddleware: (
    middleware: (to: RouteContext, from: RouteContext) => unknown | Promise<unknown>
  ) => (to: RouteContext, from: RouteContext) => unknown | Promise<unknown>;
  const defineEventHandler: <T>(handler: T) => T;
  const eventHandler: <T>(handler: T) => T;
  const defineServerMiddleware: <T>(middleware: T) => T;
  const readBody: <T = unknown>(event: unknown) => Promise<T>;
  const getQuery: (event: unknown) => Record<string, string | string[]>;
  const setHeader: (event: unknown, name: string, value: number | string | string[]) => void;
  const navigateTo: (to: string, options?: { statusCode?: number }) => unknown;
  const abortNavigation: (message?: string, options?: { statusCode?: number }) => unknown;
  const defineResuxModule: <TOptions = Record<string, unknown>>(module: ResuxModule<TOptions>) => ResuxModule<TOptions>;
}

export {};
