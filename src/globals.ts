import type {
  AsyncDataResource,
  AsyncDataHandlerContext,
  ComputedRef,
  EventHandler,
  EventHandlerEvent,
  HeadEntry,
  MaybeRef,
  ResuxAppLike,
  ResuxModule,
  PageMeta,
  Ref,
  RouteContext,
  RouteMiddlewareResult,
  ResuxPlugin,
  ResuxRouteMiddleware,
  ResuxRouter,
  RuntimeConfig,
  SeoMetaInput,
  ServerMiddleware,
  WatchCallback,
  WatchOptions,
  WatchSource,
  WatchStopHandle
} from "./runtime/index.js";

declare global {
  const useState: <T = unknown>(key: string, factory?: () => T) => Ref<T>;
  const useAsyncData: <T = unknown>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>) => AsyncDataResource<T>;
  const ref: <T = unknown>(value: T) => Ref<T>;
  const reactive: <T extends object>(value: T) => T;
  const computed: {
    <T>(getter: () => T): ComputedRef<T>;
    <T>(options: { get: () => T; set?: (value: T) => void }): ComputedRef<T>;
  };
  const watch: <T = unknown>(
    source: WatchSource<T> | WatchSource<T>[],
    callback: WatchCallback<T>,
    options?: WatchOptions
  ) => WatchStopHandle;
  const watchEffect: (
    effect: (onCleanup: (cleanup: () => void) => void) => void,
    options?: WatchOptions
  ) => WatchStopHandle;
  const readonly: <T>(value: T) => Readonly<T>;
  const toRef: <T extends object, K extends keyof T>(object: T, key: K, defaultValue?: T[K]) => Ref<T[K]>;
  const toRefs: <T extends object>(object: T) => { [K in keyof T]: Ref<T[K]> };
  const unref: <T>(value: MaybeRef<T>) => T;
  const isRef: (value: unknown) => value is Ref<unknown>;
  const isReactive: (value: unknown) => boolean;
  const isReadonly: (value: unknown) => boolean;
  const nextTick: <T = void>(fn?: () => T | PromiseLike<T>) => Promise<T | void>;
  const useRoute: () => RouteContext;
  const useRouter: () => ResuxRouter;
  const useHead: (input: HeadEntry) => void;
  const useSeoMeta: (input: SeoMetaInput) => void;
  const useRuntimeConfig: () => RuntimeConfig;
  const useResuxApp: () => ResuxAppLike;
  const apiURL: (path: string) => string;
  const useFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<Ref<T>>;
  const $fetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
  const onMounted: (callback: () => unknown | Promise<unknown>) => void;
  const definePageMeta: (_meta: PageMeta) => void;
  const defineResuxConfig: <T extends Record<string, unknown>>(config: T) => T;
  const defineResuxPlugin: (plugin: ResuxPlugin) => ResuxPlugin;
  const defineResuxRouteMiddleware: (middleware: ResuxRouteMiddleware) => ResuxRouteMiddleware;
  const defineEventHandler: (handler: EventHandler) => EventHandler;
  const eventHandler: (handler: EventHandler) => EventHandler;
  const defineServerMiddleware: (middleware: ServerMiddleware) => ServerMiddleware;
  const readBody: <T = unknown>(event: EventHandlerEvent) => Promise<T>;
  const getQuery: (event: EventHandlerEvent) => Record<string, string | string[]>;
  const setHeader: (event: EventHandlerEvent, name: string, value: number | string | string[]) => void;
  const navigateTo: (to: string, options?: { statusCode?: number }) => RouteMiddlewareResult;
  const abortNavigation: (message?: string, options?: { statusCode?: number }) => RouteMiddlewareResult;
  const defineResuxModule: <TOptions = Record<string, unknown>>(module: ResuxModule<TOptions>) => ResuxModule<TOptions>;
}

export {};
