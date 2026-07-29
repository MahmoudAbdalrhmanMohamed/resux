import type {
  AsyncDataResource,
  AsyncDataHandlerContext,
  ComputedRef,
  EventHandler,
  EventHandlerEvent,
  HeadEntry,
  MaybeRef,
  ResuxError,
  ResuxAppLike,
  ResuxConfigInput,
  ResuxLazyPackageLoader,
  ResuxLazyPackageOptions,
  ResuxModule,
  PageMeta,
  Ref,
  RouteContext,
  RouteMiddlewareResult,
  ResuxPlugin,
  ResuxRouteMiddleware,
  ResuxRouter,
  RuntimeConfig,
  ClientEnhancementSetup,
  PackageAdapterDefinition,
  UseClientEnhancementOptions,
  ResuxImageBuilder,
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
  const useResuxImage: () => ResuxImageBuilder;
  const apiURL: (path: string) => string;
  const useFetch: <T = unknown>(url: string, init?: RequestInit) => AsyncDataResource<T>;
  const $fetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
  const useError: () => Ref<ResuxError | null>;
  const clearError: () => void;
  const showError: (input: string | Partial<ResuxError>) => never;
  const createError: (input: string | Partial<ResuxError>) => ResuxError;
  const useLazyPackage: <T = unknown>(name: string, options?: ResuxLazyPackageOptions) => Promise<T>;
  const useClientPackage: <T = unknown>(name: string, options?: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode">) => Promise<T>;
  const usePackageReady: (name: string) => boolean;
  const defineLazyPackage: <T = unknown>(name: string, options?: ResuxLazyPackageOptions) => ResuxLazyPackageLoader<T>;
  const defineClientOnlyPackage: <T = unknown>(name: string, options?: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode">) => ResuxLazyPackageLoader<T>;
  const definePackageAdapter: <TOptions extends Record<string, unknown> = Record<string, unknown>>(
    definition: PackageAdapterDefinition<TOptions>
  ) => { name: string; setup: ClientEnhancementSetup };
  const defineClientEnhancement: (name: string, setup: ClientEnhancementSetup) => { name: string; setup: ClientEnhancementSetup };
  const useClientEnhancement: (name: string, options?: UseClientEnhancementOptions) => Promise<{ ready: boolean; activate: () => Promise<void>; dispose: () => Promise<void> }>;
  const onMounted: (callback: () => unknown | Promise<unknown>) => void;
  const onBeforeUnmount: (callback: () => unknown | Promise<unknown>) => void;
  const onUnmounted: (callback: () => unknown | Promise<unknown>) => void;
  const definePageMeta: (_meta: PageMeta) => void;
  const defineResuxConfig: <T extends ResuxConfigInput>(config: T) => T;
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
