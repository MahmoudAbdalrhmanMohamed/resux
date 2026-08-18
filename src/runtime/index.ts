import { getQuery as h3GetQuery, readBody as h3ReadBody, setHeader as h3SetHeader } from "h3";
import {
  buildLocalePath,
  normalizeI18nRuntimeConfig,
  resolveI18nRoute,
  resolveLocaleDirection,
  resolveLocalizedValue,
  translateRaw,
  translateText
} from "../i18n/shared.js";
import {
  computed,
  isReactive,
  isReadonly,
  isRef,
  nextTick,
  reactive,
  readonly,
  ref,
  toRef,
  toRefs,
  unref,
  watch,
  watchEffect
} from "../reactivity/index.js";
import type { ComputedRef, Ref, WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from "../reactivity/index.js";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  readonly,
  toRef,
  toRefs,
  unref,
  isRef,
  isReactive,
  isReadonly,
  nextTick
};
export type {
  Ref,
  ComputedRef,
  MaybeRef,
  MaybeRefOrGetter,
  WatchSource,
  WatchOptions,
  WatchCallback,
  WatchStopHandle,
  ReactiveEffectOptions,
  ReactiveEffectRunner
} from "../reactivity/index.js";

export interface AsyncDataError {
  name: string;
  message: string;
}

export interface ResuxError extends Error {
  statusCode?: number;
  fatal?: boolean;
  data?: JsonValue;
}

export interface AsyncDataResource<T = unknown> {
  data: Ref<T | undefined>;
  value: Ref<T | undefined>;
  pending: Ref<boolean>;
  error: Ref<AsyncDataError | null>;
  then<TResult1 = AwaitedAsyncDataResource<T>, TResult2 = never>(
    onfulfilled?: ((value: AwaitedAsyncDataResource<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>;
}

export interface AwaitedAsyncDataResource<T = unknown> {
  data: Ref<T | undefined>;
  value: Ref<T | undefined>;
  pending: Ref<boolean>;
  error: Ref<AsyncDataError | null>;
}

export interface AsyncDataHandlerContext {
  signal?: AbortSignal;
}

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  origin?: string;
  userAgent?: string;
}

export interface ResuxRouter {
  push(to: string): Promise<void> | void;
  replace(to: string): Promise<void> | void;
  back(): void;
  forward(): void;
  go(delta: number): void;
}

export interface PageMeta {
  layout?: string | false;
  middleware?: string | string[];
  title?: string | Record<string, string>;
  meta?: Array<Record<string, string>>;
}

export interface HeadEntry {
  title?: string;
  meta?: Array<Record<string, string>>;
  link?: Array<Record<string, string>>;
  style?: ComponentStyle[];
  htmlAttrs?: Record<string, string>;
}

export interface ComponentStyle {
  id: string;
  css: string;
  scoped?: boolean;
}

export type SeoMetaValue = string | number | boolean | null | undefined;

export interface SeoMetaInput {
  title?: SeoMetaValue;
  description?: SeoMetaValue | SeoMetaValue[];
  keywords?: SeoMetaValue | SeoMetaValue[];
  robots?: SeoMetaValue;
  author?: SeoMetaValue;
  themeColor?: SeoMetaValue;
  colorScheme?: SeoMetaValue;
  applicationName?: SeoMetaValue;
  referrer?: SeoMetaValue;
  generator?: SeoMetaValue;
  ogTitle?: SeoMetaValue;
  ogDescription?: SeoMetaValue;
  ogImage?: SeoMetaValue | SeoMetaValue[];
  ogImageSecureUrl?: SeoMetaValue;
  ogImageAlt?: SeoMetaValue;
  ogImageWidth?: SeoMetaValue;
  ogImageHeight?: SeoMetaValue;
  ogUrl?: SeoMetaValue;
  ogType?: SeoMetaValue;
  ogSiteName?: SeoMetaValue;
  ogLocale?: SeoMetaValue;
  fbAppId?: SeoMetaValue;
  twitterCard?: SeoMetaValue;
  twitterTitle?: SeoMetaValue;
  twitterDescription?: SeoMetaValue;
  twitterImage?: SeoMetaValue | SeoMetaValue[];
  twitterImageAlt?: SeoMetaValue;
  twitterSite?: SeoMetaValue;
  twitterCreator?: SeoMetaValue;
  twitterUrl?: SeoMetaValue;
  [key: string]: SeoMetaValue | SeoMetaValue[];
}

export interface RuntimeConfig {
  public: Record<string, JsonValue>;
  [key: string]: unknown;
}

export type ResuxImageFit =
  | "cover"
  | "contain"
  | "fill"
  | "inside"
  | "outside";

export type ResuxImageCacheInput =
  | boolean
  | string
  | number
  | {
      maxAge?: number | string;
      expiresIn?: number | string;
      ttl?: number | string;
    };

export interface ResuxImageModifiers {
  width?: number;
  height?: number;
  quality?: number | false;
  format?: string | false;
  fit?: ResuxImageFit;
  [key: string]: string | number | boolean | undefined;
}

export interface ResuxImageProviderConfig {
  baseURL?: string;
  modifiers?: ResuxImageModifiers;
}

export interface ResuxImageConfig {
  provider?: string;
  quality?: number;
  format?: string;
  cache?: ResuxImageCacheInput;
  densities?: number[];
  providers?: Record<string, ResuxImageProviderConfig>;
}

export interface UseResuxImageOptions {
  provider?: string;
  modifiers?: ResuxImageModifiers;
  width?: number;
  height?: number;
  quality?: number;
  fit?: ResuxImageFit;
  format?: string;
  cache?: ResuxImageCacheInput;
}

export type ResuxImageBuilder = (
  src: string,
  options?: UseResuxImageOptions,
) => string;

export interface ResuxAppInjections {}

export type ResuxSupportMode = "all" | "server" | "client";

export interface ClientPluginManifestRecord {
  id: string;
  file: string;
  mode: ResuxSupportMode;
  src: string;
}

export interface ClientRouteMiddlewareManifestRecord {
  id: string;
  name: string;
  file: string;
  global: boolean;
  mode: ResuxSupportMode;
  src: string;
}

export type ResuxAppProvides = ResuxAppInjections & Record<string, unknown>;

export interface ResuxAppLike {
  route: RouteContext;
  payload: ResuxPayload;
  $config: RuntimeConfig;
  provides: ResuxAppProvides;
  provide<Key extends keyof ResuxAppInjections & string>(key: Key, value: ResuxAppInjections[Key]): void;
  provide<Key extends string, Value>(key: Key, value: Value): void;
  vueApp?: any;
}

export type ResuxPlugin = (resuxApp: ResuxAppLike) => unknown | Promise<unknown>;

export interface ResuxModuleContext {
  rootDir: string;
  buildDir: string;
  options: Record<string, unknown>;
  addCss(href: string): void;
  addHead(head: Record<string, unknown>): void;
  addRouteRule(path: string, rule: Record<string, unknown>): void;
  extendRuntimeConfig(config: Record<string, unknown>): void;
  hook(name: string, handler: (payload: unknown) => void | Promise<void>): () => void;
  addComponent(component: string | { file: string; name?: string; global?: boolean; mode?: ResuxSupportMode; lazy?: boolean }): void;
  addComponentsDir(dir: string | { path: string; global?: boolean; mode?: ResuxSupportMode; pathPrefix?: boolean }): void;
  addImports(imports: { from: string; name: string; as?: string } | Array<{ from: string; name: string; as?: string }>): void;
  addImportsDir(dir: string): void;
  addPlugin(plugin: string | { src: string; mode?: ResuxSupportMode }): void;
  addRouteMiddleware(middleware: { name: string; src: string; global?: boolean; mode?: ResuxSupportMode }): void;
  addServerHandler(handler: { route: string; handler: string; middleware?: boolean; method?: string }): void;
  addServerPlugin(plugin: string): void;
  addTemplate(template: { filename: string; getContents: () => string | Promise<string>; write?: boolean }): void;
  addTypeTemplate(template: { filename: string; getContents: () => string | Promise<string>; write?: boolean }): void;
  extendPages(extender: (pages: Array<Record<string, unknown>>) => void | Promise<void>): void;
  extendViteConfig(extender: (config: Record<string, unknown>) => void | Promise<void>): void;
  extendNitroConfig(extender: (config: Record<string, unknown>) => void | Promise<void>): void;
  addVitePlugin(plugin: unknown): void;
  addPrerenderRoutes(route: string | string[]): void;
}

export type ResuxModule<TOptions = Record<string, unknown>> =
  | ((options: TOptions, context: ResuxModuleContext) => unknown | Promise<unknown>)
  | {
      meta?: {
        name?: string;
        configKey?: string;
      };
      defaults?: TOptions;
      setup: (options: TOptions, context: ResuxModuleContext) => unknown | Promise<unknown>;
    };

export type ResuxDeployTarget =
  | "auto"
  | "node"
  | "vercel"
  | "netlify"
  | "cloudflare"
  | "static";

export interface ResuxDeployOptions {
  target?: ResuxDeployTarget;
  nitroPreset?: string;
}

export interface ResuxConfigInput extends Record<string, unknown> {
  builder?: string;
  serverBuilder?: string;
  buildDir?: string;
  compatibilityDate?: string;
  deploy?: ResuxDeployOptions;
  i18n?: Record<string, unknown>;
  packages?: ResuxPackagesConfig;
  video?: Record<string, unknown>;
}

export interface ResuxPackageCssMap {
  [packageName: string]: string[];
}

export type ResuxPackageMode = "ssr" | "clientOnly" | "serverOnly" | "progressive";

export interface ResuxPackageModeMap {
  [packageName: string]: ResuxPackageMode;
}

export interface ResuxPackagesConfig {
  lazy?: boolean | string[];
  clientOnly?: string[];
  serverOnly?: string[];
  mode?: ResuxPackageModeMap;
  external?: string[];
  noExternal?: string[];
  transpile?: string[];
  optimizeDeps?: string[];
  css?: string[] | ResuxPackageCssMap;
  aliases?: Record<string, string>;
  guards?: boolean;
  diagnostics?: boolean;
}

export interface ResuxClientPackageImportRegistry {
  importers?: string[];
  css?: Record<string, string[]>;
  declared?: string[];
}

export interface ClientRuntimeSourceOptions {
  packageRegistry?: ResuxClientPackageImportRegistry;
}

export interface ResuxLazyPackageOptions {
  clientOnly?: boolean;
  mode?: ResuxPackageMode;
  css?: string[];
  exportName?: string;
  preferDefault?: boolean;
}

export type ResuxLazyPackageLoader<T = unknown> = () => Promise<T>;
export type ClientEnhancementTrigger = "visible" | "interaction" | "idle" | "immediate" | "manual" | "page-load";

export interface ClientEnhancementContext {
  trigger: ClientEnhancementTrigger;
  options?: Record<string, unknown>;
  __resux?: {
    trigger: ClientEnhancementTrigger;
    options?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export type ClientEnhancementSetup = (
  target: Element,
  context: ClientEnhancementContext,
) => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;

export interface UseClientEnhancementOptions {
  target?: Element | string;
  trigger?: ClientEnhancementTrigger;
  options?: Record<string, unknown>;
}

export interface PackageAdapterContext {
  packageName: string;
  mode: ResuxPackageMode;
  modules: unknown[];
}

export interface PackageAdapterDefinition<TOptions extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  packageName?: string;
  mode?: ResuxPackageMode;
  imports?: string[];
  css?: string[];
  defaults?: TOptions;
  validateOptions?: (options: TOptions) => void;
  enhance: (
    target: Element,
    options: TOptions,
    context: PackageAdapterContext,
  ) => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;
}

export type RouteMiddlewareResult =
  | void
  | string
  | false
  | { redirect: string | { to: string; statusCode?: number } }
  | { type: "redirect"; to: string; statusCode?: number }
  | { type: "abort"; message?: string; statusCode?: number };

export type ResuxRouteMiddleware = (
  to: RouteContext,
  from: RouteContext
) => RouteMiddlewareResult | Promise<RouteMiddlewareResult>;

export interface EventHandlerEvent {
  path: string;
  method: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  node: {
    req: unknown;
    res: unknown;
  };
}

export type EventHandler = (event: EventHandlerEvent) => unknown | Promise<unknown>;

export type ServerMiddlewareResult = unknown | Promise<unknown>;
export type ServerMiddleware = (event: EventHandlerEvent) => ServerMiddlewareResult;

export type TemplateNode =
  | TextTemplateNode
  | InterpolationTemplateNode
  | ElementTemplateNode;

export interface TextTemplateNode {
  type: "text";
  value: string;
}

export interface InterpolationTemplateNode {
  type: "interpolation";
  expression: string;
  bindingId: string;
}

export interface TemplateAttribute {
  kind: "static" | "dynamic";
  name: string;
  value: string;
  bindingId?: string;
}

export interface TemplateEvent {
  name: string;
  handler: string;
  modifiers?: string[];
  /** Template-local bindings captured by an inline resumable handler. */
  locals?: string[];
}

export interface IfDirective {
  expression: string;
  blockId: string;
}

export interface ForDirective {
  source: string;
  value: string;
  index?: string;
  blockId: string;
}

export interface HtmlDirective {
  expression: string;
  bindingId: string;
}

export interface ElementTemplateNode {
  type: "element";
  tag: string;
  attrs: TemplateAttribute[];
  events: TemplateEvent[];
  children: TemplateNode[];
  if?: IfDirective;
  for?: ForDirective;
  html?: HtmlDirective;
}

export interface SetupContext {
  props: Record<string, unknown>;
  ref: typeof ref;
  reactive: typeof reactive;
  computed: typeof computed;
  watch<T = unknown>(source: WatchSource<T> | WatchSource<T>[], callback: WatchCallback<T>, options?: WatchOptions): WatchStopHandle;
  watchEffect(effect: (onCleanup: (cleanup: () => void) => void) => void, options?: WatchOptions): WatchStopHandle;
  readonly: typeof readonly;
  toRef: typeof toRef;
  toRefs: typeof toRefs;
  unref: typeof unref;
  isRef: typeof isRef;
  isReactive: typeof isReactive;
  isReadonly: typeof isReadonly;
  nextTick: typeof nextTick;
  useState<T>(key: string, factory?: () => T): Ref<T>;
  useGlobalState<T>(key: string, factory?: () => T): Ref<T>;
  useAsyncData<T>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>): AsyncDataResource<T>;
  defineProps<T extends Record<string, unknown> = Record<string, unknown>>(): T;
  defineEmits<T = (...args: any[]) => void>(emits?: unknown): (...args: any[]) => void;
  emit(...args: any[]): void;
  defineExpose(exposed?: Record<string, any>): void;
  defineSlots<T = Record<string, any>>(): T;
  defineOptions(options?: Record<string, any>): void;
  defineModel<T>(name?: string, options?: unknown): Ref<T>;
  useRoute(): RouteContext;
  useRouter(): ResuxRouter;
  useHead(input: HeadEntry): void;
  useSeoMeta(input: SeoMetaInput): void;
  useRuntimeConfig(): RuntimeConfig;
  useResuxApp(): ResuxAppLike;
  apiURL(path: string): string;
  useResuxImage(): ResuxImageBuilder;
  useFetch<T>(url: string, init?: RequestInit): AsyncDataResource<T>;
  $fetch<T>(url: string, init?: RequestInit): Promise<T>;
  useError(): Ref<ResuxError | null>;
  clearError(): void;
  showError(input: string | Partial<ResuxError>): never;
  createError(input: string | Partial<ResuxError>): ResuxError;
  useLazyPackage<T = unknown>(name: string, options?: ResuxLazyPackageOptions): Promise<T>;
  useClientPackage<T = unknown>(name: string, options?: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode">): Promise<T>;
  usePackageReady(name: string): boolean;
  defineLazyPackage<T = unknown>(name: string, options?: ResuxLazyPackageOptions): ResuxLazyPackageLoader<T>;
  defineClientOnlyPackage<T = unknown>(name: string, options?: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode">): ResuxLazyPackageLoader<T>;
  definePackageAdapter<TOptions extends Record<string, unknown> = Record<string, unknown>>(
    definition: PackageAdapterDefinition<TOptions>,
  ): { name: string; setup: ClientEnhancementSetup };
  defineClientEnhancement(name: string, setup: ClientEnhancementSetup): { name: string; setup: ClientEnhancementSetup };
  useClientEnhancement(name: string, options?: UseClientEnhancementOptions): Promise<{ ready: boolean; activate: () => Promise<void>; dispose: () => Promise<void> }>;
  onMounted(callback: () => unknown | Promise<unknown>): void;
  definePageMeta(_meta: PageMeta): void;
  useI18n(): any;
  useLocalePath(): any;
  useSwitchLocalePath(): any;
  useDevice(): DeviceInfo;
  $device: DeviceInfo;
  $t(key: string, params?: Record<string, unknown>): string;
  $tm(key: string): unknown;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  file: string;
  script: (ctx: SetupContext) => Record<string, unknown> | Promise<Record<string, unknown>>;
  template: TemplateNode[];
  handlers: string[];
  styles?: ComponentStyle[];
  styleScopeId?: string;
  meta?: PageMeta;
}

export interface SerializedScope {
  id: string;
  moduleId: string;
  props?: Record<string, JsonValue>;
  state: Record<string, JsonValue>;
  globalStateKeys?: string[];
  asyncData: Record<string, SerializedAsyncData>;
}

export interface SerializedAsyncData {
  value: JsonValue;
  pending: boolean;
  error: AsyncDataError | null;
}

export interface ResuxPayload {
  route: RouteContext;
  scopes: Record<string, SerializedScope>;
  globalState?: Record<string, JsonValue>;
  modules: Record<string, string>;
  vueIslands?: Record<string, string>;
  config?: RuntimeConfig;
  plugins?: ClientPluginManifestRecord[];
  middleware?: ClientRouteMiddlewareManifestRecord[];
  pageMeta?: PageMeta;
}

export interface RouteRecord {
  id: string;
  path: string;
  file: string;


  params: string[];
  component: ComponentDefinition;
  match(pathname: string): Record<string, string> | null;
}

export interface RenderAppOptions {
  app?: ComponentDefinition;
  page: ComponentDefinition;
  pageProps?: Record<string, unknown>;
  pageMeta?: PageMeta;
  route: RouteContext;
  components?: Record<string, ComponentDefinition>;
  layouts?: Record<string, ComponentDefinition>;
  modules?: Record<string, string>;
  vueIslands?: Record<string, string>;
  runtimeConfig?: RuntimeConfig;
  appHead?: HeadEntry;
  plugins?: ResuxPlugin[];
}

export interface RenderResult {
  html: string;
  payload: ResuxPayload;
  head: HeadEntry;
}

export interface RenderDocumentOptions {
  devReload?: boolean;
  isStatic?: boolean;
}

interface ScopeRecord {
  id: string;
  moduleId: string;
  props: Record<string, unknown>;
  stateRefs: Record<string, Ref<unknown>>;
  globalStateKeys: Set<string>;
  asyncDataRefs: Record<string, AsyncDataResource<unknown>>;
}

interface RenderTemplateContext {
  scope: Record<string, unknown>;
  scopeId: string;
  moduleId: string;
  styleScopeId?: string;
  route: RouteContext;
  runtimeConfig: RuntimeConfig;
  components: Record<string, ComponentDefinition>;
  layouts: Record<string, ComponentDefinition>;
  pageMeta: PageMeta;
  addHeadEntry?: (entry: HeadEntry) => void;
  renderPage?: () => Promise<string>;
  renderSlot?: () => Promise<string>;
  renderLayout?: (name: string | false | undefined, slot: () => Promise<string>) => Promise<string>;
}

type ComponentProps = Record<string, unknown>;
type ResuxAsyncContextStorage = {
  getStore(): ResuxAppLike | undefined;
  run<T>(store: ResuxAppLike, callback: () => T): T;
};

let activeResuxApp: ResuxAppLike | null = null;
const fallbackResuxError = ref<ResuxError | null>(null);
const resuxErrorByApp = new WeakMap<ResuxAppLike, Ref<ResuxError | null>>();
const resuxAsyncContextStorage = createResuxAsyncContextStorage();

function createResuxAsyncContextStorage(): ResuxAsyncContextStorage | null {
  const maybeProcess = typeof process !== "undefined"
    ? process as typeof process & { getBuiltinModule?: (id: string) => unknown }
    : undefined;
  const getBuiltinModule = maybeProcess?.getBuiltinModule;
  if (typeof getBuiltinModule !== "function") {
    return null;
  }

  try {
    const asyncHooks = getBuiltinModule.call(maybeProcess, "node:async_hooks") as {
      AsyncLocalStorage?: new () => ResuxAsyncContextStorage;
    } | undefined;
    const AsyncLocalStorage = asyncHooks?.AsyncLocalStorage;
    return AsyncLocalStorage ? new AsyncLocalStorage() : null;
  } catch {
    return null;
  }
}

function readActiveResuxApp(): ResuxAppLike | null {
  return resuxAsyncContextStorage?.getStore()
    ?? activeResuxApp
    ?? (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__
    ?? null;
}

function readActiveResuxError(): Ref<ResuxError | null> {
  const app = readActiveResuxApp();
  if (!app) {
    return fallbackResuxError;
  }
  const existing = resuxErrorByApp.get(app);
  if (existing) {
    return existing;
  }
  const errorRef = ref<ResuxError | null>(null);
  resuxErrorByApp.set(app, errorRef);
  return errorRef;
}

async function withActiveResuxApp<T>(resuxApp: ResuxAppLike, run: () => Promise<T> | T): Promise<T> {
  if (resuxAsyncContextStorage) {
    return await resuxAsyncContextStorage.run(resuxApp, () => Promise.resolve(run()));
  }

  const previous = activeResuxApp;
  activeResuxApp = resuxApp;
  const previousGlobal = (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__;
  (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__ = resuxApp;
  try {
    return await run();
  } finally {
    activeResuxApp = previous;
    (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__ = previousGlobal;
  }
}

export function defineComponent(definition: ComponentDefinition): ComponentDefinition {
  return definition;
}

export function defineResuxConfig<T extends ResuxConfigInput>(config: T): T {
  return config;
}

export function defineResuxModule<TOptions = Record<string, unknown>>(module: ResuxModule<TOptions>): ResuxModule<TOptions> {
  return module;
}

export function defineResuxPlugin(plugin: ResuxPlugin): ResuxPlugin {
  return plugin;
}

export function defineResuxRouteMiddleware(middleware: ResuxRouteMiddleware): ResuxRouteMiddleware {
  return middleware;
}

export function useResuxApp(): ResuxAppLike {
  const app = readActiveResuxApp();
  if (app) {
    return app;
  }

  console.error("useResuxApp error trace:");
  console.trace();

  throw new Error("useResuxApp() is only available while executing a Resux setup or middleware context.");
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIos: boolean;
  isAndroid: boolean;
  [key: string]: boolean;
}

export function parseUserAgent(ua?: string): DeviceInfo {
  const userAgent = ua || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|PlayBook|Silk/i.test(userAgent) || (isMobile && /Tablet/i.test(userAgent));
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIos,
    isAndroid
  };
}

export function useDevice(): DeviceInfo {
  const app = readActiveResuxApp();
  const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return parseUserAgent(ua);
}

function readGlobalClientRouter(): ResuxRouter | null {
  const candidate = (globalThis as { __RESUX_ROUTER__?: unknown }).__RESUX_ROUTER__;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const router = candidate as Partial<ResuxRouter>;
  if (
    typeof router.push !== "function"
    || typeof router.replace !== "function"
    || typeof router.back !== "function"
    || typeof router.forward !== "function"
    || typeof router.go !== "function"
  ) {
    return null;
  }
  return router as ResuxRouter;
}

export function useRoute(): RouteContext {
  return useResuxApp().route;
}

export function useRouter(): ResuxRouter {
  const clientRouter = readGlobalClientRouter();
  if (clientRouter) {
    return clientRouter;
  }
  return createServerRouter();
}

export function useRuntimeConfig(): RuntimeConfig {
  return useResuxApp().$config;
}

export function useResuxImage(): ResuxImageBuilder {
  const app = useResuxApp();
  return createResuxImageBuilder(
    app.route,
    app.$config,
    typeof window !== "undefined",
  );
}

export function navigateTo(to: string, options: { statusCode?: number } = {}): RouteMiddlewareResult {
  return {
    type: "redirect",
    to,
    statusCode: options.statusCode
  };
}

export function abortNavigation(message?: string, options: { statusCode?: number } = {}): RouteMiddlewareResult {
  return {
    type: "abort",
    message,
    statusCode: options.statusCode
  };
}

export function createError(input: string | Partial<ResuxError>): ResuxError {
  if (typeof input === "string") {
    const error = new Error(input) as ResuxError;
    error.name = "ResuxError";
    return error;
  }
  const message = typeof input.message === "string" ? input.message : "Resux error";
  const error = new Error(message) as ResuxError;
  error.name = typeof input.name === "string" ? input.name : "ResuxError";
  if (typeof input.statusCode === "number") {
    error.statusCode = input.statusCode;
  }
  if (typeof input.fatal === "boolean") {
    error.fatal = input.fatal;
  }
  if (input.data !== undefined) {
    error.data = input.data as JsonValue;
  }
  return error;
}

export function useError(): Ref<ResuxError | null> {
  return readActiveResuxError();
}

export function showError(input: string | Partial<ResuxError>): never {
  const error = createError(input);
  readActiveResuxError().value = error;
  dispatchRuntimeErrorEvent("resux:app-error", error);
  throw error;
}

export function clearError(): void {
  readActiveResuxError().value = null;
  dispatchRuntimeErrorEvent("resux:app-error-cleared", null);
}

function dispatchRuntimeErrorEvent(name: string, error: ResuxError | null): void {
  if (typeof window === "undefined" || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent(name, { detail: { error } }));
}

const resuxLazyPackageCache = new Map<string, Promise<unknown>>();
const resuxLoadedPackages = new Set<string>();
const resuxInjectedPackageCss = new Set<string>();
const resuxClientEnhancements = new Map<string, ClientEnhancementSetup>();
const resuxActiveEnhancementDisposers = new Set<() => void | Promise<void>>();
const resuxScheduledEnhancementDisposers = new Set<() => void | Promise<void>>();
const resuxBoundEnhancementTargets = new WeakSet<Element>();
const resuxVisibleEnhancementCallbacks = new Map<Element, Set<() => void>>();
let resuxVisibleEnhancementObserver: IntersectionObserver | null = null;
let resuxVisibleEnhancementPollTimer = 0;

function isClientRuntime(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizePackageCssInput(css?: string[] | string): string[] {
  if (!css) {
    return [];
  }
  const list = Array.isArray(css) ? css : [css];
  return list
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry.length > 0);
}

function packageCacheKey(name: string, options: ResuxLazyPackageOptions): string {
  const css = normalizePackageCssInput(options.css).sort().join(",");
  const exportName = options.exportName ?? "";
  const mode = normalizePackageMode(options.mode, options.clientOnly === true ? "clientOnly" : "ssr");
  const preferDefault = options.preferDefault === false ? "0" : "1";
  return `${name}::${mode}::${preferDefault}::${exportName}::${css}`;
}

function readRuntimePackagesConfig(): ResuxPackagesConfig {
  try {
    const runtimeConfig = useRuntimeConfig();
    const direct = (runtimeConfig.public?.packages ?? runtimeConfig.packages) as unknown;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as ResuxPackagesConfig;
    }
  } catch {
    // useRuntimeConfig is not always available in pure client helpers.
  }
  return {};
}

function normalizePackageMode(
  value: unknown,
  fallback: ResuxPackageMode = "ssr",
): ResuxPackageMode {
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

function resolvePackageMode(
  name: string,
  options: ResuxLazyPackageOptions,
  config: ResuxPackagesConfig,
): ResuxPackageMode {
  if (options.clientOnly === true) {
    return "clientOnly";
  }
  if (options.mode) {
    return normalizePackageMode(options.mode, "ssr");
  }
  const configuredModeMap = config.mode;
  if (configuredModeMap && typeof configuredModeMap === "object") {
    const configured = (configuredModeMap as Record<string, unknown>)[name];
    if (configured) {
      return normalizePackageMode(configured, "ssr");
    }
  }
  const serverOnlyList = Array.isArray(config.serverOnly) ? config.serverOnly : [];
  if (serverOnlyList.includes(name)) {
    return "serverOnly";
  }
  const clientOnlyList = Array.isArray(config.clientOnly) ? config.clientOnly : [];
  if (clientOnlyList.includes(name)) {
    return "clientOnly";
  }
  return "ssr";
}

function isClientRuntimePackageMode(mode: ResuxPackageMode): boolean {
  return mode === "clientOnly" || mode === "progressive";
}

function isClientPackageCssHref(value: string): boolean {
  return /^([a-z]+:)?\/\//i.test(value)
    || value.startsWith("/")
    || value.startsWith("./")
    || value.startsWith("../")
    || value.startsWith("#");
}

async function injectClientPackageCss(cssEntries: string[], packageName: string): Promise<void> {
  if (!isClientRuntime()) {
    return;
  }
  const styleImports: Promise<void>[] = [];
  for (const href of cssEntries) {
    if (!href || resuxInjectedPackageCss.has(href)) {
      continue;
    }
    if (isClientPackageCssHref(href)) {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", href);
      link.setAttribute("data-resux-package-css", href);
      document.head.appendChild(link);
      resuxInjectedPackageCss.add(href);
      dispatchPackageCssLoaded({
        name: packageName,
        entry: href,
      });
      continue;
    }
    styleImports.push(
      import(/* @vite-ignore */ href)
        .then(() => {
          dispatchPackageCssLoaded({
            name: packageName,
            entry: href,
          });
        })
        .catch((error) => {
          resuxInjectedPackageCss.delete(href);
          throw new Error(
            `Failed to load CSS entry "${href}" for package "${packageName}": ${error instanceof Error ? error.message : String(error)}`
          );
        }),
    );
    resuxInjectedPackageCss.add(href);
  }
  if (styleImports.length > 0) {
    await Promise.all(styleImports);
  }
}

function packageImportError(name: string, mode: ResuxPackageMode, cause: unknown): Error {
  const reason = cause instanceof Error ? cause.message : String(cause);
  if (isClientRuntimePackageMode(mode) && !isClientRuntime()) {
    return new Error(
      `Package "${name}" appears to be browser-only and was imported during SSR. ` +
      `Use useClientPackage("${name}") or useLazyPackage("${name}", { mode: "clientOnly" }) inside onMounted() or a client enhancement.`,
    );
  }
  if (mode === "serverOnly" && isClientRuntime()) {
    return new Error(
      `Package "${name}" is marked serverOnly and cannot run in the browser. ` +
      `Load it on the server or change its packages.mode entry.`,
    );
  }
  if (/Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|failed to resolve/i.test(reason)) {
    return new Error(
      `Package "${name}" is not installed. Run "npm install ${name}" or remove this integration.`,
    );
  }
  return new Error(`Failed to load package "${name}": ${reason}`);
}

export async function useLazyPackage<T = unknown>(
  name: string,
  options: ResuxLazyPackageOptions = {},
): Promise<T> {
  const packageName = String(name || "").trim();
  if (!packageName) {
    throw new Error("useLazyPackage(name) needs a package name.");
  }

  const packageConfig = readRuntimePackagesConfig();
  const mode = resolvePackageMode(packageName, options, packageConfig);
  if (isClientRuntimePackageMode(mode) && !isClientRuntime()) {
    throw packageImportError(packageName, mode, new Error("client-only package requested on server"));
  }
  if (mode === "serverOnly" && isClientRuntime()) {
    throw packageImportError(packageName, mode, new Error("server-only package requested on client"));
  }

  const cssFromConfig = Array.isArray(packageConfig.css)
    ? packageConfig.css
    : packageConfig.css && typeof packageConfig.css === "object"
      ? packageConfig.css[packageName]
      : [];
  const css = uniqueArray([
    ...normalizePackageCssInput(cssFromConfig as string[] | string),
    ...normalizePackageCssInput(options.css),
  ]);
  await injectClientPackageCss(css, packageName);

  const key = packageCacheKey(packageName, { ...options, mode, css });
  const cached = resuxLazyPackageCache.get(key);
  if (cached) {
    return cached as Promise<T>;
  }

  const loader = (async () => {
    dispatchPackageEvent("loading", {
      name: packageName,
      mode,
    });
    try {
      const imported = await import(/* @vite-ignore */ packageName);
      resuxLoadedPackages.add(packageName);
      dispatchPackageEvent("loaded", {
        name: packageName,
        mode,
      });
      if (options.exportName) {
        const selected = (imported as Record<string, unknown>)[options.exportName];
        if (selected === undefined) {
          throw new Error(`Export "${options.exportName}" was not found in package "${packageName}".`);
        }
        return selected as T;
      }
      if (options.preferDefault === false) {
        return imported as T;
      }
      return ((imported as { default?: unknown }).default ?? imported) as T;
    } catch (error) {
      dispatchPackageEvent("error", {
        name: packageName,
        mode,
        error: getEnhancementErrorMessage(error),
      });
      throw packageImportError(packageName, mode, error);
    }
  })();

  resuxLazyPackageCache.set(key, loader as Promise<unknown>);
  void loader.catch(() => {
    if (resuxLazyPackageCache.get(key) === loader) {
      resuxLazyPackageCache.delete(key);
    }
  });
  return loader;
}

export async function useClientPackage<T = unknown>(
  name: string,
  options: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode"> = {},
): Promise<T> {
  return useLazyPackage<T>(name, { ...options, mode: "clientOnly", clientOnly: true });
}

export function usePackageReady(name: string): boolean {
  return resuxLoadedPackages.has(String(name || "").trim());
}

export function defineLazyPackage<T = unknown>(
  name: string,
  options: ResuxLazyPackageOptions = {},
): ResuxLazyPackageLoader<T> {
  return () => useLazyPackage<T>(name, options);
}

export function defineClientOnlyPackage<T = unknown>(
  name: string,
  options: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode"> = {},
): ResuxLazyPackageLoader<T> {
  return () => useClientPackage<T>(name, options);
}

function readEnhancementPayloadOptions(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const record = payload as Record<string, unknown>;
  if (isEnhancementOptionsObject(record.options)) {
    return { ...record.options };
  }
  const { trigger: _trigger, options: _options, __resux: _meta, ...directOptions } = record;
  return directOptions;
}

export function definePackageAdapter<TOptions extends Record<string, unknown> = Record<string, unknown>>(
  definition: PackageAdapterDefinition<TOptions>,
): { name: string; setup: ClientEnhancementSetup } {
  const enhancementName = String(definition?.name || "").trim();
  if (!enhancementName) {
    throw new Error("[resux] definePackageAdapter requires a non-empty adapter name.");
  }
  if (typeof definition.enhance !== "function") {
    throw new Error(`[resux] definePackageAdapter("${enhancementName}") requires an enhance() function.`);
  }

  const packageName = String(definition.packageName || enhancementName).trim();
  const mode = normalizePackageMode(definition.mode, "progressive");
  const imports = uniqueArray([
    packageName,
    ...(Array.isArray(definition.imports) ? definition.imports.map((entry) => String(entry || "").trim()) : []),
  ].filter((entry) => entry.length > 0));
  const css = normalizePackageCssInput(definition.css);
  const defaults = (definition.defaults && isEnhancementOptionsObject(definition.defaults))
    ? { ...definition.defaults }
    : {} as TOptions;

  return defineClientEnhancement(enhancementName, async (target, payload) => {
    const userOptions = readEnhancementPayloadOptions(payload);
    const mergedOptions = { ...defaults, ...userOptions } as TOptions;
    try {
      assertEnhancementOptionsSerializable(mergedOptions, "$", new WeakSet<object>());
    } catch (error) {
      throw new Error(
        `[resux] Adapter "${enhancementName}" received non-serializable options. ${getEnhancementErrorMessage(error)}`,
      );
    }

    if (typeof definition.validateOptions === "function") {
      definition.validateOptions(mergedOptions);
    }

    const modules = imports.length
      ? await Promise.all(imports.map((specifier, index) => useLazyPackage(specifier, {
        mode,
        clientOnly: mode === "clientOnly",
        preferDefault: false,
        css: index === 0 ? css : [],
      })))
      : [];

    return definition.enhance(target, mergedOptions, {
      packageName,
      mode,
      modules,
    });
  });
}

const RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS = 5000;
let resuxClientEnhancementManifestPromise: Promise<void> | null = null;

function isEnhancementDebugEnabled(): boolean {
  if (!isClientRuntime()) {
    return false;
  }
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  const queryFlag = /(?:\?|&)resux-enhancement-debug=1(?:&|$)/.test(window.location.search);
  const globalFlag = Boolean((window as unknown as { __RESUX_ENHANCEMENT_DEBUG__?: unknown }).__RESUX_ENHANCEMENT_DEBUG__);
  return Boolean(meta.env?.DEV) || queryFlag || globalFlag;
}

function logEnhancementDebug(message: string): void {
  if (!isEnhancementDebugEnabled()) {
    return;
  }
  console.info(`[resux:enhancement] ${message}`);
}

function dispatchEnhancementEvent(eventName: string, detail: Record<string, unknown>): void {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent(`resux:enhancement:${eventName}`, { detail }));
}

function dispatchPackageEvent(eventName: "loading" | "loaded" | "error", detail: Record<string, unknown>): void {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent(`resux:package:${eventName}`, { detail }));
}

function dispatchPackageCssLoaded(detail: Record<string, unknown>): void {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:package-css:loaded", { detail }));
}

function readEnhancementElementId(target: Element): string | undefined {
  if (!target) {
    return undefined;
  }
  const id = target.getAttribute("id")?.trim();
  if (id) {
    return id;
  }
  const dataId = target.getAttribute("data-resux-enhancement-id")?.trim();
  return dataId || undefined;
}

function setEnhancementStatus(target: Element, status: string): void {
  target.setAttribute("data-resux-enhancement-status", status);
  target.setAttribute("data-rx-enhancement-status", status);
}

function setEnhancementBound(target: Element, bound: boolean): void {
  const dataset = (target as HTMLElement | SVGElement).dataset;
  if (bound) {
    dataset.rxEnhancementBound = "true";
  } else {
    delete dataset.rxEnhancementBound;
  }
}

function getEnhancementErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isEnhancementOptionsObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertEnhancementOptionsSerializable(
  value: unknown,
  path: string,
  seen: WeakSet<object>,
): void {
  if (value === null) {
    return;
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return;
  }
  if (valueType === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error(`[resux] Enhancement options contain a non-finite number at "${path}".`);
    }
    return;
  }
  if (valueType === "undefined" || valueType === "function" || valueType === "symbol" || valueType === "bigint") {
    throw new Error(
      `[resux] Options for client enhancement must be JSON-serializable. Unsupported value at "${path}" (${valueType}).`,
    );
  }
  if (valueType !== "object") {
    return;
  }
  const objectValue = value as Record<string, unknown>;
  if (typeof Node !== "undefined" && objectValue instanceof Node) {
    throw new Error(`[resux] Options for client enhancement cannot include DOM nodes ("${path}").`);
  }
  if (seen.has(objectValue)) {
    throw new Error(`[resux] Options for client enhancement contain a circular reference at "${path}".`);
  }
  seen.add(objectValue);
  if (Array.isArray(objectValue)) {
    for (let index = 0; index < objectValue.length; index += 1) {
      assertEnhancementOptionsSerializable(objectValue[index], `${path}[${index}]`, seen);
    }
    return;
  }
  const prototype = Object.getPrototypeOf(objectValue);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(
      `[resux] Options for client enhancement must use plain objects and arrays. Invalid value at "${path}".`,
    );
  }
  for (const [key, nestedValue] of Object.entries(objectValue)) {
    assertEnhancementOptionsSerializable(nestedValue, `${path}.${key}`, seen);
  }
}

function normalizeEnhancementOptionsInput(
  name: string,
  options: unknown,
): Record<string, unknown> {
  if (options === undefined || options === null) {
    return {};
  }
  if (!isEnhancementOptionsObject(options)) {
    throw new Error(
      `[resux] Options for "${name}" must be a JSON-serializable plain object.`,
    );
  }
  assertEnhancementOptionsSerializable(options, "$", new WeakSet<object>());
  return options;
}

function createEnhancementSetupPayload(
  trigger: ClientEnhancementTrigger,
  options: Record<string, unknown>,
): ClientEnhancementContext {
  const payloadOptions = { ...options };
  return {
    ...payloadOptions,
    trigger,
    options: payloadOptions,
    __resux: {
      trigger,
      options: payloadOptions,
    },
  };
}

function isElementProbablyVisible(target: Element): boolean {
  if (!isClientRuntime()) {
    return true;
  }
  const rect = target.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.top <= window.innerHeight;
}

function releaseVisibleEnhancementResourcesIfIdle(): void {
  if (resuxVisibleEnhancementCallbacks.size > 0) {
    return;
  }
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}

function unobserveVisibleEnhancement(target: Element, callback?: () => void): void {
  const callbacks = resuxVisibleEnhancementCallbacks.get(target);
  if (!callbacks) {
    return;
  }
  if (callback) {
    callbacks.delete(callback);
  } else {
    callbacks.clear();
  }
  if (callbacks.size > 0) {
    return;
  }
  resuxVisibleEnhancementCallbacks.delete(target);
  resuxVisibleEnhancementObserver?.unobserve(target);
  releaseVisibleEnhancementResourcesIfIdle();
}

function ensureVisibleEnhancementResources(): void {
  if (!resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
          continue;
        }
        const callbacks = resuxVisibleEnhancementCallbacks.get(entry.target);
        if (!callbacks) {
          continue;
        }
        for (const activate of callbacks) {
          activate();
        }
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, callbacks] of resuxVisibleEnhancementCallbacks) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          for (const activate of callbacks) {
            activate();
          }
        }
      }
    }, 200);
  }
}

function observeVisibleEnhancement(target: Element, activate: () => void): () => void {
  let settled = false;
  const run = () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
    if (target.isConnected) {
      activate();
    }
  };
  let callbacks = resuxVisibleEnhancementCallbacks.get(target);
  const isNewTarget = callbacks === undefined;
  callbacks ??= new Set<() => void>();
  if (isNewTarget) {
    resuxVisibleEnhancementCallbacks.set(target, callbacks);
    ensureVisibleEnhancementResources();
    resuxVisibleEnhancementObserver!.observe(target);
  }
  callbacks.add(run);
  return () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
  };
}

async function ensureClientEnhancementManifestLoaded(): Promise<void> {
  if (!isClientRuntime()) {
    return;
  }
  if (!resuxClientEnhancementManifestPromise) {
    logEnhancementDebug("runtime loaded");
    resuxClientEnhancementManifestPromise = (async () => {
      try {
        const manifestUrl = (window as unknown as { __RESUX_CLIENT_ENHANCEMENTS_SRC__?: string }).__RESUX_CLIENT_ENHANCEMENTS_SRC__
          || "/__resux/client-enhancements.mjs";
        await import(/* @vite-ignore */ manifestUrl);
        logEnhancementDebug("manifest loaded");
      } catch (error) {
        const message = getEnhancementErrorMessage(error);
        if (isEnhancementDebugEnabled()) {
          console.warn(`[resux:enhancement] failed to load manifest: ${message}`);
        }
      }
    })();
  }
  await resuxClientEnhancementManifestPromise;
}

function scheduleEnhancementTrigger(
  name: string,
  trigger: ClientEnhancementTrigger,
  target: Element,
  activate: () => Promise<void>,
): () => void {
  const fire = () => {
    void activate().catch(() => {
      // useClientEnhancement already reports error status/events.
    });
  };
  if (trigger === "manual") {
    return () => {};
  }
  if (trigger === "immediate") {
    queueMicrotask(() => {
      fire();
    });
    return () => {};
  }
  if (trigger === "interaction") {
    const handler = () => {
      fire();
      target.removeEventListener("click", handler, true);
      target.removeEventListener("pointerdown", handler, true);
      target.removeEventListener("touchstart", handler, true);
      target.removeEventListener("focusin", handler, true);
      target.removeEventListener("keydown", handler, true);
    };
    target.addEventListener("click", handler, true);
    target.addEventListener("pointerdown", handler, true);
    target.addEventListener("touchstart", handler, true);
    target.addEventListener("focusin", handler, true);
    target.addEventListener("keydown", handler, true);
    return () => {
      target.removeEventListener("click", handler, true);
      target.removeEventListener("pointerdown", handler, true);
      target.removeEventListener("touchstart", handler, true);
      target.removeEventListener("focusin", handler, true);
      target.removeEventListener("keydown", handler, true);
    };
  }
  if (trigger === "idle") {
    const idle = (window as unknown as { requestIdleCallback?: (callback: () => void) => number; cancelIdleCallback?: (id: number) => void; });
    if (typeof idle.requestIdleCallback === "function") {
      const id = idle.requestIdleCallback(() => {
        fire();
      });
      return () => {
        if (typeof idle.cancelIdleCallback === "function") {
          idle.cancelIdleCallback(id);
        }
      };
    }
    const timeoutId = window.setTimeout(() => {
      fire();
    }, 32);
    return () => window.clearTimeout(timeoutId);
  }
  if (trigger === "page-load") {
    if (document.readyState === "complete") {
      fire();
      return () => {};
    }
    const onLoad = () => {
      window.removeEventListener("load", onLoad);
      fire();
    };
    window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("load", onLoad);
    };
  }
  if (trigger === "visible") {
    if (isElementProbablyVisible(target)) {
      fire();
      return () => {};
    }
    if (typeof IntersectionObserver !== "function") {
      fire();
      return () => {};
    }
    const cancel = observeVisibleEnhancement(target, fire);
    logEnhancementDebug(`observing visible trigger ${name}`);
    return cancel;
  }
  fire();
  return () => {};
}

export function defineClientEnhancement(
  name: string,
  setup: ClientEnhancementSetup,
): { name: string; setup: ClientEnhancementSetup } {
  const normalized = String(name || "").trim();
  if (!normalized) {
    throw new Error("[resux] defineClientEnhancement requires a string name.");
  }
  if (typeof setup !== "function") {
    throw new Error(`[resux] defineClientEnhancement("${normalized}") requires a setup function.`);
  }
  resuxClientEnhancements.set(normalized, setup);
  logEnhancementDebug(`registered ${normalized}`);
  return { name: normalized, setup };
}

function resolveEnhancementTarget(input?: Element | string): Element | null {
  if (!isClientRuntime()) {
    return null;
  }
  if (!input) {
    return document.body;
  }
  if (typeof input === "string") {
    return document.querySelector(input);
  }
  return input;
}

export async function useClientEnhancement(
  name: string,
  options: UseClientEnhancementOptions = {},
): Promise<{ ready: boolean; activate: () => Promise<void>; dispose: () => Promise<void> }> {
  if (!isClientRuntime()) {
    return {
      ready: false,
      activate: async () => {},
      dispose: async () => {},
    };
  }
  await ensureClientEnhancementManifestLoaded();

  const target = resolveEnhancementTarget(options.target);
  if (!target) {
    throw new Error(`Client enhancement "${String(name || "").trim()}" did not find a target element.`);
  }
  const normalized = String(name || "").trim();
  const setup = resuxClientEnhancements.get(normalized);
  if (!setup) {
    const message = (
      `[resux] Client enhancement "${normalized}" was used but not registered.\n`
      + `Create one of:\n`
      + `- client-enhancements/${normalized}.client.ts\n`
      + `- enhancements/${normalized}.client.ts\n`
      + `or call defineClientEnhancement("${normalized}", setup) from a loaded client plugin.`
    );
    setEnhancementStatus(target, "error");
    target.setAttribute("data-rx-enhancement-error", message);
    dispatchEnhancementEvent("error", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      error: message,
    });
    throw new Error(message);
  }

  let normalizedEnhancementOptions: Record<string, unknown> = {};
  try {
    normalizedEnhancementOptions = normalizeEnhancementOptionsInput(normalized, options.options);
  } catch (error) {
    const message = getEnhancementErrorMessage(error);
    setEnhancementStatus(target, "error");
    target.setAttribute("data-rx-enhancement-error", message);
    dispatchEnhancementEvent("error", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      error: message,
    });
    throw error instanceof Error ? error : new Error(message);
  }

  let activated = false;
  let disposed = false;
  let teardown: void | (() => void | Promise<void>);
  const trigger = options.trigger ?? "manual";
  let idleWarningTimer = 0;
  const shouldWarnIfIdle = trigger === "immediate" || trigger === "idle";
  if (shouldWarnIfIdle) {
    idleWarningTimer = window.setTimeout(() => {
      if (activated || disposed) {
        return;
      }
      const warning = `[resux] Enhancement "${normalized}" stayed idle for 5s. Check data-resux-trigger, IntersectionObserver, and whether the element is visible.`;
      if (isEnhancementDebugEnabled()) {
        console.warn(warning);
      }
      target.setAttribute("data-rx-enhancement-error", warning);
      setEnhancementStatus(target, "error");
      dispatchEnhancementEvent("error", {
        name: normalized,
        elementId: readEnhancementElementId(target),
        error: warning,
      });
    }, RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS);
  }

  const activate = async () => {
    if (disposed || activated) {
      return;
    }
    activated = true;
    if (idleWarningTimer) {
      window.clearTimeout(idleWarningTimer);
      idleWarningTimer = 0;
    }
    setEnhancementStatus(target, "triggered");
    dispatchEnhancementEvent("triggered", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      trigger,
    });
    logEnhancementDebug(`trigger fired ${normalized}`);
    setEnhancementStatus(target, "loading");
    dispatchEnhancementEvent("loading", {
      name: normalized,
      elementId: readEnhancementElementId(target),
    });
    try {
      const setupPayload = createEnhancementSetupPayload(trigger, normalizedEnhancementOptions);
      teardown = await setup(target, setupPayload);
      if (disposed) {
        if (typeof teardown === "function") {
          await teardown();
        }
        teardown = undefined;
        return;
      }
      setEnhancementStatus(target, "active");
      dispatchEnhancementEvent("ready", {
        name: normalized,
        elementId: readEnhancementElementId(target),
      });
      logEnhancementDebug("setup complete");
      if (typeof teardown === "function") {
        resuxActiveEnhancementDisposers.add(teardown);
        dispatchEnhancementEvent("cleanup-ready", {
          name: normalized,
          elementId: readEnhancementElementId(target),
        });
        logEnhancementDebug("cleanup registered");
      }
    } catch (error) {
      const message = getEnhancementErrorMessage(error);
      setEnhancementStatus(target, "error");
      target.setAttribute("data-rx-enhancement-error", message);
      dispatchEnhancementEvent("error", {
        name: normalized,
        elementId: readEnhancementElementId(target),
        error: message,
      });
      throw error;
    }
  };

  const cancelTrigger = scheduleEnhancementTrigger(normalized, trigger, target, activate);
  const dispose = async () => {
    if (disposed) {
      return;
    }
    disposed = true;
    resuxScheduledEnhancementDisposers.delete(dispose);
    resuxBoundEnhancementTargets.delete(target);
    setEnhancementBound(target, false);
    if (idleWarningTimer) {
      window.clearTimeout(idleWarningTimer);
      idleWarningTimer = 0;
    }
    cancelTrigger();
    if (typeof teardown === "function") {
      resuxActiveEnhancementDisposers.delete(teardown);
      await teardown();
    }
  };

  resuxScheduledEnhancementDisposers.add(dispose);

  return {
    ready: activated,
    activate,
    dispose,
  };
}

export async function disposeClientEnhancements(): Promise<void> {
  const scheduledDisposers = [...resuxScheduledEnhancementDisposers];
  resuxScheduledEnhancementDisposers.clear();
  for (const dispose of scheduledDisposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  resuxVisibleEnhancementCallbacks.clear();
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}

export function hasClientEnhancement(name: string): boolean {
  const normalized = String(name || "").trim();
  return normalized.length > 0 && resuxClientEnhancements.has(normalized);
}

export function getClientEnhancement(name: string): ClientEnhancementSetup | undefined {
  const normalized = String(name || "").trim();
  return normalized ? resuxClientEnhancements.get(normalized) : undefined;
}

export async function scanClientEnhancements(root: ParentNode = document): Promise<void> {
  if (isClientRuntime() && document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }
  await ensureClientEnhancementManifestLoaded();
  await activateDeclaredClientEnhancements(root);
}

function normalizeEnhancementTrigger(
  value: unknown,
  fallback: ClientEnhancementTrigger = "visible",
): ClientEnhancementTrigger {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (
    normalized === "visible"
    || normalized === "interaction"
    || normalized === "idle"
    || normalized === "immediate"
    || normalized === "page-load"
    || normalized === "manual"
  ) {
    return normalized;
  }
  return fallback;
}

function parseEnhancementOptions(
  value: string | null,
  name: string,
): { options?: Record<string, unknown>; error?: string } {
  if (!value || !value.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { options: parsed as Record<string, unknown> };
    }
    return {
      error: `[resux] Options for "${name}" must be a JSON object.`,
    };
  } catch (error) {
    return {
      error: `[resux] Failed to parse options for "${name}". Ensure data-resux-options is valid JSON. ${getEnhancementErrorMessage(error)}`,
    };
  }
}

interface DeclaredClientEnhancement {
  name: string;
  trigger: ClientEnhancementTrigger;
  options?: Record<string, unknown>;
  error?: string;
}

function collectDeclaredClientEnhancementElements(root: ParentNode): Element[] {
  const selector = "[data-resux-enhancement], [use-client-enhancement]";
  const elements = [...root.querySelectorAll(selector)];
  const rootElement = root as Element;
  if (typeof rootElement.matches === "function" && rootElement.matches(selector)) {
    elements.unshift(rootElement);
  }
  return elements;
}

function readDeclaredClientEnhancement(element: Element): DeclaredClientEnhancement | null {
  const name = (
    element.getAttribute("data-resux-enhancement")
    ?? element.getAttribute("use-client-enhancement")
    ?? ""
  ).trim();
  if (!name) {
    return null;
  }

  const trigger = normalizeEnhancementTrigger(
    element.getAttribute("data-resux-trigger")
    ?? element.getAttribute("data-trigger")
    ?? element.getAttribute("trigger"),
    "visible",
  );
  const optionsAttributeValue = (
    element.getAttribute("data-resux-options")
    ?? element.getAttribute("data-resux-enhancement-options")
    ?? element.getAttribute("data-enhancement-options")
    ?? element.getAttribute("data-options")
  );
  const parsedOptions = parseEnhancementOptions(optionsAttributeValue, name);
  if (optionsAttributeValue !== null) {
    element.setAttribute("data-resux-options", optionsAttributeValue);
  }
  return {
    name,
    trigger,
    options: parsedOptions.options,
    error: parsedOptions.error,
  };
}

function reportDeclaredClientEnhancementError(
  element: Element,
  declaration: DeclaredClientEnhancement,
  error: string,
): void {
  setEnhancementStatus(element, "error");
  element.setAttribute("data-rx-enhancement-error", error);
  dispatchEnhancementEvent("error", {
    name: declaration.name,
    trigger: declaration.trigger,
    elementId: readEnhancementElementId(element),
    error,
  });
}

function prepareDeclaredClientEnhancement(
  element: Element,
  declaration: DeclaredClientEnhancement,
): void {
  resuxBoundEnhancementTargets.add(element);
  element.setAttribute("data-resux-enhancement", declaration.name);
  element.setAttribute("data-resux-trigger", declaration.trigger);
  element.setAttribute("data-rx-enhancement", declaration.name);
  element.setAttribute("data-rx-enhancement-trigger", declaration.trigger);
  setEnhancementStatus(element, "found");
  dispatchEnhancementEvent("found", {
    name: declaration.name,
    trigger: declaration.trigger,
    elementId: readEnhancementElementId(element),
  });
  logEnhancementDebug(`found element ${declaration.name} trigger=${declaration.trigger}`);
}

async function activateDeclaredClientEnhancement(element: Element): Promise<void> {
  if (resuxBoundEnhancementTargets.has(element)) {
    return;
  }
  const declaration = readDeclaredClientEnhancement(element);
  if (!declaration) {
    return;
  }
  if (declaration.error) {
    reportDeclaredClientEnhancementError(element, declaration, declaration.error);
    return;
  }

  prepareDeclaredClientEnhancement(element, declaration);
  try {
    await useClientEnhancement(declaration.name, {
      target: element,
      trigger: declaration.trigger,
      options: declaration.options,
    });
    setEnhancementBound(element, true);
    element.removeAttribute("data-rx-enhancement-error");
  } catch (error) {
    resuxBoundEnhancementTargets.delete(element);
    setEnhancementBound(element, false);
    reportDeclaredClientEnhancementError(
      element,
      declaration,
      getEnhancementErrorMessage(error),
    );
  }
}

async function activateDeclaredClientEnhancements(root: ParentNode = document): Promise<void> {
  if (!isClientRuntime() || !root?.querySelectorAll) {
    return;
  }
  logEnhancementDebug("scanning DOM");
  for (const element of collectDeclaredClientEnhancementElements(root)) {
    await activateDeclaredClientEnhancement(element);
  }
}


function uniqueArray<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function defineEventHandler(handler: EventHandler): EventHandler {
  return handler;
}

export const eventHandler = defineEventHandler;

export function defineServerMiddleware(middleware: ServerMiddleware): ServerMiddleware {
  return middleware;
}

export async function readBody<T = unknown>(event: EventHandlerEvent): Promise<T> {
  const req = event.node.req;
  if (req && typeof (req as any).on === "function") {
    try {
      return await h3ReadBody(event as unknown as Parameters<typeof h3ReadBody>[0]) as T;
    } catch {
      // Fall through to the minimal reader for tests and custom Node-like events.
    }
  }

  if (!req || typeof (req as any)[Symbol.asyncIterator] !== "function") {
    return undefined as T;
  }

  const decoder = new TextDecoder("utf-8");
  let raw = "";
  for await (const chunk of req as AsyncIterable<Uint8Array | string>) {
    if (typeof chunk === "string") {
      raw += chunk;
    } else {
      raw += decoder.decode(chunk, { stream: true });
    }
  }
  raw += decoder.decode();

  if (!raw) {
    return undefined as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

export function getQuery(event: EventHandlerEvent): Record<string, string | string[]> {
  try {
    return h3GetQuery(event as unknown as Parameters<typeof h3GetQuery>[0]) as Record<string, string | string[]>;
  } catch {
    return event.query;
  }
}

export function setHeader(event: EventHandlerEvent, name: string, value: number | string | string[]): void {
  h3SetHeader(event as unknown as Parameters<typeof h3SetHeader>[0], name, value);
}

export async function renderApp(options: RenderAppOptions): Promise<RenderResult> {
  return renderAppAsync(options);
}

export function renderDocument(result: RenderResult, title = "Resux App", options: RenderDocumentOptions = {}): string {
  const payload = escapeJsonForHtml(JSON.stringify(result.payload));
  const mergedHead = mergeHead([{ title }, result.head]);
  const htmlAttrs = {
    lang: "en",
    ...(mergedHead.htmlAttrs ?? {})
  };
  return [
    "<!doctype html>",
    `<html ${renderAttributes(htmlAttrs)}>`,
    "<head>",
    renderHead(mergedHead),
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>
[data-rx-block] {
  display: contents !important;
}
[data-rx-video-shell="true"] {
  position: relative;
  display: block;
  isolation: isolate;
}
.resux-video {
  position: relative;
  display: block;
  isolation: isolate;
  --resux-video-radius: 0.9rem;
  --resux-video-accent: #38bdf8;
  --resux-video-controls-color: #e2e8f0;
  --resux-video-controls-bg: rgba(2, 6, 23, 0.74);
}
.resux-video.resux-video--rounded .resux-video__stage,
.resux-video.resux-video--rounded video {
  border-radius: var(--resux-video-radius, 0.9rem);
}
.resux-video.resux-video--shadow .resux-video__stage {
  box-shadow: 0 14px 36px rgba(2, 6, 23, 0.35);
}
.resux-video[data-rx-video-theme="light"] {
  --resux-video-controls-color: #0f172a;
  --resux-video-controls-bg: rgba(248, 250, 252, 0.84);
}
.resux-video[data-rx-video-theme="dark"] {
  --resux-video-controls-color: #e2e8f0;
  --resux-video-controls-bg: rgba(2, 6, 23, 0.74);
}
[data-rx-video-shell="true"] .resux-video__stage {
  position: relative;
  display: block;
  overflow: hidden;
  --rx-video-controls-hit-area: 0px;
}
[data-rx-video-shell="true"] > video {
  display: block;
  width: 100%;
  height: auto;
  background: #020617;
}
[data-rx-video-shell="true"] .resux-video__stage > video {
  display: block;
  width: 100%;
  height: auto;
  background: #020617;
}
[data-rx-video-shell="true"][data-rx-video-native-controls="true"] .resux-video__stage {
  --rx-video-controls-hit-area: 4.25rem;
}
[data-rx-video-click-zones] {
  position: absolute;
  inset: 0 0 var(--rx-video-controls-hit-area, 0px) 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  pointer-events: none;
  z-index: 2;
}
[data-rx-video-click-zones][hidden] {
  display: none;
}
[data-rx-video-click-zones] .rx-video-zone {
  appearance: none;
  border: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  color: #e2e8f0;
  font: inherit;
  cursor: default;
  pointer-events: none;
  position: relative;
}
[data-rx-video-click-zones] .rx-video-zone::after {
  content: attr(data-rx-skip-indicator);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 4.3rem;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.01em;
  font-weight: 700;
  background: rgba(2, 6, 23, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.22);
  opacity: 0;
  transition: opacity 140ms ease;
  pointer-events: none;
}
[data-rx-video-click-zones] .rx-video-zone[data-resux-video-zone="center"]::after {
  content: "";
}
[data-rx-video-click-zones] .rx-video-zone:hover::after,
[data-rx-video-click-zones] .rx-video-zone:focus-visible::after {
  opacity: 1;
}
[data-rx-video-feedback] {
  position: absolute;
  inset: 0 0 var(--rx-video-controls-hit-area, 0px) 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transform: scale(0.94);
  transition: opacity 140ms ease, transform 140ms ease;
}
[data-rx-video-feedback][data-rx-video-feedback-visible="true"] {
  opacity: 1;
  transform: scale(1);
}
[data-rx-video-feedback] > span {
  min-width: 3.4rem;
  border-radius: 999px;
  padding: 0.35rem 0.72rem;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  background: rgba(2, 6, 23, 0.72);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.28);
}
[data-rx-video-controls] {
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.8rem;
  background: var(--rx-video-controls-bg, var(--resux-video-controls-bg, rgba(2, 6, 23, 0.74)));
  color: var(--rx-video-controls-fg, var(--resux-video-controls-color, #e2e8f0));
  border: 1px solid rgba(148, 163, 184, 0.28);
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: translateY(0.45rem);
  transition: opacity 160ms ease, transform 160ms ease;
  pointer-events: none;
  z-index: 3;
}
[data-rx-video-shell="true"]:hover [data-rx-video-controls],
[data-rx-video-shell="true"]:focus-within [data-rx-video-controls],
[data-rx-video-shell="true"][data-rx-video-state="paused"] [data-rx-video-controls] {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
[data-rx-video-shell="true"][data-rx-video-controls-ready="false"] [data-rx-video-controls] {
  opacity: 0;
  transform: translateY(0.55rem);
  pointer-events: none;
}
[data-rx-video-controls] .rx-video-btn {
  appearance: none;
  border: 0;
  border-radius: 0.6rem;
  background: rgba(15, 23, 42, 0.86);
  color: inherit;
  font: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.01em;
  font-weight: 700;
  line-height: 1;
  padding: 0.45rem 0.6rem;
  min-width: 2.35rem;
  cursor: pointer;
}
[data-rx-video-controls] .rx-video-btn:hover {
  background: rgba(30, 41, 59, 0.94);
}
[data-rx-video-controls] .rx-video-time {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}
[data-rx-video-controls] .rx-video-seek {
  flex: 1 1 auto;
  min-width: 3.5rem;
}
[data-rx-video-controls] .rx-video-volume {
  width: 4.4rem;
}
[data-rx-video-controls] input[type="range"] {
  accent-color: var(--rx-video-controls-accent, var(--resux-video-accent, #38bdf8));
}
[data-rx-video-controls].rx-video-controls-compact {
  left: auto;
  right: 0.75rem;
  max-width: calc(100% - 1.5rem);
  width: auto;
  display: inline-flex;
  gap: 0.35rem;
}
[data-rx-video-controls] .rx-video-quality-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}
[data-rx-video-controls] .rx-video-quality-prefix {
  font-size: 0.67rem;
  font-weight: 700;
  opacity: 0.9;
}
[data-rx-video-controls] .rx-video-quality-select {
  appearance: none;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.55rem;
  background: rgba(15, 23, 42, 0.86);
  color: inherit;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  max-width: 6.6rem;
  min-width: 3.8rem;
  padding: 0.38rem 0.45rem;
}
[data-rx-video-controls] .rx-video-quality-select:focus-visible,
[data-rx-video-controls] .rx-video-btn:focus-visible {
  outline: 2px solid var(--rx-video-controls-accent, #38bdf8);
  outline-offset: 1px;
}
@media (max-width: 640px) {
  [data-rx-video-controls] {
    flex-wrap: wrap;
    row-gap: 0.35rem;
  }
  [data-rx-video-controls].rx-video-controls-compact {
    right: 0.5rem;
    left: 0.5rem;
    width: calc(100% - 1rem);
    justify-content: flex-end;
  }
  [data-rx-video-controls] .rx-video-quality-select {
    max-width: 5.4rem;
  }
}
[data-rx-loading-indicator] {
  position: fixed;
  inset: 0 0 auto;
  z-index: 9999;
  pointer-events: none;
}
[data-rx-loading-indicator][hidden] {
  display: none;
}
[data-rx-loading-indicator] .rx-loading-bar {
  height: var(--resux-loader-height, 3px);
  overflow: hidden;
  background: rgba(24, 24, 27, 0.12);
}
[data-rx-loading-indicator] .rx-loading-progress {
  display: block;
  width: var(--resux-progress, 8%);
  height: 100%;
  background: var(--resux-loader-color, #2563eb);
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.45);
  transition: width 160ms ease, background 160ms ease;
}
[data-rx-loading-indicator] .rx-loading-slot {
  width: fit-content;
  max-width: min(28rem, calc(100vw - 2rem));
  margin: 0.75rem auto 0;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgba(24, 24, 27, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 32px rgba(24, 24, 27, 0.12);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}
[data-rx-loading-indicator][data-state="error"] .rx-loading-progress {
  background: var(--resux-loader-error-color, #dc2626);
}
[data-rx-loading-indicator][data-state="complete"] .rx-loading-progress {
  background: #16a34a;
}
#__resux[data-route-transition="loading"] {
  opacity: 0.72;
  transition: opacity 120ms ease;
}
@media (prefers-reduced-motion: reduce) {
  [data-rx-loading-indicator] .rx-loading-progress,
  #__resux[data-route-transition="loading"] {
    transition: none;
  }
}
</style>`,
    "</head>",
    "<body>",
    '<div id="__resux">',
    result.html,
    "</div>",
    (options.isStatic || (typeof process !== "undefined" && process.env?.RESUX_STATIC))
      ? `<script>window.__RESUX__=${payload};window.__RESUX_STATIC__=true;</script>`
      : `<script>window.__RESUX__=${payload}</script>`,
    options.devReload ? getDevReloadScript() : "",
    '<script type="module" src="/__resux/runtime-client.mjs"></script>',
    "</body>",
    "</html>"
  ].join("");
}

function getDevReloadScript(): string {
  return `<script type="module">
if (typeof EventSource !== "undefined" && !window.__RESUX_DEV_RELOAD__) {
  window.__RESUX_DEV_RELOAD__ = true;
  const events = new EventSource("/__resux/dev-events");
  events.addEventListener("hmr", (event) => {
    const payload = event.data ? JSON.parse(event.data) : {};
    if (typeof window.__RESUX_APPLY_DEV_UPDATE__ === "function") {
      void window.__RESUX_APPLY_DEV_UPDATE__(payload).catch(() => window.location.reload());
    } else {
      window.location.reload();
    }
  });
  events.addEventListener("reload", () => window.location.reload());
}
</script>`;
}

class ResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly globalStateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;
  private readonly headEntries: HeadEntry[] = [];
  private readonly styleIds = new Set<string>();
  private readonly resuxApp: ResuxAppLike;

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly runtimeConfig: RuntimeConfig = { public: {} }
  ) {
    this.resuxApp = createResuxApp(route, modules, runtimeConfig);
  }

  async renderComponent(
    definition: ComponentDefinition,
    renderPage?: () => Promise<string>,
    renderSlot?: () => Promise<string>,
    props: ComponentProps = {}
  ): Promise<string> {
    this.collectComponentStyles(definition);
    const scopeId = `s${this.nextScopeId++}`;
    const stateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;
    const globalStateKeys = new Set<string>();
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = Object.create(null) as Record<string, AsyncDataResource<unknown>>;
    const setupContext = createServerSetupContext(
      this.route,
      props,
      stateRefs,
      asyncDataRefs,
      this.headEntries,
      this.resuxApp,
      this.runtimeConfig,
      this.globalStateRefs,
      globalStateKeys
    );
    const scope = await withActiveResuxApp(this.resuxApp, () => definition.script(setupContext));

    this.scopes[scopeId] = {
      id: scopeId,
      moduleId: definition.id,
      props,
      stateRefs,
      globalStateKeys,
      asyncDataRefs
    };

    return withActiveResuxApp(this.resuxApp, () => renderTemplateNodes(definition.template, {
      scope,
      scopeId,
      moduleId: definition.id,
      styleScopeId: definition.styleScopeId,
      route: this.route,
      runtimeConfig: this.runtimeConfig,
      components: this.components,
      layouts: {},
      pageMeta: definition.meta ?? {},
      addHeadEntry: (entry) => insertHeadEntryWithPriority(this.headEntries, entry),
      renderPage,
      renderSlot
    }));
  }

  private collectComponentStyles(definition: ComponentDefinition): void {
    for (const style of definition.styles ?? []) {
      if (this.styleIds.has(style.id)) {
        continue;
      }
      this.styleIds.add(style.id);
      this.headEntries.push({ style: [style] });
    }
  }

  createPayload(): ResuxPayload {
    const scopes: Record<string, SerializedScope> = {};

    for (const [id, scope] of Object.entries(this.scopes)) {
      scopes[id] = {
        id,
        moduleId: scope.moduleId,
        props: serializeProps(scope.props),
        state: serializeRefs(scope.stateRefs),
        globalStateKeys: [...scope.globalStateKeys],
        asyncData: serializeAsyncData(scope.asyncDataRefs)
      };
    }

    return {
      route: this.route,
      scopes,
      globalState: serializeRefs(this.globalStateRefs),
      modules: this.modules,
      config: publicRuntimeConfig(this.runtimeConfig)
    };
  }
}

function normalizeComponentRegistryKey(
  key: string,
  apiName: "useState" | "useAsyncData"
): string {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error(`${apiName}(key) requires a non-empty key.`);
  }
  return normalizedKey;
}

function hasOwnRegistryKey(registry: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(registry, key);
}

function setRegistryValue<T>(registry: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function createFetchAsyncDataKey(url: string, init?: RequestInit): string {
  return `fetch:${hashFetchIdentity(serializeFetchRequestIdentity(url, init))}`;
}

function serializeFetchRequestIdentity(url: string, init?: RequestInit): string {
  const headers: Array<[string, string]> = [];
  if (typeof Headers !== "undefined") {
    try {
      new Headers(init?.headers).forEach((value, key) => headers.push([key, value]));
      headers.sort(([left], [right]) => left.localeCompare(right));
    } catch {
      // Invalid headers will be reported by fetch itself; keep the cache key deterministic.
    }
  }
  const extended = (init ?? {}) as RequestInit & { duplex?: string; priority?: string };
  return JSON.stringify({
    url,
    method: String(init?.method ?? "GET").toUpperCase(),
    headers,
    body: serializeFetchRequestBody(init?.body),
    cache: init?.cache ?? "",
    credentials: init?.credentials ?? "",
    integrity: init?.integrity ?? "",
    keepalive: init?.keepalive ?? false,
    mode: init?.mode ?? "",
    redirect: init?.redirect ?? "",
    referrer: init?.referrer ?? "",
    referrerPolicy: init?.referrerPolicy ?? "",
    duplex: extended.duplex ?? "",
    priority: extended.priority ?? ""
  });
}

function serializeFetchRequestBody(body: BodyInit | null | undefined): unknown {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return ["string", body];
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return ["url-search-params", body.toString()];
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return ["form-data", ...Array.from(body.entries()).map(([key, value]) => [
      key,
      typeof value === "string"
        ? ["string", value]
        : ["file", value.name, value.size, value.type, value.lastModified]
    ])];
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    const file = body as Blob & { name?: string; lastModified?: number };
    return ["blob", file.name ?? "", body.size, body.type, file.lastModified ?? 0];
  }
  if (body instanceof ArrayBuffer) {
    const bytes = new Uint8Array(body);
    return ["array-buffer", bytes.byteLength, hashFetchBytes(bytes)];
  }
  if (ArrayBuffer.isView(body)) {
    const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    return ["array-buffer-view", bytes.byteLength, hashFetchBytes(bytes)];
  }
  return ["body", Object.prototype.toString.call(body)];
}

function hashFetchBytes(bytes: Uint8Array): string {
  let first = 2166136261;
  let second = 2246822519;
  for (const byte of bytes) {
    first = Math.imul(first ^ byte, 16777619);
    second = Math.imul(second ^ byte, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
}

function hashFetchIdentity(value: string): string {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
}

function createServerI18nContext(route: RouteContext, runtimeConfig: RuntimeConfig): any {
  const config = normalizeI18nRuntimeConfig(runtimeConfig.public?.i18n);
  if (!config) {
    return {
      locale: ref("en"),
      dir: ref("ltr"),
      locales: [],
      defaultLocale: "en",
      fallbackLocale: "en",
      strategy: "prefix_except_default",
      t: (key: string) => key,
      tm: (key: string) => key,
      resolveLocalized: (value: unknown) => typeof value === "string" ? value : null,
      localePath: (to: string) => to,
      switchLocalePath: (_localeCode: string, to?: string) => to ?? route.path,
      setLocale: () => {}
    };
  }

  const resolved = resolveI18nRoute(route.path, config);
  const locale = ref(resolved.locale.code);
  const dir = ref(resolveLocaleDirection(config, resolved.locale.code));
  return {
    locale,
    dir,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    fallbackLocale: config.fallbackLocale,
    strategy: config.strategy,
    t(key: string, params: Record<string, string | number | boolean | null | undefined> = {}): string {
      return translateText(config, locale.value, key, params);
    },
    tm(key: string): unknown {
      return translateRaw(config, locale.value, key);
    },
    resolveLocalized(value: unknown): string | null {
      return resolveLocalizedValue(value, locale.value, config.fallbackLocale);
    },
    localePath(to: string, localeCode?: string): string {
      return buildLocalePath(to, localeCode ?? locale.value, config);
    },
    switchLocalePath(localeCode: string, to?: string): string {
      return buildLocalePath(to ?? route.path, localeCode, config);
    },
    setLocale: () => {}
  };
}

export function createServerSetupContext(
  route: RouteContext,
  props: ComponentProps,
  stateRefs: Record<string, Ref<unknown>>,
  asyncDataRefs: Record<string, AsyncDataResource<unknown>>,
  headEntries: HeadEntry[],
  resuxApp: ResuxAppLike,
  runtimeConfig: RuntimeConfig,
  globalStateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>,
  globalStateKeys: Set<string> = new Set()
): SetupContext {
  const apiURL = (url: string): string => resolveServerApiURL(url, route, runtimeConfig);
  const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const requestUrl = apiURL(url);
    const response = await fetch(requestUrl, init);
    if (!response.ok) {
      throw new Error(`Fetch failed for ${requestUrl}: ${response.status}`);
    }
    return response.json() as Promise<T>;
  };

  const ctx: SetupContext = {
    props,
    ref,
    reactive,
    computed,
    watch,
    watchEffect,
    readonly,
    toRef,
    toRefs,
    unref,
    isRef,
    isReactive,
    isReadonly,
    nextTick,

    useState<T>(key: string, factory?: () => T): Ref<T> {
      const normalizedKey = normalizeComponentRegistryKey(key, "useState");
      if (hasOwnRegistryKey(stateRefs, normalizedKey)) {
        return stateRefs[normalizedKey] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useState("${normalizedKey}")`);
      const stateRef = ref(value as T);
      setRegistryValue(stateRefs, normalizedKey, stateRef as Ref<unknown>);
      return stateRef;
    },

    useGlobalState<T>(key: string, factory?: () => T): Ref<T> {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) {
        throw new Error("useGlobalState(key) requires a non-empty key.");
      }
      globalStateKeys.add(normalizedKey);
      if (Object.prototype.hasOwnProperty.call(globalStateRefs, normalizedKey)) {
        return globalStateRefs[normalizedKey] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useGlobalState("${normalizedKey}")`);
      const stateRef = ref(value as T);
      globalStateRefs[normalizedKey] = stateRef as Ref<unknown>;
      return stateRef;
    },

    useAsyncData<T>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>): AsyncDataResource<T> {
      const normalizedKey = normalizeComponentRegistryKey(key, "useAsyncData");
      if (hasOwnRegistryKey(asyncDataRefs, normalizedKey)) {
        return asyncDataRefs[normalizedKey] as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      setRegistryValue(asyncDataRefs, normalizedKey, pending.resource as AsyncDataResource<unknown>);
      pending.setCompletion(settleAsyncDataResource(pending.resource, handler, normalizedKey));
      return pending.resource;
    },

    defineProps<T extends Record<string, unknown> = Record<string, unknown>>(): T {
      return props as T;
    },

    defineEmits<T = (...args: any[]) => void>(_emits?: unknown): (...args: any[]) => void {
      return (..._args: any[]) => {};
    },

    emit(..._args: any[]): void {},

    defineExpose(_exposed?: Record<string, any>): void {},

    defineSlots<T = Record<string, any>>(): T {
      return {} as T;
    },

    defineOptions(_options?: Record<string, any>): void {},

    defineModel<T>(name?: string, _options?: unknown): Ref<T> {
      const modelName = name ?? "modelValue";
      return ref(props[modelName]) as Ref<T>;
    },

    useRoute(): RouteContext {
      return route;
    },

    useRouter(): ResuxRouter {
      return createServerRouter();
    },

    useHead(input: HeadEntry): void {
      headEntries.push(input);
    },

    useSeoMeta(input: SeoMetaInput): void {
      headEntries.push(seoMetaToHead(input));
    },

    useRuntimeConfig(): RuntimeConfig {
      return runtimeConfig;
    },

    useResuxApp(): ResuxAppLike {
      return resuxApp;
    },

    apiURL,

    useResuxImage(): ResuxImageBuilder {
      return createResuxImageBuilder(route, runtimeConfig, false);
    },

    useFetch<T>(url: string, init?: RequestInit): AsyncDataResource<T> {
      const key = createFetchAsyncDataKey(url, init);
      if (hasOwnRegistryKey(asyncDataRefs, key)) {
        return asyncDataRefs[key] as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      setRegistryValue(asyncDataRefs, key, pending.resource as AsyncDataResource<unknown>);
      pending.setCompletion(settleAsyncDataResource(pending.resource, () => fetchJson<T>(url, init), key));
      return pending.resource;
    },

    $fetch<T>(url: string, init?: RequestInit): Promise<T> {
      return fetchJson<T>(url, init);
    },

    useError(): Ref<ResuxError | null> {
      return readActiveResuxError();
    },

    clearError(): void {
      clearError();
    },

    showError(input: string | Partial<ResuxError>): never {
      return showError(input);
    },

    createError(input: string | Partial<ResuxError>): ResuxError {
      return createError(input);
    },

    useLazyPackage<T = unknown>(name: string, options: ResuxLazyPackageOptions = {}): Promise<T> {
      return useLazyPackage<T>(name, options);
    },

    useClientPackage<T = unknown>(
      name: string,
      options: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode"> = {},
    ): Promise<T> {
      return useClientPackage<T>(name, options);
    },

    usePackageReady(name: string): boolean {
      return usePackageReady(name);
    },

    defineLazyPackage<T = unknown>(name: string, options: ResuxLazyPackageOptions = {}): ResuxLazyPackageLoader<T> {
      return defineLazyPackage<T>(name, options);
    },

    defineClientOnlyPackage<T = unknown>(
      name: string,
      options: Omit<ResuxLazyPackageOptions, "clientOnly" | "mode"> = {},
    ): ResuxLazyPackageLoader<T> {
      return defineClientOnlyPackage<T>(name, options);
    },

    definePackageAdapter<TOptions extends Record<string, unknown> = Record<string, unknown>>(
      definition: PackageAdapterDefinition<TOptions>,
    ): { name: string; setup: ClientEnhancementSetup } {
      return definePackageAdapter(definition);
    },

    defineClientEnhancement(name: string, setup: ClientEnhancementSetup): { name: string; setup: ClientEnhancementSetup } {
      return defineClientEnhancement(name, setup);
    },

    useClientEnhancement(
      name: string,
      options: UseClientEnhancementOptions = {},
    ): Promise<{ ready: boolean; activate: () => Promise<void>; dispose: () => Promise<void> }> {
      return useClientEnhancement(name, options);
    },

    onMounted(): void {
      // Client lifecycle hooks run when a resumable scope is first resumed.
    },

    definePageMeta(): void {
      // Page meta is compiled statically in Resux.
    },
    useI18n(): any {
      return createServerI18nContext(route, runtimeConfig);
    },
    useLocalePath(): any {
      return createServerI18nContext(route, runtimeConfig).localePath;
    },
    useSwitchLocalePath(): any {
      return createServerI18nContext(route, runtimeConfig).switchLocalePath;
    },
    useDevice(): DeviceInfo {
      return parseUserAgent(route.userAgent);
    },
    $device: parseUserAgent(route.userAgent),
    $t(key: string, params?: Record<string, unknown>): string {
      const i18nCandidate = runtimeConfig.public?.i18n;
      const normalizedI18n = normalizeI18nRuntimeConfig(i18nCandidate);
      if (normalizedI18n) {
        const currentLocaleCode = resolveI18nRoute(route.path, normalizedI18n).locale.code;
        return translateText(normalizedI18n, currentLocaleCode, key, params as any);
      }
      return key;
    },
    $tm(key: string): unknown {
      const i18nCandidate = runtimeConfig.public?.i18n;
      const normalizedI18n = normalizeI18nRuntimeConfig(i18nCandidate);
      if (normalizedI18n) {
        const currentLocaleCode = resolveI18nRoute(route.path, normalizedI18n).locale.code;
        return translateRaw(normalizedI18n, currentLocaleCode, key);
      }
      return key;
    }
  };

  const runtimeGlobals = globalThis as any;
  if (runtimeGlobals.__RESUX_SERVER_I18N_GLOBALS__ !== true) {
    runtimeGlobals.$t = (key: string, params?: Record<string, unknown>): string => {
      try {
        const app = useResuxApp();
        const normalizedI18n = normalizeI18nRuntimeConfig(app.$config.public?.i18n);
        if (!normalizedI18n) return key;
        const locale = resolveI18nRoute(app.route.path, normalizedI18n).locale.code;
        return translateText(normalizedI18n, locale, key, params as any);
      } catch {
        return key;
      }
    };
    runtimeGlobals.$tm = (key: string): unknown => {
      try {
        const app = useResuxApp();
        const normalizedI18n = normalizeI18nRuntimeConfig(app.$config.public?.i18n);
        if (!normalizedI18n) return key;
        const locale = resolveI18nRoute(app.route.path, normalizedI18n).locale.code;
        return translateRaw(normalizedI18n, locale, key);
      } catch {
        return key;
      }
    };
    runtimeGlobals.__RESUX_SERVER_I18N_GLOBALS__ = true;
  }

  return ctx;
}

function createPendingAsyncDataResource<T>(): {
  resource: AsyncDataResource<T>;
  setCompletion: (completion: Promise<void>) => void;
} {
  const value = ref<T | undefined>(undefined);
  const pending = ref(true);
  const error = ref<AsyncDataError | null>(null);
  let completion: Promise<void> = Promise.resolve();
  const resource: AsyncDataResource<T> = {
    data: value,
    value,
    pending,
    error,
    then<TResult1 = AwaitedAsyncDataResource<T>, TResult2 = never>(
      onfulfilled?: ((value: AwaitedAsyncDataResource<T>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
      return completion.then(() => {
        const resolved: AwaitedAsyncDataResource<T> = {
          data: resource.data,
          value: resource.value,
          pending: resource.pending,
          error: resource.error
        };
        return onfulfilled ? onfulfilled(resolved) : resolved as unknown as TResult1;
      }, onrejected);
    }
  };

  return {
    resource,
    setCompletion(nextCompletion: Promise<void>) {
      completion = nextCompletion;
    }
  };
}

async function settleAsyncDataResource<T>(
  resource: AsyncDataResource<T>,
  handler: ((context: AsyncDataHandlerContext) => T | Promise<T>) | undefined,
  key: string
): Promise<void> {
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const value = handler ? await handler({ signal: controller?.signal }) : undefined;
    assertJsonSerializable(value, `useAsyncData("${key}")`);
    resource.value.value = value as T;
    resource.error.value = null;
  } catch (error) {
    resource.value.value = undefined;
    resource.error.value = normalizeAsyncDataError(error);
  } finally {
    resource.pending.value = false;
  }
}

function createServerRouter(): ResuxRouter {
  const navigate = (): void => {
    // Client navigation is only available after hydration.
  };
  return {
    push: navigate,
    replace: navigate,
    back: navigate,
    forward: navigate,
    go: navigate
  };
}

function resolveServerApiURL(url: string, route: RouteContext, runtimeConfig: RuntimeConfig): string {
  if (!isInternalApiURL(url)) {
    return url;
  }

  const origin = route.origin
    ?? runtimeOrigin(runtimeConfig)
    ?? "http://localhost:3000";
  return new URL(url, origin).href;
}

function isInternalApiURL(url: string): boolean {
  return url === "/api" || url.startsWith("/api/");
}

function createResuxImageBuilder(
  route: RouteContext,
  runtimeConfig: RuntimeConfig,
  client: boolean,
): ResuxImageBuilder {
  return (src: string, options: UseResuxImageOptions = {}): string => {
    const normalizedSrc = normalizeImageSource(src, route);
    const imageConfig = resolveRuntimeImageConfig(runtimeConfig);
    const providerName = (options.provider ?? imageConfig.provider ?? "resux").trim();
    const providerConfig = resolveImageProviderConfig(providerName, imageConfig);
    const cache =
      normalizeImageCacheValue(options.cache)
      ?? normalizeImageCacheValue(imageConfig.cache);
    const modifiers = normalizeImageModifiers({
      ...(providerConfig.modifiers ?? {}),
      ...(typeof imageConfig.quality === "number" ? { quality: imageConfig.quality } : {}),
      ...(typeof imageConfig.format === "string" ? { format: imageConfig.format } : {}),
      ...(options.modifiers ?? {}),
      ...(typeof options.width === "number" ? { width: options.width } : {}),
      ...(typeof options.height === "number" ? { height: options.height } : {}),
      ...(typeof options.quality === "number" ? { quality: options.quality } : {}),
      ...(typeof options.fit === "string" ? { fit: options.fit } : {}),
      ...(typeof options.format === "string" ? { format: options.format } : {}),
    });

    return buildResuxImageURL(
      providerName,
      providerConfig.baseURL,
      normalizedSrc,
      modifiers,
      client,
      cache,
    );
  };
}

interface ResuxVideoTransformSourceOptions {
  format?: string;
  quality?: number;
  cache?: unknown;
}

function createResuxVideoTransformBuilder(
  route: RouteContext,
  runtimeConfig: RuntimeConfig,
): (src: string, options?: ResuxVideoTransformSourceOptions) => ResuxVideoSourceInput {
  return (src: string, options: ResuxVideoTransformSourceOptions = {}): ResuxVideoSourceInput => {
    const normalizedSrc = normalizeImageSource(src, route);
    const runtimeVideoConfig = resolveRuntimeVideoConfig(runtimeConfig);
    const transformConfig = runtimeVideoConfig.transforms;
    const normalizedFormat = normalizeVideoTransformFormat(options.format);
    const normalizedQuality = normalizeVideoTransformQualityValue(options.quality);
    const inputFormat = inferVideoExtensionFromSource(normalizedSrc);
    const shouldConvertFormat = Boolean(
      normalizedFormat
      && (!inputFormat || inputFormat !== normalizedFormat),
    );
    const shouldTransform = Boolean(shouldConvertFormat || normalizedQuality);
    const transformsEnabled = transformConfig?.enabled === true || shouldTransform;
    if (!normalizedSrc || !shouldTransform || !transformsEnabled) {
      return {
        src: normalizedSrc,
        type: resolveVideoMimeTypeFromSource(normalizedSrc),
      };
    }

    const cache = normalizeImageCacheValue(options.cache ?? transformConfig?.cache);
    const query = new URLSearchParams();
    query.set("src", normalizedSrc);
    if (normalizedFormat) {
      query.set("format", normalizedFormat);
    }
    if (normalizedQuality) {
      query.set("quality", String(normalizedQuality));
    }
    if (cache) {
      query.set("cache", cache);
    }

    const baseURL = transformConfig?.baseURL ?? "/__resux/video";
    const generatedPath = createGeneratedVideoRoutePath(
      normalizedSrc,
      normalizedFormat,
      normalizedQuality,
    );
    const queryString = query.toString();
    const resolvedSrc = cache
      ? (queryString.length > 0 ? `${generatedPath}?${queryString}` : generatedPath)
      : (queryString.length > 0
        ? `${baseURL}${baseURL.includes("?") ? "&" : "?"}${queryString}`
        : baseURL);

    return {
      src: resolvedSrc,
      type: resolveVideoMimeTypeFromSource(
        normalizedFormat ? `.${normalizedFormat}` : normalizedSrc,
      ),
      ...(normalizedQuality ? { quality: normalizeVideoQualityLabel(normalizedQuality) } : {}),
    };
  };
}

function normalizeImageSource(src: string, route: RouteContext): string {
  const value = String(src ?? "").trim();
  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("data:")
    || value.startsWith("blob:")
    || value.startsWith("file:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  const basePath = route.path.startsWith("/") ? route.path : `/${route.path}`;
  const directory = basePath.endsWith("/")
    ? basePath
    : `${basePath.slice(0, Math.max(basePath.lastIndexOf("/") + 1, 1))}`;
  const normalized = new URL(value, `https://resux.local${directory}`);
  return `${normalized.pathname}${normalized.search}${normalized.hash}`;
}

function resolveRuntimeImageConfig(runtimeConfig: RuntimeConfig): ResuxImageConfig {
  const publicConfig = runtimeConfig.public ?? {};
  const candidate = (publicConfig.image ?? publicConfig.resuxImage) as unknown;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {};
  }
  const input = candidate as Record<string, unknown>;
  const providers = resolveImageProviders(input.providers);
  const densities = resolveImageDensities(input.densities);

  return {
    provider: typeof input.provider === "string" ? input.provider : undefined,
    quality: typeof input.quality === "number" ? normalizeImageQualityValue(input.quality) : undefined,
    format: typeof input.format === "string" ? input.format : undefined,
    cache: normalizeImageCacheValue(input.cache),
    ...(densities.length ? { densities } : {}),
    ...(Object.keys(providers).length ? { providers } : {}),
  };
}

function normalizeImageQualityValue(value: unknown, fallback = 86): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

function normalizeImageCacheValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }

  if (value === true) {
    return "1d";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return String(Math.round(value));
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
      return "1d";
    }
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
      return undefined;
    }
    return normalized;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of ["maxAge", "expiresIn", "ttl"]) {
      const normalized = normalizeImageCacheValue(record[key]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

function resolveImageProviders(value: unknown): Record<string, ResuxImageProviderConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const providers: Record<string, ResuxImageProviderConfig> = {};
  for (const [name, provider] of Object.entries(value as Record<string, unknown>)) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
      continue;
    }
    const record = provider as Record<string, unknown>;
    providers[name] = {
      ...(typeof record.baseURL === "string" ? { baseURL: record.baseURL } : {}),
      ...(record.modifiers && typeof record.modifiers === "object" && !Array.isArray(record.modifiers)
        ? { modifiers: normalizeImageModifiers(record.modifiers as ResuxImageModifiers) }
        : {}),
    };
  }
  return providers;
}

function resolveImageDensities(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.round(entry));
}

function resolveImageProviderConfig(
  providerName: string,
  imageConfig: ResuxImageConfig,
): ResuxImageProviderConfig {
  return imageConfig.providers?.[providerName] ?? {};
}

function normalizeImageModifiers(modifiers: ResuxImageModifiers): ResuxImageModifiers {
  const normalized: ResuxImageModifiers = {};
  for (const [key, value] of Object.entries(modifiers ?? {})) {
    if (value === false) {
      if (key === "format" || key === "quality") {
        (normalized as Record<string, string | number | boolean>)[key] = false;
      }
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }
    if (key === "cache") {
      continue;
    }
    if (key === "width" || key === "height" || key === "quality") {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        normalized[key] = Math.round(numeric);
      }
      continue;
    }
    normalized[key] = value as string | number | boolean;
  }
  return normalized;
}

function buildResuxImageURL(
  providerName: string,
  providerBaseURL: string | undefined,
  src: string,
  modifiers: ResuxImageModifiers,
  client: boolean,
  cacheOption?: string,
): string {
  const trimmedProvider = providerName.trim().toLowerCase();
  const baseURL = providerBaseURL?.trim()
    || (trimmedProvider === "vercel" ? "/_vercel/image" : "/__resux/image");
  const normalizedFormat = normalizeImageOutputFormat(
    typeof modifiers.format === "string" ? modifiers.format : undefined,
  );

  if (baseURL.includes("{src}")) {
    return injectImageTemplateSource(baseURL, src, modifiers);
  }

  const sourceDescriptor =
    trimmedProvider === "vercel"
      ? { publicSource: src }
      : rewriteImageSourceForDisplayFormat(src, normalizedFormat);
  const useGeneratedCache = trimmedProvider === "resux" && typeof cacheOption === "string" && cacheOption.length > 0;
  const query = new URLSearchParams();
  if (trimmedProvider === "vercel") {
    query.set("url", src);
  } else {
    query.set("src", sourceDescriptor.publicSource);
    if (sourceDescriptor.originalSource) {
      query.set("original", sourceDescriptor.originalSource);
    }
  }

  const width = Number(modifiers.width);
  const height = Number(modifiers.height);
  const quality = Number(modifiers.quality);
  if (Number.isFinite(width) && width > 0) {
    query.set("w", String(Math.round(width)));
  }
  if (Number.isFinite(height) && height > 0) {
    query.set("h", String(Math.round(height)));
  }
  if (Number.isFinite(quality) && quality > 0) {
    query.set("q", String(Math.round(quality)));
  }
  if (typeof modifiers.fit === "string" && modifiers.fit.length > 0) {
    query.set("fit", modifiers.fit);
  }
  if (normalizedFormat) {
    query.set("f", normalizedFormat);
  } else if (typeof modifiers.format === "string" && modifiers.format.length > 0) {
    query.set("f", modifiers.format);
  }

  for (const [key, value] of Object.entries(modifiers)) {
    if (["width", "height", "quality", "fit", "format"].includes(key)) {
      continue;
    }
    query.set(key, String(value));
  }

  if (useGeneratedCache) {
    query.set("cache", cacheOption!);
    const generatedPath = createGeneratedImageRoutePath(
      sourceDescriptor.publicSource,
      sourceDescriptor.originalSource,
      normalizedFormat,
      modifiers,
    );
    const queryString = query.toString();
    return queryString.length > 0 ? `${generatedPath}?${queryString}` : generatedPath;
  }

  const separator = baseURL.includes("?") ? "&" : "?";
  const queryString = query.toString();
  if (!queryString) {
    return baseURL;
  }
  const resolved = `${baseURL}${separator}${queryString}`;
  if (client) {
    return resolved;
  }
  return resolved;
}

function createGeneratedImageRoutePath(
  source: string,
  originalSource: string | undefined,
  normalizedFormat: string | undefined,
  modifiers: ResuxImageModifiers,
): string {
  const extension =
    normalizedFormat
    ?? inferImageExtensionFromSource(source)
    ?? inferImageExtensionFromSource(originalSource)
    ?? "bin";
  const signature = createImageTransformSignature(source, originalSource, normalizedFormat, modifiers);
  const digest = hashImageSignature(signature);
  return `/_resux/generated/images/${digest}.${extension}`;
}

function createImageTransformSignature(
  source: string,
  originalSource: string | undefined,
  normalizedFormat: string | undefined,
  modifiers: ResuxImageModifiers,
): string {
  const entries: string[] = [`src=${source}`];
  if (originalSource) {
    entries.push(`original=${originalSource}`);
  }
  const width = Number(modifiers.width);
  if (Number.isFinite(width) && width > 0) {
    entries.push(`w=${Math.round(width)}`);
  }
  const height = Number(modifiers.height);
  if (Number.isFinite(height) && height > 0) {
    entries.push(`h=${Math.round(height)}`);
  }
  if (typeof modifiers.fit === "string" && modifiers.fit.length > 0) {
    entries.push(`fit=${modifiers.fit}`);
  }
  if (normalizedFormat) {
    entries.push(`f=${normalizedFormat}`);
  }
  const quality = Number(modifiers.quality);
  if (Number.isFinite(quality) && quality > 0) {
    entries.push(`q=${Math.round(quality)}`);
  }
  const extraKeys = Object.keys(modifiers)
    .filter((key) => !["width", "height", "quality", "fit", "format", "cache"].includes(key))
    .sort();
  for (const key of extraKeys) {
    const value = modifiers[key];
    if (value === undefined || value === null || value === false) {
      continue;
    }
    entries.push(`${key}=${String(value)}`);
  }
  return entries.join("&");
}

function hashImageSignature(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function inferImageExtensionFromSource(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("data:")) {
    const mimeMatch = /^data:image\/([a-zA-Z0-9.+-]+);/i.exec(trimmed);
    if (!mimeMatch) {
      return undefined;
    }
    const normalized = mimeMatch[1].toLowerCase();
    return normalized === "jpg" ? "jpeg" : normalized;
  }

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const dotIndex = withoutQuery.lastIndexOf(".");
  if (dotIndex < 0) {
    return undefined;
  }
  const extension = withoutQuery.slice(dotIndex + 1).toLowerCase();
  if (!extension) {
    return undefined;
  }
  return extension === "jpg" ? "jpeg" : extension;
}

function injectImageTemplateSource(
  template: string,
  src: string,
  modifiers: ResuxImageModifiers,
): string {
  let resolved = template.replaceAll("{src}", encodeURIComponent(src));
  for (const [key, value] of Object.entries(modifiers)) {
    resolved = resolved.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
  }
  return resolved;
}

function normalizeImageOutputFormat(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized === "jpg" ? "jpeg" : normalized;
}

function createGeneratedVideoRoutePath(
  source: string,
  format: string | undefined,
  quality: number | undefined,
): string {
  const extension = format ?? inferVideoExtensionFromSource(source) ?? "mp4";
  const signature = createVideoTransformSignature(source, format, quality);
  const digest = hashImageSignature(signature);
  return `/_resux/generated/videos/${digest}.${extension}`;
}

function createVideoTransformSignature(
  source: string,
  format: string | undefined,
  quality: number | undefined,
): string {
  const entries: string[] = [`src=${source}`];
  if (format) {
    entries.push(`f=${format}`);
  }
  if (Number.isFinite(quality) && (quality as number) > 0) {
    entries.push(`q=${Math.round(quality as number)}`);
  }
  return entries.join("&");
}

function rewriteImageSourceForDisplayFormat(
  src: string,
  normalizedFormat: string | undefined,
): { publicSource: string; originalSource?: string } {
  if (!normalizedFormat) {
    return { publicSource: src };
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return { publicSource: src };
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const sourceUrl = new URL(src);
      const rewrittenPathname = rewriteImagePathExtension(
        sourceUrl.pathname,
        normalizedFormat,
      );
      if (rewrittenPathname === sourceUrl.pathname) {
        return { publicSource: src };
      }
      sourceUrl.pathname = rewrittenPathname;
      return { publicSource: sourceUrl.toString(), originalSource: src };
    } catch {
      return { publicSource: src };
    }
  }

  const [pathPart, suffix = ""] = src.split(/(?=[?#])/);
  const rewrittenPath = rewriteImagePathExtension(pathPart, normalizedFormat);
  if (rewrittenPath === pathPart) {
    return { publicSource: src };
  }
  return { publicSource: `${rewrittenPath}${suffix}`, originalSource: src };
}

function rewriteImagePathExtension(pathname: string, extension: string): string {
  if (!pathname) {
    return pathname;
  }
  const normalizedExtension = extension.startsWith(".")
    ? extension.slice(1)
    : extension;
  const lastSlash = pathname.lastIndexOf("/");
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot > lastSlash) {
    return `${pathname.slice(0, lastDot + 1)}${normalizedExtension}`;
  }
  return `${pathname}.${normalizedExtension}`;
}

function runtimeOrigin(runtimeConfig: RuntimeConfig): string | undefined {
  const publicConfig = runtimeConfig.public ?? {};
  for (const key of ["appOrigin", "appURL", "siteURL", "origin"]) {
    const value = publicConfig[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function renderTemplateNodes(nodes: TemplateNode[], context: RenderTemplateContext, locals: Record<string, unknown> = {}): string {
  let html = "";

  for (const node of nodes) {
    html += renderTemplateNode(node, context, locals);
  }

  return html;
}

function renderTemplateNode(node: TemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  if (node.type === "text") {
    return escapeHtml(node.value);
  }

  if (node.type === "interpolation") {
    const value = stringifyValue(evaluateExpression(node.expression, context.scope, locals));
    return `<span data-rx-text="${context.scopeId}:${node.bindingId}">${escapeHtml(value)}</span>`;
  }

  if (node.for) {
    const items = evaluateExpression(node.for.source, context.scope, locals);
    const entries = Array.isArray(items) ? items : [];
    const rendered = entries
      .map((item, index) => {
        const nextLocals = { ...locals, [node.for!.value]: item };
        if (node.for!.index) {
          nextLocals[node.for!.index] = index;
        }
        return renderElement({ ...node, for: undefined, if: undefined }, context, nextLocals);
      })
      .join("");

    return `<span data-rx-block="${context.scopeId}:${node.for.blockId}" style="display: contents;">${rendered}</span>`;
  }

  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, context.scope, locals)
      ? renderElement({ ...node, if: undefined }, context, locals)
      : "";
    return `<span data-rx-block="${context.scopeId}:${node.if.blockId}" style="display: contents;">${rendered}</span>`;
  }

  return renderElement(node, context, locals);
}

function resolveComponentDefinition(
  tag: string,
  components: Record<string, ComponentDefinition>
): ComponentDefinition | undefined {
  if (!components) {
    return undefined;
  }
  if (components[tag]) {
    return components[tag];
  }

  if (tag.startsWith("Lazy") && tag.length > 4) {
    const unlazyTag = tag.slice(4);
    const unlazyComponent = resolveComponentDefinition(unlazyTag, components);
    if (unlazyComponent) {
      return unlazyComponent;
    }
  }

  const lowerTag = tag.toLowerCase();
  for (const [name, component] of Object.entries(components)) {
    const lowerName = name.toLowerCase();
    if (lowerName === lowerTag || lowerName.endsWith(lowerTag)) {
      return component;
    }
  }

  return undefined;
}

function renderElement(node: ElementTemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  if (node.tag === "ResuxPage") {
    if (!context.renderPage) {
      return "";
    }

    throw new Error("ResuxPage must be rendered by renderTemplateNodesAsync.");
  }

  if (node.tag === "ResuxLayout") {
    throw new Error("ResuxLayout must be rendered by renderTemplateNodesAsync.");
  }

  if (node.tag === "slot") {
    throw new Error("<slot> must be rendered by renderTemplateNodesAsync.");
  }

  if (node.tag === "ResuxLink" || node.tag === "NuxtLink" || node.tag === "RouterLink") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
    }
    return renderNativeElement(node, context, locals);
  }

  if (node.tag === "ResuxImg" || node.tag === "NuxtImg" || node.tag === "NuxtImage") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
    }
    return renderResuxImg(node, context, locals);
  }

  if (node.tag === "ResuxPicture" || node.tag === "NuxtPicture") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
    }
    return renderResuxPicture(node, context, locals);
  }
  if (node.tag === "ResuxVideo") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
    }
    return renderResuxVideo(node, context, locals);
  }
  if (node.tag === "ResuxIcon" || node.tag === "Icon" || node.tag === "NuxtIcon") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
    }
    return renderResuxIcon(node, context, locals);
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    return renderResuxClientEnhance(node, context, locals);
  }

  if (node.tag === "ResuxLoadingIndicator") {
    return renderResuxLoadingIndicatorSync(
      node,
      context,
      locals,
      renderTemplateNodes(node.children, context, locals),
    );
  }

  if (node.tag === "VueIsland") {
    return renderVueIsland(node, context, locals);
  }

  if (isComponentTag(node.tag)) {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (!component) {
      throw new Error(`Unknown component <${node.tag}>.`);
    }

    throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
  }

  return renderNativeElement(node, context, locals);
}

function appendNativeEventAttributes(
  attrs: string[],
  event: ElementTemplateNode["events"][number],
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): void {
  attrs.push(`data-rx-on-${event.name}="${context.scopeId}:${context.moduleId}:${event.handler}"`);

  if (event.locals?.length) {
    const eventLocals: Record<string, unknown> = {};
    for (const name of event.locals) {
      if (!Object.hasOwn(locals, name)) continue;
      const value = locals[name];
      if (value === undefined) continue;
      assertJsonSerializable(value, `event local "${name}"`);
      eventLocals[name] = value;
    }
    attrs.push(`data-rx-locals-${event.name}="${escapeAttribute(JSON.stringify(eventLocals))}"`);
  }

  if (event.modifiers?.length) {
    attrs.push(`data-rx-mod-${event.name}="${escapeAttribute(event.modifiers.join(","))}"`);
  }
}

function collectNativeElementAttributes(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string[] {
  const attrs: string[] = [];

  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(`${attrName}="${escapeAttribute(attr.value)}"`);
      continue;
    }

    const value = evaluateExpression(attr.value, context.scope, locals);
    if (value === false || value === null || value === undefined) continue;

    const marker = attr.bindingId ? ` data-rx-attr-${attr.bindingId}="${context.scopeId}:${attr.bindingId}"` : "";
    attrs.push(`${attrName}="${escapeAttribute(stringifyAttributeValue(attrName, value))}"${marker}`);
  }

  for (const event of node.events) {
    appendNativeEventAttributes(attrs, event, context, locals);
  }

  if (node.html) {
    attrs.push(`data-rx-html-${node.html.bindingId}="${context.scopeId}:${node.html.bindingId}"`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);
  return attrs;
}

function renderNativeElement(node: ElementTemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  const attrs = collectNativeElementAttributes(node, context, locals);
  const tag = nativeElementTag(node);
  const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, context.scope, locals))
    : renderTemplateNodes(node.children, context, locals);
  return `<${tag}${attrText}>${children}</${tag}>`;
}

export async function renderTemplateNodesAsync(
  nodes: TemplateNode[],
  context: RenderTemplateContext,
  renderComponent: (component: ComponentDefinition, props?: ComponentProps, renderSlot?: () => Promise<string>) => Promise<string>,
  locals: Record<string, unknown> = {}
): Promise<string> {
  let html = "";

  for (const node of nodes) {
    html += await renderTemplateNodeAsync(node, context, renderComponent, locals);
  }

  return html;
}

async function renderTemplateNodeAsync(
  node: TemplateNode,
  context: RenderTemplateContext,
  renderComponent: (component: ComponentDefinition, props?: ComponentProps, renderSlot?: () => Promise<string>) => Promise<string>,
  locals: Record<string, unknown>
): Promise<string> {
  if (node.type !== "element") {
    return renderTemplateNode(node, context, locals);
  }

  if (node.for) {
    const items = evaluateExpression(node.for.source, context.scope, locals);
    const entries = Array.isArray(items) ? items : [];
    const rendered: string[] = [];

    for (let index = 0; index < entries.length; index++) {
      const nextLocals = { ...locals, [node.for.value]: entries[index] };
      if (node.for.index) {
        nextLocals[node.for.index] = index;
      }
      rendered.push(
        await renderElementAsync({ ...node, for: undefined, if: undefined }, context, renderComponent, nextLocals)
      );
    }

    return `<span data-rx-block="${context.scopeId}:${node.for.blockId}" style="display: contents;">${rendered.join("")}</span>`;
  }

  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, context.scope, locals)
      ? await renderElementAsync({ ...node, if: undefined }, context, renderComponent, locals)
      : "";
    return `<span data-rx-block="${context.scopeId}:${node.if.blockId}" style="display: contents;">${rendered}</span>`;
  }

  return renderElementAsync(node, context, renderComponent, locals);
}

async function renderElementAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  renderComponent: (component: ComponentDefinition, props?: ComponentProps, renderSlot?: () => Promise<string>) => Promise<string>,
  locals: Record<string, unknown>
): Promise<string> {
  if (node.tag === "ResuxPage") {
    return context.renderPage ? `<span data-rx-page="">${await context.renderPage()}</span>` : "";
  }

  if (node.tag === "ResuxLayout") {
    const layoutName = resolveLayoutName(node, context, locals);
    const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
    if (layoutName === false) {
      return renderChildren();
    }
    if (!context.renderLayout) {
      return renderChildren();
    }
    const rendered = await context.renderLayout(layoutName, renderChildren);
    const selectedLayoutSource = layoutName ?? (context.pageMeta.layout === false ? "default" : context.pageMeta.layout) ?? "default";
    const selectedLayout = normalizeLayoutName(selectedLayoutSource);
    return `<span data-rx-layout="${escapeAttribute(selectedLayout)}">${rendered}</span>`;
  }

  if (node.tag === "slot") {
    return context.renderSlot ? context.renderSlot() : "";
  }

  if (node.tag === "ResuxLink" || node.tag === "NuxtLink" || node.tag === "RouterLink") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      const props = collectComponentProps(node, context.scope, locals);
      const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
      return renderComponent(component, props, renderChildren);
    }
    return renderNativeElementAsync(node, context, renderComponent, locals);
  }

  if (node.tag === "ResuxImg" || node.tag === "NuxtImg" || node.tag === "NuxtImage") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      const props = collectComponentProps(node, context.scope, locals);
      const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
      return renderComponent(component, props, renderChildren);
    }
    return renderResuxImg(node, context, locals);
  }

  if (node.tag === "ResuxPicture" || node.tag === "NuxtPicture") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      const props = collectComponentProps(node, context.scope, locals);
      const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
      return renderComponent(component, props, renderChildren);
    }
    return renderResuxPicture(node, context, locals);
  }
  if (node.tag === "ResuxVideo") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      const props = collectComponentProps(node, context.scope, locals);
      const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
      return renderComponent(component, props, renderChildren);
    }
    return renderResuxVideo(node, context, locals);
  }
  if (node.tag === "ResuxIcon" || node.tag === "Icon" || node.tag === "NuxtIcon") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      const props = collectComponentProps(node, context.scope, locals);
      const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
      return renderComponent(component, props, renderChildren);
    }
    return renderResuxIcon(node, context, locals);
  }

  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    return renderResuxClientEnhanceAsync(node, context, renderComponent, locals);
  }

  if (node.tag === "ResuxLoadingIndicator") {
    return renderResuxLoadingIndicatorAsync(
      node,
      context,
      locals,
      renderTemplateNodesAsync(node.children, context, renderComponent, locals),
    );
  }

  if (node.tag === "VueIsland") {
    return renderVueIsland(node, context, locals);
  }

  if (isComponentTag(node.tag)) {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (!component) {
      throw new Error(`Unknown component <${node.tag}>.`);
    }
    const props = collectComponentProps(node, context.scope, locals);
    const renderChildren = () => renderTemplateNodesAsync(node.children, context, renderComponent, locals);
    return renderComponent(component, props, renderChildren);
  }

  return renderNativeElementAsync(node, context, renderComponent, locals);
}

async function renderNativeElementAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  renderComponent: (component: ComponentDefinition, props?: ComponentProps, renderSlot?: () => Promise<string>) => Promise<string>,
  locals: Record<string, unknown>
): Promise<string> {
  const attrs = collectNativeElementAttributes(node, context, locals);
  const tag = nativeElementTag(node);
  const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, context.scope, locals))
    : await renderTemplateNodesAsync(node.children, context, renderComponent, locals);
  return `<${tag}${attrText}>${children}</${tag}>`;
}

interface ResuxImageRenderInput {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  densities: number[];
  widths: number[];
  loading: string;
  decoding: string;
  fetchPriority?: string;
  provider?: string;
  cache?: string;
  quality?: number;
  fit?: ResuxImageFit;
  format?: string;
  formats: string[];
  preload: boolean;
  deferLazy: boolean;
  lazyRootMargin: string;
  lazyThreshold: number;
  placeholderSrc?: string;
  placeholderClass?: string;
  placeholderStyle?: string;
  fallbackSrc?: string;
  modifiers: ResuxImageModifiers;
  attrs: Record<string, string>;
}

interface ResuxPictureSourceInput {
  src: string;
  srcset?: string;
  type?: string;
  media?: string;
  sizes?: string;
  width?: number;
  height?: number;
  widths: number[];
  quality?: number;
  format?: string;
  fit?: ResuxImageFit;
  modifiers: ResuxImageModifiers;
}

interface ResuxVideoSourceInput {
  src: string;
  type?: string;
  quality?: string;
}

interface ResuxVideoQualityOption {
  id: string;
  label: string;
  sources: ResuxVideoSourceInput[];
}

interface RuntimeVideoTransformsConfig {
  enabled?: boolean;
  provider?: string;
  baseURL?: string;
  formats?: string[];
  qualities?: number[];
  cache?: string;
}

type ResuxVideoControlsMode = "custom" | "native" | "none";
type ResuxVideoLoadMode = "lazy" | "eager";
type ResuxVideoTheme = "dark" | "light" | "auto";

interface RuntimeVideoConfig {
  controls?: boolean;
  controlsMode?: ResuxVideoControlsMode;
  controlsLoad?: ResuxVideoLoadMode;
  iconsLoad?: ResuxVideoLoadMode;
  theme?: ResuxVideoTheme;
  accentColor?: string;
  controlsColor?: string;
  controlsBackground?: string;
  sideClickSkip?: boolean;
  clickToPlay?: boolean;
  doubleClickFullscreen?: boolean;
  skipSeconds?: number;
  showSpeed?: boolean;
  showQuality?: boolean;
  showFullscreen?: boolean;
  showVolume?: boolean;
  showProgress?: boolean;
  showTime?: boolean;
  persistSpeed?: boolean;
  transforms?: RuntimeVideoTransformsConfig;
}

const resuxImageReservedProps = new Set([
  "src",
  "alt",
  "provider",
  "cache",
  "modifiers",
  "quality",
  "fit",
  "format",
  "formats",
  "width",
  "height",
  "widths",
  "sizes",
  "densities",
  "priority",
  "preload",
  "lazy",
  "loading",
  "decoding",
  "fetchpriority",
  "fetchPriority",
  "placeholder",
  "placeholderClass",
  "placeholderStyle",
  "fallback",
  "fallbackSrc",
  "sources",
  "rootMargin",
  "threshold",
]);
const resuxLazyPlaceholderSrc =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const resuxDefaultPlaceholderSrc = "/__resux/resux-placeholder.svg";
const resuxResponsiveViewportWidths = [320, 640, 768, 1024, 1280, 1536, 1920, 2560];

function renderResuxClientEnhance(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  const props = collectComponentProps(node, context.scope, locals);
  const name = String(props.name || "").trim();
  if (!name) {
    throw new Error("<ClientEnhance> requires a non-empty name property.");
  }
  const trigger = String(props.trigger || "visible").trim();
  const mode = String(props.mode || "progressive").trim();
  const options = props.options;
  
  if (options !== undefined && options !== null) {
    try {
      assertEnhancementOptionsSerializable(options, "$", new WeakSet<object>());
    } catch (error) {
      throw new Error(
        `[resux] <ClientEnhance name="${name}"> received non-serializable options. ${getEnhancementErrorMessage(error)}`,
      );
    }
  }
  
  const serializedOptions = (options !== undefined && options !== null) ? escapeAttribute(JSON.stringify(options)) : "";
  const reserveHeight = String(props.reserveHeight || "").trim();
  const reserveWidth = String(props.reserveWidth || "").trim();
  const aspectRatio = String(props.aspectRatio || "").trim();
  const noCls = props.noCls === true || props.noCls === "true";
  const demo = String(props.demo || name).trim();
  const tag = String(props.as || "section").trim();

  const styles: string[] = [];
  if (reserveHeight) styles.push(`min-height: ${reserveHeight};`);
  if (reserveWidth) styles.push(`min-width: ${reserveWidth};`);
  if (aspectRatio) styles.push(`aspect-ratio: ${aspectRatio};`);
  const styleAttr = styles.length ? ` style="${styles.join(" ")}"` : "";

  const attrs: string[] = [
    `data-resux-enhancement="${escapeAttribute(name)}"`,
    `data-resux-trigger="${escapeAttribute(trigger)}"`,
    `use-client-enhancement="${escapeAttribute(name)}"`,
    `data-trigger="${escapeAttribute(trigger)}"`,
    `data-resux-mode="${escapeAttribute(mode)}"`,
    serializedOptions ? `data-resux-options="${serializedOptions}"` : "",
    noCls ? 'data-resux-no-cls="true"' : "",
    `data-rx-package-demo="${escapeAttribute(demo)}"`,
    `data-resux-demo="${escapeAttribute(demo)}"`,
    `data-resux-enhancement-status="idle"`,
  ].filter(Boolean);

  if (context.styleScopeId) {
    attrs.push(`${context.styleScopeId}=""`);
  }

  const specialProps = new Set([
    "name", "trigger", "mode", "options", "reserveHeight", "reserveWidth", "aspectRatio", "noCls", "demo", "as"
  ]);
  for (const [propKey, propVal] of Object.entries(props)) {
    if (specialProps.has(propKey)) continue;
    const attrName = propKey.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    if (propVal !== undefined && propVal !== null && propVal !== false) {
      if (propVal === true) {
        attrs.push(`${attrName}`);
      } else {
        attrs.push(`${attrName}="${escapeAttribute(String(propVal))}"`);
      }
    }
  }

  const children = renderTemplateNodes(node.children, context, locals);
  return `<${tag} ${attrs.join(" ")}${styleAttr}>${children}</${tag}>`;
}

async function renderResuxClientEnhanceAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  renderComponent: (component: ComponentDefinition, props?: ComponentProps, renderSlot?: () => Promise<string>) => Promise<string>,
  locals: Record<string, unknown>,
): Promise<string> {
  const props = collectComponentProps(node, context.scope, locals);
  const name = String(props.name || "").trim();
  if (!name) {
    throw new Error("<ClientEnhance> requires a non-empty name property.");
  }
  const trigger = String(props.trigger || "visible").trim();
  const mode = String(props.mode || "progressive").trim();
  const options = props.options;
  
  if (options !== undefined && options !== null) {
    try {
      assertEnhancementOptionsSerializable(options, "$", new WeakSet<object>());
    } catch (error) {
      throw new Error(
        `[resux] <ClientEnhance name="${name}"> received non-serializable options. ${getEnhancementErrorMessage(error)}`,
      );
    }
  }
  
  const serializedOptions = (options !== undefined && options !== null) ? escapeAttribute(JSON.stringify(options)) : "";
  const reserveHeight = String(props.reserveHeight || "").trim();
  const reserveWidth = String(props.reserveWidth || "").trim();
  const aspectRatio = String(props.aspectRatio || "").trim();
  const noCls = props.noCls === true || props.noCls === "true";
  const demo = String(props.demo || name).trim();
  const tag = String(props.as || "section").trim();

  const styles: string[] = [];
  if (reserveHeight) styles.push(`min-height: ${reserveHeight};`);
  if (reserveWidth) styles.push(`min-width: ${reserveWidth};`);
  if (aspectRatio) styles.push(`aspect-ratio: ${aspectRatio};`);
  const styleAttr = styles.length ? ` style="${styles.join(" ")}"` : "";

  const attrs: string[] = [
    `data-resux-enhancement="${escapeAttribute(name)}"`,
    `data-resux-trigger="${escapeAttribute(trigger)}"`,
    `use-client-enhancement="${escapeAttribute(name)}"`,
    `data-trigger="${escapeAttribute(trigger)}"`,
    `data-resux-mode="${escapeAttribute(mode)}"`,
    serializedOptions ? `data-resux-options="${serializedOptions}"` : "",
    noCls ? 'data-resux-no-cls="true"' : "",
    `data-rx-package-demo="${escapeAttribute(demo)}"`,
    `data-resux-demo="${escapeAttribute(demo)}"`,
    `data-resux-enhancement-status="idle"`,
  ].filter(Boolean);

  if (context.styleScopeId) {
    attrs.push(`${context.styleScopeId}=""`);
  }

  const specialProps = new Set([
    "name", "trigger", "mode", "options", "reserveHeight", "reserveWidth", "aspectRatio", "noCls", "demo", "as"
  ]);
  for (const [propKey, propVal] of Object.entries(props)) {
    if (specialProps.has(propKey)) continue;
    const attrName = propKey.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    if (propVal !== undefined && propVal !== null && propVal !== false) {
      if (propVal === true) {
        attrs.push(`${attrName}`);
      } else {
        attrs.push(`${attrName}="${escapeAttribute(String(propVal))}"`);
      }
    }
  }

  const children = await renderTemplateNodesAsync(node.children, context, renderComponent, locals);
  return `<${tag} ${attrs.join(" ")}${styleAttr}>${children}</${tag}>`;
}

function renderResuxImg(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  const input = resolveResuxImageRenderInput(node, context, locals);
  if (!input.src) {
    return "";
  }

  const builder = createResuxImageBuilder(context.route, context.runtimeConfig, false);
  const src = builder(input.src, {
    provider: input.provider,
    cache: input.cache,
    width: input.width,
    height: input.height,
    quality: input.quality,
    fit: input.fit,
    format: input.format,
    modifiers: input.modifiers,
  });
  const srcset = buildResuxImageSrcset(builder, input);

  registerResuxImagePreload(context, src, srcset, input, input.preload);
  return renderResuxImgTag(input, src, srcset, context.styleScopeId);
}

function resolveRuntimeVideoConfig(runtimeConfig: RuntimeConfig): RuntimeVideoConfig {
  const publicConfig = runtimeConfig.public ?? {};
  const candidate = (publicConfig.video ?? publicConfig.resuxVideo) as unknown;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {};
  }
  const input = candidate as Record<string, unknown>;
  return {
    controls: typeof input.controls === "boolean" ? input.controls : undefined,
    controlsMode: resolveVideoControlsMode(input.controlsMode, undefined),
    controlsLoad: resolveVideoLoadMode(input.controlsLoad, undefined),
    iconsLoad: resolveVideoLoadMode(input.iconsLoad, undefined),
    theme: resolveVideoTheme(input.theme, undefined),
    accentColor: readStringProp(input.accentColor),
    controlsColor: readStringProp(input.controlsColor),
    controlsBackground: readStringProp(input.controlsBackground),
    sideClickSkip: typeof input.sideClickSkip === "boolean" ? input.sideClickSkip : undefined,
    clickToPlay: typeof input.clickToPlay === "boolean" ? input.clickToPlay : undefined,
    doubleClickFullscreen: typeof input.doubleClickFullscreen === "boolean" ? input.doubleClickFullscreen : undefined,
    skipSeconds: readNumberProp(input.skipSeconds),
    showSpeed: typeof input.showSpeed === "boolean" ? input.showSpeed : undefined,
    showQuality: typeof input.showQuality === "boolean" ? input.showQuality : undefined,
    showFullscreen: typeof input.showFullscreen === "boolean" ? input.showFullscreen : undefined,
    showVolume: typeof input.showVolume === "boolean" ? input.showVolume : undefined,
    showProgress: typeof input.showProgress === "boolean" ? input.showProgress : undefined,
    showTime: typeof input.showTime === "boolean" ? input.showTime : undefined,
    persistSpeed: typeof input.persistSpeed === "boolean" ? input.persistSpeed : undefined,
    transforms: resolveRuntimeVideoTransformsConfig(input.transforms),
  };
}

function resolveRuntimeVideoTransformsConfig(
  value: unknown,
): RuntimeVideoTransformsConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const input = value as Record<string, unknown>;
  const formats = parseVideoFormats(input.formats);
  const qualities = parseVideoTransformQualityList(input.qualities);
  const cache = normalizeImageCacheValue(input.cache);
  const output: RuntimeVideoTransformsConfig = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : undefined,
    provider: readStringProp(input.provider),
    baseURL: readStringProp(input.baseURL),
    cache,
    ...(formats.length ? { formats } : {}),
    ...(qualities.length ? { qualities } : {}),
  };
  return Object.values(output).some((entry) => entry !== undefined)
    ? output
    : undefined;
}

function resolveVideoControlsMode(
  value: unknown,
  fallback: ResuxVideoControlsMode | undefined = "custom",
): ResuxVideoControlsMode {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "custom" || normalized === "native" || normalized === "none") {
    return normalized;
  }
  return fallback ?? "custom";
}

function resolveVideoLoadMode(
  value: unknown,
  fallback: ResuxVideoLoadMode | undefined = "lazy",
): ResuxVideoLoadMode {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "lazy" || normalized === "eager") {
    return normalized;
  }
  return fallback ?? "lazy";
}

function resolveVideoTheme(
  value: unknown,
  fallback: ResuxVideoTheme | undefined = "dark",
): ResuxVideoTheme {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "dark" || normalized === "light" || normalized === "auto") {
    return normalized;
  }
  return fallback ?? "dark";
}

function resolveVideoThemeDefaults(theme: ResuxVideoTheme): { controlsColor: string; controlsBackground: string } {
  if (theme === "light") {
    return {
      controlsColor: "#0f172a",
      controlsBackground: "rgba(248, 250, 252, 0.84)",
    };
  }
  if (theme === "auto") {
    return {
      controlsColor: "var(--resux-video-theme-fg, #e2e8f0)",
      controlsBackground: "var(--resux-video-theme-bg, rgba(2, 6, 23, 0.74))",
    };
  }
  return {
    controlsColor: "#e2e8f0",
    controlsBackground: "rgba(2, 6, 23, 0.74)",
  };
}

function renderResuxVideo(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  const props = collectComponentProps(node, context.scope, locals);
  const hero = readBooleanProp(props.hero, false);
  const priority = readBooleanProp(props.priority, hero);
  const deferUntilPageReady = readBooleanProp(props.deferUntilPageReady, false);
  const revealOnPageReady = readBooleanProp(props.revealOnPageReady, priority || hero || deferUntilPageReady);
  const chunkLoading = readBooleanProp(props.chunkLoading, false) || readBooleanProp(props.chunked, false);
  const preloadLink = readBooleanProp(props.preloadLink, priority || hero);
  const fetchPriority = readStringProp(props.fetchpriority ?? props.fetchPriority)
    ?? ((priority || hero) ? "high" : undefined);
  const explicitLoading = readStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : false);
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true || lazy || deferUntilPageReady;
  const src = readStringProp(props.src);
  const poster = readStringProp(props.poster);
  const fallbackPoster = readStringProp(props.fallbackPoster);
  const width = readNumberProp(props.width);
  const height = readNumberProp(props.height);
  const placeholderSrc = resolveMediaPlaceholderSource(props.placeholder);
  const preload = readStringProp(props.preload)
    ?? ((chunkLoading || deferUntilPageReady) ? "metadata" : ((priority || hero) ? "auto" : "metadata"));
  const ariaLabel = readStringProp(props.ariaLabel ?? props["aria-label"]);
  const rootMargin = readStringProp(props.rootMargin) ?? "320px 0px";
  const thresholdRaw = Number(props.threshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : 0;
  const forceAutoplay = readBooleanProp(props.forceAutoplay, false);
  const autoplay = readBooleanProp(props.autoplay, false);
  const runtimeVideoConfig = resolveRuntimeVideoConfig(context.runtimeConfig);
  const controlsRequested = readBooleanProp(props.controls, runtimeVideoConfig.controls ?? true);
  const configuredControlsMode = resolveVideoControlsMode(runtimeVideoConfig.controlsMode, "custom");
  const controlsModeProp = readStringProp(props.controlsMode);
  let controlsMode = resolveVideoControlsMode(controlsModeProp, configuredControlsMode);
  const explicitNativeControls = props.nativeControls === undefined
    ? undefined
    : readBooleanProp(props.nativeControls, true);
  const explicitCustomControls = props.customControls === undefined
    ? undefined
    : readBooleanProp(props.customControls, false);
  if (explicitNativeControls === true) {
    controlsMode = "native";
  } else if (explicitCustomControls === true) {
    controlsMode = "custom";
  } else if (!controlsRequested) {
    controlsMode = "none";
  }
  const nativeControls = controlsRequested && controlsMode === "native";
  const customControls = controlsRequested && controlsMode === "custom";
  const controlsLoad = resolveVideoLoadMode(
    readStringProp(props.controlsLoad),
    runtimeVideoConfig.controlsLoad ?? "lazy",
  );
  const iconsLoad = resolveVideoLoadMode(
    readStringProp(props.iconsLoad),
    runtimeVideoConfig.iconsLoad ?? "lazy",
  );
  const showSpeed = readBooleanProp(props.showSpeed, runtimeVideoConfig.showSpeed ?? true);
  const speedControl = controlsRequested && (
    props.speedControl === undefined
      ? showSpeed
      : readBooleanProp(props.speedControl, showSpeed)
  );
  const speeds = resolveVideoPlaybackSpeeds(props.speeds);
  const defaultSpeed = resolveVideoDefaultSpeed(props.defaultSpeed, speeds);
  const showSpeedIcon = readBooleanProp(props.showSpeedIcon, true);
  const speedLabel = readStringProp(props.speedLabel) ?? "Speed";
  const persistSpeed = readBooleanProp(props.persistSpeed, runtimeVideoConfig.persistSpeed ?? false);
  const persistSpeedKey = readStringProp(props.persistSpeedKey);
  const showQuality = readBooleanProp(props.showQuality, runtimeVideoConfig.showQuality ?? true);
  const qualityControl = controlsRequested && (
    props.qualityControl === undefined
      ? showQuality
      : readBooleanProp(props.qualityControl, showQuality)
  );
  const showQualityIcon = readBooleanProp(props.showQualityIcon, true);
  const qualityLabel = readStringProp(props.qualityLabel) ?? "Quality";
  const showFullscreen = readBooleanProp(props.showFullscreen, runtimeVideoConfig.showFullscreen ?? true);
  const showVolume = readBooleanProp(props.showVolume, runtimeVideoConfig.showVolume ?? true);
  const showProgress = readBooleanProp(props.showProgress, runtimeVideoConfig.showProgress ?? true);
  const showTime = readBooleanProp(props.showTime, runtimeVideoConfig.showTime ?? true);
  const sideClickSkip = readBooleanProp(props.sideClickSkip, runtimeVideoConfig.sideClickSkip ?? true);
  const skipControls = props.skipControls === undefined
    ? sideClickSkip
    : readBooleanProp(props.skipControls, sideClickSkip);
  const clickToPlay = readBooleanProp(props.clickToPlay, runtimeVideoConfig.clickToPlay ?? true);
  const doubleClickFullscreen = readBooleanProp(
    props.doubleClickFullscreen,
    runtimeVideoConfig.doubleClickFullscreen ?? true,
  );
  const skipSeconds = resolveVideoSkipSeconds(props.skipSeconds, runtimeVideoConfig.skipSeconds ?? 10);
  const skipBackwardSeconds = resolveVideoSkipSeconds(props.skipBackwardSeconds, skipSeconds);
  const skipForwardSeconds = resolveVideoSkipSeconds(props.skipForwardSeconds, skipSeconds);
  const showSkipOverlay = readBooleanProp(props.showSkipOverlay, true);
  const sideSkipEnabled = (skipControls || sideClickSkip) && showSkipOverlay;
  const interactionZonesEnabled = clickToPlay || doubleClickFullscreen || sideSkipEnabled;
  const skipLabel = readStringProp(props.skipLabel) ?? "Skip";
  const disableSkipOnControls = readBooleanProp(props.disableSkipOnControls, true);
  const theme = resolveVideoTheme(readStringProp(props.theme), runtimeVideoConfig.theme ?? "dark");
  const themeDefaults = resolveVideoThemeDefaults(theme);
  const controlsColor = readStringProp(props.controlsColor)
    ?? runtimeVideoConfig.controlsColor
    ?? themeDefaults.controlsColor;
  const controlsBackground = readStringProp(props.controlsBackground)
    ?? runtimeVideoConfig.controlsBackground
    ?? themeDefaults.controlsBackground;
  const controlsAccent = readStringProp(props.accentColor ?? props.controlsAccent)
    ?? runtimeVideoConfig.accentColor
    ?? "#38bdf8";
  const controlsClass = readStringProp(props.controlsClass);
  const controlsStyle = readStringProp(props.controlsStyle);
  const rounded = props.rounded === undefined
    ? true
    : readBooleanProp(props.rounded, true);
  const shadow = props.shadow === undefined
    ? true
    : readBooleanProp(props.shadow, true);
  const iconSet = props.iconSet && typeof props.iconSet === "object" && !Array.isArray(props.iconSet)
    ? props.iconSet as Record<string, unknown>
    : undefined;
  const readVideoIconSetEntry = (...keys: string[]): string | undefined => {
    if (!iconSet) {
      return undefined;
    }
    for (const key of keys) {
      const value = readStringProp(iconSet[key]);
      if (value) {
        return value;
      }
    }
    return undefined;
  };
  const iconPlay = readStringProp(props.controlsIconPlay ?? props.iconPlay) ?? readVideoIconSetEntry("play") ?? "\u25b6";
  const iconPause = readStringProp(props.controlsIconPause ?? props.iconPause) ?? readVideoIconSetEntry("pause") ?? "\u275a\u275a";
  const iconMute = readStringProp(props.controlsIconMute ?? props.iconMute) ?? readVideoIconSetEntry("muted", "mute") ?? "\ud83d\udd07";
  const iconUnmute = readStringProp(props.controlsIconUnmute ?? props.iconUnmute) ?? readVideoIconSetEntry("volume", "unmute") ?? "\ud83d\udd0a";
  const iconFullscreen = readStringProp(props.controlsIconFullscreen ?? props.iconFullscreen) ?? readVideoIconSetEntry("fullscreen") ?? "\u26f6";
  const iconExitFullscreen = readStringProp(props.controlsIconExitFullscreen ?? props.iconExitFullscreen) ?? readVideoIconSetEntry("fullscreenExit", "fullscreen-exit") ?? "\ud83d\uddd7";
  const iconSkipBackward = readStringProp(props.controlsIconSkipBackward ?? props.iconSkipBackward) ?? readVideoIconSetEntry("skipBack", "skip-back") ?? "\u23ea";
  const iconSkipForward = readStringProp(props.controlsIconSkipForward ?? props.iconSkipForward) ?? readVideoIconSetEntry("skipForward", "skip-forward") ?? "\u23e9";
  const iconReplay = readStringProp(props.controlsIconReplay ?? props.iconReplay) ?? readVideoIconSetEntry("replay") ?? "\u21ba";
  const iconSettings = readStringProp(props.controlsIconSettings ?? props.iconSettings) ?? readVideoIconSetEntry("settings") ?? "\u2699";
  const iconSpeed = readStringProp(props.controlsIconSpeed ?? props.iconSpeed) ?? readVideoIconSetEntry("speed") ?? "\u00bb";
  const iconQuality = readStringProp(props.controlsIconQuality ?? props.iconQuality) ?? readVideoIconSetEntry("quality") ?? "HD";
  const iconLoading = readStringProp(props.controlsIconLoading ?? props.iconLoading) ?? readVideoIconSetEntry("loading", "spinner") ?? "\u2026";
  const iconError = readStringProp(props.controlsIconError ?? props.iconError) ?? readVideoIconSetEntry("error") ?? "!";
  const iconPlayFallback = readStringProp(props.iconPlayFallback) ?? "Play";
  const iconPauseFallback = readStringProp(props.iconPauseFallback) ?? "Pause";
  const iconMuteFallback = readStringProp(props.iconMuteFallback) ?? "Mute";
  const iconUnmuteFallback = readStringProp(props.iconUnmuteFallback) ?? "Sound";
  const iconFullscreenFallback = readStringProp(props.iconFullscreenFallback) ?? "Full";
  const iconExitFullscreenFallback = readStringProp(props.iconExitFullscreenFallback) ?? "Exit";
  const iconSkipBackwardFallback = readStringProp(props.iconSkipBackwardFallback) ?? "Back";
  const iconSkipForwardFallback = readStringProp(props.iconSkipForwardFallback) ?? "Fwd";
  const hasExplicitFormatProp = Object.prototype.hasOwnProperty.call(props, "format");
  const explicitFormat = readStringProp(props.format);
  const explicitFormats = parseVideoFormats(
    props.formats
    ?? (explicitFormat?.includes(",") ? explicitFormat : undefined),
  );
  const formatTransformsDisabled = hasExplicitFormatProp && !explicitFormat && explicitFormats.length === 0;
  const requestedVideoFormats = formatTransformsDisabled
    ? []
    : explicitFormats.length
      ? explicitFormats
      : normalizeVideoTransformFormat(explicitFormat)
        ? [normalizeVideoTransformFormat(explicitFormat)!]
        : [];

  const hasExplicitQualityProp = Object.prototype.hasOwnProperty.call(props, "quality");
  const explicitQuality = normalizeVideoTransformQualityValue(props.quality);
  const explicitQualityList = parseVideoTransformQualityList(
    isVideoTransformQualityInputList(props.qualities)
      ? props.qualities
      : undefined,
  );
  const qualityTransformsDisabled = hasExplicitQualityProp && explicitQuality === undefined && explicitQualityList.length === 0;
  const requestedVideoQualities = qualityTransformsDisabled
    ? []
    : explicitQualityList.length
      ? explicitQualityList
      : explicitQuality
        ? [explicitQuality]
        : [];

  const explicitSources = resolveVideoSources(props.sources);
  const transformBuilder = createResuxVideoTransformBuilder(context.route, context.runtimeConfig);
  const autoGeneratedSources: ResuxVideoSourceInput[] = [];
  const autoGeneratedQualityOptions: ResuxVideoQualityOption[] = [];
  if (!explicitSources.length && src && (requestedVideoFormats.length > 0 || requestedVideoQualities.length > 0)) {
    const formatCandidates: Array<string | undefined> = requestedVideoFormats.length
      ? requestedVideoFormats
      : [undefined];
    if (requestedVideoQualities.length > 0) {
      for (const qualityHeight of requestedVideoQualities) {
        const qualityLabel = normalizeVideoQualityLabel(qualityHeight) ?? `${qualityHeight}p`;
        const qualityId = normalizeVideoQualityId(qualityLabel) ?? `q-${qualityHeight}`;
        const optionSources: ResuxVideoSourceInput[] = [];
        const seenOptionSources = new Set<string>();
        for (const format of formatCandidates) {
          const source = transformBuilder(src, { format, quality: qualityHeight });
          if (!source.src || seenOptionSources.has(source.src)) {
            continue;
          }
          seenOptionSources.add(source.src);
          optionSources.push({
            ...source,
            quality: qualityLabel,
          });
        }
        if (optionSources.length > 0) {
          autoGeneratedQualityOptions.push({
            id: qualityId,
            label: qualityLabel,
            sources: optionSources,
          });
          autoGeneratedSources.push(...optionSources);
        }
      }
    } else {
      const seenSources = new Set<string>();
      for (const format of formatCandidates) {
        const source = transformBuilder(src, { format });
        if (!source.src || seenSources.has(source.src)) {
          continue;
        }
        seenSources.add(source.src);
        autoGeneratedSources.push(source);
      }
    }
  }

  const resolvedSources = explicitSources.length > 0
    ? explicitSources
    : autoGeneratedSources;
  const resolvedQualities = resolveVideoQualityOptions(
    props.qualities,
    resolvedSources,
    src,
    autoGeneratedQualityOptions,
  );
  const defaultQuality = resolveVideoDefaultQuality(props.defaultQuality, resolvedQualities);
  const qualityControlEnabled = qualityControl && resolvedQualities.length > 1;
  const activeQuality = qualityControlEnabled
    ? resolvedQualities.find((entry) => entry.id === defaultQuality) ?? resolvedQualities[0]
    : undefined;
  const activeSources = activeQuality?.sources ?? resolvedSources;
  const activePrimarySrc = activeSources[0]?.src ?? src;
  const preloadHref = activeSources[0]?.src ?? src;
  const preloadType = activeSources[0]?.type ?? resolveVideoMimeTypeFromSource(preloadHref);
  const hasSourceChildren = activeSources.length > 0;

  const styleParts: string[] = [];
  if (typeof props.style === "string" && props.style.trim().length > 0) {
    styleParts.push(props.style.trim().replace(/;+\s*$/, ""));
  }
  const aspectRatio = props.aspectRatio;
  if (aspectRatio !== undefined && aspectRatio !== null && aspectRatio !== false) {
    const aspectValue = String(aspectRatio).trim();
    if (aspectValue.length > 0) {
      styleParts.push(`aspect-ratio: ${aspectValue}`);
    }
  } else {
    const ratioStyle = resolveAspectRatioStyle(width, height, props.style);
    if (ratioStyle) {
      styleParts.push(ratioStyle);
    }
  }
  styleParts.push("display: block");
  styleParts.push("width: 100%");
  styleParts.push("max-width: 100%");
  if (!styleParts.some((entry) => /(^|;)\s*height\s*:/.test(entry))) {
    styleParts.push("height: auto");
  }
  const attrs: string[] = [];
  for (const [name, rawValue] of Object.entries(props)) {
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue;
    }
    if (
      name === "aspectRatio"
      || name === "style"
      || name === "lazy"
      || name === "loading"
      || name === "placeholder"
      || name === "fallbackPoster"
      || name === "rootMargin"
      || name === "threshold"
      || name === "sources"
      || name === "format"
      || name === "formats"
      || name === "quality"
      || name === "forceAutoplay"
      || name === "ariaLabel"
      || name === "autoplay"
      || name === "src"
      || name === "poster"
      || name === "preload"
      || name === "fallbackText"
      || name === "controls"
      || name === "controlsMode"
      || name === "controlsLoad"
      || name === "iconsLoad"
      || name === "nativeControls"
      || name === "customControls"
      || name === "theme"
      || name === "accentColor"
      || name === "controlsColor"
      || name === "controlsBackground"
      || name === "controlsAccent"
      || name === "controlsClass"
      || name === "controlsStyle"
      || name === "rounded"
      || name === "shadow"
      || name === "controlsIconPlay"
      || name === "controlsIconPause"
      || name === "controlsIconMute"
      || name === "controlsIconUnmute"
      || name === "controlsIconFullscreen"
      || name === "controlsIconExitFullscreen"
      || name === "controlsIconSkipBackward"
      || name === "controlsIconSkipForward"
      || name === "controlsIconReplay"
      || name === "controlsIconSettings"
      || name === "controlsIconSpeed"
      || name === "controlsIconQuality"
      || name === "controlsIconLoading"
      || name === "controlsIconError"
      || name === "iconPlay"
      || name === "iconPause"
      || name === "iconMute"
      || name === "iconUnmute"
      || name === "iconFullscreen"
      || name === "iconExitFullscreen"
      || name === "iconSkipBackward"
      || name === "iconSkipForward"
      || name === "iconReplay"
      || name === "iconSettings"
      || name === "iconSpeed"
      || name === "iconQuality"
      || name === "iconLoading"
      || name === "iconError"
      || name === "iconPlayFallback"
      || name === "iconPauseFallback"
      || name === "iconMuteFallback"
      || name === "iconUnmuteFallback"
      || name === "iconFullscreenFallback"
      || name === "iconExitFullscreenFallback"
      || name === "iconSkipBackwardFallback"
      || name === "iconSkipForwardFallback"
      || name === "iconSet"
      || name === "speedControl"
      || name === "showSpeed"
      || name === "speeds"
      || name === "defaultSpeed"
      || name === "showSpeedIcon"
      || name === "speedLabel"
      || name === "persistSpeed"
      || name === "persistSpeedKey"
      || name === "qualityControl"
      || name === "showQuality"
      || name === "qualities"
      || name === "defaultQuality"
      || name === "showQualityIcon"
      || name === "qualityLabel"
      || name === "showFullscreen"
      || name === "showVolume"
      || name === "showProgress"
      || name === "showTime"
      || name === "skipControls"
      || name === "skipSeconds"
      || name === "skipBackwardSeconds"
      || name === "skipForwardSeconds"
      || name === "showSkipOverlay"
      || name === "skipLabel"
      || name === "disableSkipOnControls"
      || name === "sideClickSkip"
      || name === "clickToPlay"
      || name === "doubleClickFullscreen"
      || name === "hero"
      || name === "priority"
      || name === "preloadLink"
      || name === "chunkLoading"
      || name === "chunked"
      || name === "deferUntilPageReady"
      || name === "revealOnPageReady"
      || name === "fetchpriority"
      || name === "fetchPriority"
    ) {
      continue;
    }
    const attrName = name === "className"
      ? "class"
      : name === "playsInline"
        ? "playsinline"
        : name === "crossOrigin"
          ? "crossorigin"
          : name === "referrerPolicy"
            ? "referrerpolicy"
            : name;
    attrs.push(`${attrName}="${escapeAttribute(stringifyAttributeValue(attrName, rawValue))}"`);
  }
  if (!hasSourceChildren && !deferLazy && activePrimarySrc) {
    attrs.push(`src="${escapeAttribute(activePrimarySrc)}"`);
  }
  attrs.push('data-resux-media="video"');
  attrs.push(`data-resux-video="${deferLazy ? "idle" : "loading"}"`);
  if (!deferLazy) {
    attrs.push('data-resux-loading="true"');
    attrs.push('data-resux-video-loading="true"');
  }
  if (fetchPriority) {
    attrs.push(`fetchpriority="${escapeAttribute(fetchPriority)}"`);
  }
  if (hero || priority) {
    attrs.push('data-rx-video-hero="true"');
  }
  if (chunkLoading) {
    attrs.push('data-rx-video-chunked="true"');
  }
  if (deferLazy && activePrimarySrc) {
    attrs.push(`data-rx-lazy-src="${escapeAttribute(activePrimarySrc)}"`);
    attrs.push(`data-src="${escapeAttribute(activePrimarySrc)}"`);
  }
  if (deferLazy) {
    attrs.push('data-rx-lazy-video="true"');
    attrs.push('data-resux-lazy="true"');
    attrs.push(`data-rx-lazy-root-margin="${escapeAttribute(rootMargin)}"`);
    attrs.push(`data-rx-lazy-threshold="${escapeAttribute(String(threshold))}"`);
    attrs.push(`data-rx-lazy-preload="${escapeAttribute(preload)}"`);
    if (deferUntilPageReady) {
      attrs.push('data-rx-video-defer-ready="true"');
      if (revealOnPageReady) {
        attrs.push('data-rx-video-ready-reveal="true"');
      }
    }
    attrs.push('preload="none"');
  } else if (preload) {
    attrs.push(`preload="${escapeAttribute(preload)}"`);
  }

  if (poster) {
    attrs.push(`data-rx-poster="${escapeAttribute(poster)}"`);
  }
  if (fallbackPoster) {
    attrs.push(`data-rx-fallback-poster="${escapeAttribute(fallbackPoster)}"`);
  }
  if (placeholderSrc) {
    attrs.push(`data-rx-placeholder-src="${escapeAttribute(placeholderSrc)}"`);
    attrs.push(`data-placeholder="${escapeAttribute(placeholderSrc)}"`);
    attrs.push('data-rx-placeholder-active="true"');
    attrs.push('data-resux-placeholder-active="true"');
  }

  const initialPoster = deferLazy
    ? undefined
    : (placeholderSrc ?? poster);
  if (initialPoster) {
    attrs.push(`poster="${escapeAttribute(initialPoster)}"`);
  }

  if (autoplay) {
    attrs.push('autoplay="autoplay"');
    attrs.push('data-rx-autoplay-requested="true"');
    if (!forceAutoplay) {
      attrs.push('data-rx-respect-reduced-motion="true"');
    } else {
      attrs.push('data-rx-force-autoplay="true"');
    }
  }
  if (controlsRequested && nativeControls) {
    attrs.push('controls="controls"');
  }
  if (customControls) {
    attrs.push('data-rx-custom-controls="true"');
  }
  attrs.push(`data-rx-video-default-speed="${escapeAttribute(String(defaultSpeed))}"`);
  if (ariaLabel) {
    attrs.push(`aria-label="${escapeAttribute(ariaLabel)}"`);
  }
  if (styleParts.length > 0) {
    attrs.push(`style="${escapeAttribute(styleParts.join("; "))}"`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);
  const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
  const sourceTags = hasSourceChildren
    ? activeSources
      .map((source) => {
        const sourceAttrs = deferLazy
          ? [`data-rx-lazy-src="${escapeAttribute(source.src)}"`, `data-src="${escapeAttribute(source.src)}"`]
          : [`src="${escapeAttribute(source.src)}"`];
        if (source.type) {
          sourceAttrs.push(`type="${escapeAttribute(source.type)}"`);
        }
        return `<source ${sourceAttrs.join(" ")}>`;
      })
      .join("")
    : "";
  registerResuxVideoPreload(context, preloadHref, preloadType, fetchPriority, preloadLink && !deferLazy);
  const children = renderTemplateNodes(node.children, context, locals);
  const fallbackText = escapeHtml(readStringProp(props.fallbackText) ?? "Your browser does not support the video tag.");
  const videoMarkup = `<video${attrText}>${sourceTags}${children}${fallbackText}</video>`;
  const renderShell = customControls
    || speedControl
    || qualityControlEnabled
    || interactionZonesEnabled;
  if (!renderShell) {
    return videoMarkup;
  }
  const controlsInset = controlsRequested ? "4.25rem" : "0px";
  const shellClass = mergeClassNames(
    "rx-video-shell resux-video",
    `resux-video--theme-${theme}`,
    rounded ? "resux-video--rounded" : "",
    shadow ? "resux-video--shadow" : "",
    controlsClass,
  );
  const shellStyle = mergeInlineStyles(
    "position: relative",
    "display: block",
    "isolation: isolate",
    `--rx-video-controls-hit-area: ${controlsInset}`,
    `--resux-video-accent: ${controlsAccent}`,
    `--resux-video-controls-color: ${controlsColor}`,
    `--resux-video-controls-bg: ${controlsBackground}`,
    `--resux-video-radius: ${rounded ? "0.9rem" : "0px"}`,
    `--rx-video-controls-fg: ${controlsColor}`,
    `--rx-video-controls-bg: ${controlsBackground}`,
    `--rx-video-controls-accent: ${controlsAccent}`,
    controlsStyle,
  );
  const controlsActivated = controlsLoad === "eager";
  const iconsReady = iconsLoad === "eager";
  const controlsReady = controlsActivated && !deferLazy;
  const shellAttrs: string[] = [
    'data-rx-video-shell="true"',
    `data-rx-video-controls-ready="${controlsReady ? "true" : "false"}"`,
    `data-resux-video-controls-ready="${controlsReady ? "true" : "false"}"`,
    `data-rx-video-controls-load="${controlsLoad}"`,
    `data-rx-video-controls-activated="${controlsActivated ? "true" : "false"}"`,
    `data-rx-video-icons-load="${iconsLoad}"`,
    `data-rx-video-icons-ready="${iconsReady ? "true" : "false"}"`,
    `data-rx-video-theme="${theme}"`,
    `data-rx-video-state="${deferLazy ? "idle" : "loading"}"`,
    `data-resux-video="${deferLazy ? "idle" : "loading"}"`,
    `data-rx-video-icon-play="${escapeAttribute(iconPlay)}"`,
    `data-rx-video-icon-pause="${escapeAttribute(iconPause)}"`,
    `data-rx-video-icon-mute="${escapeAttribute(iconMute)}"`,
    `data-rx-video-icon-unmute="${escapeAttribute(iconUnmute)}"`,
    `data-rx-video-icon-fullscreen="${escapeAttribute(iconFullscreen)}"`,
    `data-rx-video-icon-exit-fullscreen="${escapeAttribute(iconExitFullscreen)}"`,
    `data-rx-video-icon-skip-backward="${escapeAttribute(iconSkipBackward)}"`,
    `data-rx-video-icon-skip-forward="${escapeAttribute(iconSkipForward)}"`,
    `data-rx-video-icon-replay="${escapeAttribute(iconReplay)}"`,
    `data-rx-video-icon-settings="${escapeAttribute(iconSettings)}"`,
    `data-rx-video-icon-speed="${escapeAttribute(iconSpeed)}"`,
    `data-rx-video-icon-quality="${escapeAttribute(iconQuality)}"`,
    `data-rx-video-icon-loading="${escapeAttribute(iconLoading)}"`,
    `data-rx-video-icon-error="${escapeAttribute(iconError)}"`,
    `data-rx-video-icon-play-fallback="${escapeAttribute(iconPlayFallback)}"`,
    `data-rx-video-icon-pause-fallback="${escapeAttribute(iconPauseFallback)}"`,
    `data-rx-video-icon-mute-fallback="${escapeAttribute(iconMuteFallback)}"`,
    `data-rx-video-icon-unmute-fallback="${escapeAttribute(iconUnmuteFallback)}"`,
    `data-rx-video-icon-fullscreen-fallback="${escapeAttribute(iconFullscreenFallback)}"`,
    `data-rx-video-icon-exit-fullscreen-fallback="${escapeAttribute(iconExitFullscreenFallback)}"`,
    `data-rx-video-icon-skip-backward-fallback="${escapeAttribute(iconSkipBackwardFallback)}"`,
    `data-rx-video-icon-skip-forward-fallback="${escapeAttribute(iconSkipForwardFallback)}"`,
    `data-rx-video-speed-control="${speedControl ? "true" : "false"}"`,
    `data-rx-video-speeds="${escapeAttribute(serializeVideoPlaybackSpeeds(speeds))}"`,
    `data-rx-video-default-speed="${escapeAttribute(String(defaultSpeed))}"`,
    `data-rx-video-show-speed-icon="${showSpeedIcon ? "true" : "false"}"`,
    `data-rx-video-speed-label="${escapeAttribute(speedLabel)}"`,
    `data-rx-video-persist-speed="${persistSpeed ? "true" : "false"}"`,
    `data-rx-video-persist-speed-key="${escapeAttribute(persistSpeedKey ?? "")}"`,
    `data-rx-video-quality-control="${qualityControlEnabled ? "true" : "false"}"`,
    `data-rx-video-qualities="${escapeAttribute(serializeVideoQualityOptions(resolvedQualities))}"`,
    `data-rx-video-default-quality="${escapeAttribute(defaultQuality ?? "")}"`,
    `data-rx-video-show-quality-icon="${showQualityIcon ? "true" : "false"}"`,
    `data-rx-video-quality-label="${escapeAttribute(qualityLabel)}"`,
    `data-rx-video-custom-controls="${customControls ? "true" : "false"}"`,
    `data-rx-video-native-controls="${nativeControls ? "true" : "false"}"`,
    `data-rx-video-show-fullscreen="${showFullscreen ? "true" : "false"}"`,
    `data-rx-video-show-volume="${showVolume ? "true" : "false"}"`,
    `data-rx-video-show-progress="${showProgress ? "true" : "false"}"`,
    `data-rx-video-show-time="${showTime ? "true" : "false"}"`,
    `data-rx-video-skip-controls="${sideSkipEnabled ? "true" : "false"}"`,
    `data-rx-video-skip-backward="${escapeAttribute(String(skipBackwardSeconds))}"`,
    `data-rx-video-skip-forward="${escapeAttribute(String(skipForwardSeconds))}"`,
    `data-rx-video-skip-label="${escapeAttribute(skipLabel)}"`,
    `data-rx-video-show-skip-overlay="${sideSkipEnabled ? "true" : "false"}"`,
    `data-rx-video-disable-skip-on-controls="${disableSkipOnControls ? "true" : "false"}"`,
    `data-rx-video-side-click-skip="${sideSkipEnabled ? "true" : "false"}"`,
    `data-rx-video-click-to-play="${clickToPlay ? "true" : "false"}"`,
    `data-rx-video-double-click-fullscreen="${doubleClickFullscreen ? "true" : "false"}"`,
    `data-rx-video-has-interaction-zones="${interactionZonesEnabled ? "true" : "false"}"`,
  ];
  if (shellClass) {
    shellAttrs.push(`class="${escapeAttribute(shellClass)}"`);
  }
  if (shellStyle) {
    shellAttrs.push(`style="${escapeAttribute(shellStyle)}"`);
  }
  appendStyleScopeAttribute(shellAttrs, context.styleScopeId);
  const speedButtonLabel = formatVideoPlaybackRateLabel(defaultSpeed);
  const speedButtonText = `${showSpeedIcon && iconsLoad === "eager" ? `${iconSpeed} ` : ""}${speedButtonLabel}`;
  const skipBackwardLabel = `${skipLabel} backward ${formatVideoSkipDuration(skipBackwardSeconds)}`;
  const skipForwardLabel = `${skipLabel} forward ${formatVideoSkipDuration(skipForwardSeconds)}`;
  const qualityOptionsMarkup = qualityControlEnabled
    ? resolvedQualities
      .map((entry) => {
        const selected = entry.id === defaultQuality ? ` selected` : "";
        return `<option value="${escapeAttribute(entry.id)}"${selected}>${escapeHtml(entry.label)}</option>`;
      })
      .join("")
    : "";
  const qualityControlMarkup = qualityControlEnabled
    ? `<label class="rx-video-quality-wrap resux-video__control" data-rx-video-quality-wrap data-resux-video-control="true">`
      + `<span class="rx-video-quality-prefix" aria-hidden="true">${escapeHtml(showQualityIcon ? iconQuality : qualityLabel)}</span>`
      + `<select class="rx-video-quality-select resux-video__quality-select" data-rx-video-quality data-resux-video-control="true" aria-label="${escapeAttribute(qualityLabel)}">${qualityOptionsMarkup}</select>`
      + `</label>`
    : "";
  const speedControlsMarkup = speedControl
    ? `<button type="button" class="rx-video-btn rx-video-speed resux-video__speed-button" data-rx-video-speed data-resux-video-control="true" aria-label="${escapeAttribute(speedLabel)}">${escapeHtml(speedButtonText)}</button>`
    : "";
  const hasOverlayQuickControls = !customControls && (speedControl || qualityControlEnabled);
  const initialPlayIcon = iconsLoad === "lazy" ? iconPlayFallback : iconPlay;
  const initialUnmuteIcon = iconsLoad === "lazy" ? iconUnmuteFallback : iconUnmute;
  const initialFullscreenIcon = iconsLoad === "lazy" ? iconFullscreenFallback : iconFullscreen;
  const initialSkipBackIcon = iconsLoad === "lazy" ? iconSkipBackwardFallback : iconSkipBackward;
  const initialSkipForwardIcon = iconsLoad === "lazy" ? iconSkipForwardFallback : iconSkipForward;
  const timeHiddenAttr = showTime ? "" : ` hidden`;
  const progressHiddenAttr = showProgress ? "" : ` hidden`;
  const volumeHiddenAttr = showVolume ? "" : ` hidden`;
  const fullscreenHiddenAttr = showFullscreen ? "" : ` hidden`;
  const skipControlsHiddenAttr = sideSkipEnabled ? "" : ` hidden`;
  const interactionZonesMarkup = interactionZonesEnabled
    ? `<div class="rx-video-click-zones" data-rx-video-click-zones data-rx-video-skip-overlay-zone aria-hidden="true">`
      + `<button type="button" class="rx-video-zone rx-video-zone-left" data-rx-video-zone="left" data-resux-video-zone="left" data-rx-video-side-action="-${escapeAttribute(String(skipBackwardSeconds))}" data-rx-skip-indicator="${sideSkipEnabled ? `-${escapeAttribute(formatVideoSkipDuration(skipBackwardSeconds))}` : ""}" aria-label="${escapeAttribute(skipBackwardLabel)}"></button>`
      + `<button type="button" class="rx-video-zone rx-video-zone-center" data-rx-video-zone="center" data-resux-video-zone="center" data-rx-skip-indicator="" aria-label="Toggle play or pause video"></button>`
      + `<button type="button" class="rx-video-zone rx-video-zone-right" data-rx-video-zone="right" data-resux-video-zone="right" data-rx-video-side-action="${escapeAttribute(String(skipForwardSeconds))}" data-rx-skip-indicator="${sideSkipEnabled ? `+${escapeAttribute(formatVideoSkipDuration(skipForwardSeconds))}` : ""}" aria-label="${escapeAttribute(skipForwardLabel)}"></button>`
      + `</div>`
    : "";
  const feedbackMarkup = `<div class="rx-video-feedback" data-rx-video-feedback aria-live="polite"><span>${escapeHtml(iconLoading)}</span></div>`;
  const controlsMarkup = customControls
    ? `<div class="rx-video-controls resux-video__controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">`
      + `<button type="button" class="rx-video-btn rx-video-toggle resux-video__control" data-rx-video-toggle data-resux-video-control="true" aria-label="Play video">${escapeHtml(initialPlayIcon)}</button>`
      + `<button type="button" class="rx-video-btn rx-video-skip-back resux-video__control" data-rx-video-skip-back-button data-resux-video-control="true" aria-label="${escapeAttribute(skipBackwardLabel)}"${skipControlsHiddenAttr}>${escapeHtml(initialSkipBackIcon)}</button>`
      + `<span class="rx-video-time" data-rx-video-current${timeHiddenAttr}>0:00</span>`
      + `<input class="rx-video-seek" data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek video"${progressHiddenAttr}>`
      + `<span class="rx-video-time" data-rx-video-duration${timeHiddenAttr}>0:00</span>`
      + `<button type="button" class="rx-video-btn rx-video-skip-forward resux-video__control" data-rx-video-skip-forward-button data-resux-video-control="true" aria-label="${escapeAttribute(skipForwardLabel)}"${skipControlsHiddenAttr}>${escapeHtml(initialSkipForwardIcon)}</button>`
      + `<button type="button" class="rx-video-btn rx-video-mute resux-video__control" data-rx-video-mute data-resux-video-control="true" aria-label="Toggle mute"${volumeHiddenAttr}>${escapeHtml(initialUnmuteIcon)}</button>`
      + `<input class="rx-video-volume" data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"${volumeHiddenAttr}>`
      + speedControlsMarkup
      + qualityControlMarkup
      + `<button type="button" class="rx-video-btn rx-video-fullscreen resux-video__control" data-rx-video-fullscreen data-resux-video-control="true" aria-label="Toggle fullscreen"${fullscreenHiddenAttr}>${escapeHtml(initialFullscreenIcon)}</button>`
      + `</div>`
    : hasOverlayQuickControls
      ? `<div class="rx-video-controls rx-video-controls-compact resux-video__overlay-controls" data-rx-video-controls data-resux-video-control="true" data-rx-video-controls-compact="true" role="group" aria-label="Video quick controls">`
        + speedControlsMarkup
        + qualityControlMarkup
        + `</div>`
      : "";
  return `<div ${shellAttrs.join(" ")}><div class="resux-video__stage" data-rx-video-stage data-rx-video-custom-controls="${customControls ? "true" : "false"}">${videoMarkup}${interactionZonesMarkup}${feedbackMarkup}${controlsMarkup}</div></div>`;
}

function renderResuxIcon(node: ElementTemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  const nameAttr = node.attrs.find(a => a.name === "name" || a.name === "icon");
  const iconName = nameAttr
    ? (nameAttr.kind === "static" ? nameAttr.value : String(evaluateExpression(nameAttr.value, context.scope, locals) ?? ""))
    : "";
  const sizeAttr = node.attrs.find(a => a.name === "size");
  const iconSize = sizeAttr
    ? (sizeAttr.kind === "static" ? sizeAttr.value : String(evaluateExpression(sizeAttr.value, context.scope, locals) ?? ""))
    : "";

  const attrs: string[] = [
    'class="resux-icon"',
    `data-icon-name="${escapeAttribute(iconName)}"`
  ];

  if (iconSize) {
    attrs.push(`style="font-size: ${escapeAttribute(iconSize)}; width: ${escapeAttribute(iconSize)}; height: ${escapeAttribute(iconSize)};"`);
  }

  appendStyleScopeAttribute(attrs, context.styleScopeId);

  const svgInside = `<svg data-icon-name="${escapeAttribute(iconName)}" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>`;
  return `<span ${attrs.join(" ")}>${svgInside}</span>`;
}

function renderResuxPicture(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  const input = resolveResuxImageRenderInput(node, context, locals);
  if (!input.src) {
    return "";
  }
  const props = collectComponentProps(node, context.scope, locals);

  const builder = createResuxImageBuilder(context.route, context.runtimeConfig, false);
  const fallbackSource = input.fallbackSrc ?? input.src;
  const fallbackSrc = builder(fallbackSource, {
    provider: input.provider,
    cache: input.cache,
    width: input.width,
    height: input.height,
    quality: input.quality,
    fit: input.fit,
    modifiers: input.modifiers,
  });
  const fallbackSrcset = buildResuxImageSrcset(builder, {
    ...input,
    src: fallbackSource,
    format: undefined,
  });
  registerResuxImagePreload(context, fallbackSrc, fallbackSrcset, input, input.preload);

  const manualChildren = renderTemplateNodes(node.children, context, locals);
  const explicitSources = resolvePictureSourceInputs(props.sources, input);
  const sourceInputs = explicitSources.length
    ? explicitSources
    : input.formats.map((format) => ({
      src: input.src,
      widths: input.widths,
      width: input.width,
      height: input.height,
      quality: input.quality,
      format,
      fit: input.fit,
      sizes: input.sizes,
      modifiers: input.modifiers,
      type: resuxImageMimeType(format),
    } as ResuxPictureSourceInput));
  const generatedSources = sourceInputs
    .map((sourceInput) => {
      const sourceRenderInput: ResuxImageRenderInput = {
        ...input,
        src: sourceInput.src,
        width: sourceInput.width,
        height: sourceInput.height,
        widths: sourceInput.widths,
        sizes: sourceInput.sizes,
        quality: sourceInput.quality,
        format: sourceInput.format,
        fit: sourceInput.fit,
        modifiers: sourceInput.modifiers,
        placeholderSrc: undefined,
        placeholderClass: undefined,
        placeholderStyle: undefined,
        fallbackSrc: undefined,
        attrs: {},
        preload: false,
        deferLazy: input.deferLazy,
      };
      const sourceSrcset = sourceInput.srcset || buildResuxImageSrcset(builder, sourceRenderInput);
      const sourceUrl = builder(sourceInput.src, {
        provider: input.provider,
        cache: input.cache,
        width: sourceInput.width,
        height: sourceInput.height,
        quality: sourceInput.quality,
        fit: sourceInput.fit,
        format: sourceInput.format,
        modifiers: sourceInput.modifiers,
      });
      const resolvedSrcset = sourceSrcset || sourceUrl;
      if (!resolvedSrcset) {
        return "";
      }
      const sourceAttrs: string[] = [];
      const sourceType = sourceInput.type
        || (sourceInput.format ? resuxImageMimeType(sourceInput.format) : inferImageMimeTypeFromSource(sourceInput.src));
      if (sourceType) {
        sourceAttrs.push(`type="${escapeAttribute(sourceType)}"`);
      }
      if (sourceInput.media) {
        sourceAttrs.push(`media="${escapeAttribute(sourceInput.media)}"`);
      }
      if (input.deferLazy) {
        sourceAttrs.push(`data-rx-lazy-srcset="${escapeAttribute(resolvedSrcset)}"`);
        sourceAttrs.push(`data-srcset="${escapeAttribute(resolvedSrcset)}"`);
        if (sourceInput.sizes) {
          sourceAttrs.push(`data-rx-lazy-sizes="${escapeAttribute(sourceInput.sizes)}"`);
        }
      } else {
        sourceAttrs.push(`srcset="${escapeAttribute(resolvedSrcset)}"`);
        if (sourceInput.sizes) {
          sourceAttrs.push(`sizes="${escapeAttribute(sourceInput.sizes)}"`);
        }
      }
      return `<source ${sourceAttrs.join(" ")}>`;
    })
    .filter(Boolean)
    .join("");

  const img = renderResuxImgTag(input, fallbackSrc, fallbackSrcset, undefined);
  const attrs: string[] = ['data-resux-media="picture"'];
  appendStyleScopeAttribute(attrs, context.styleScopeId);
  const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<picture${attrText}>${manualChildren}${generatedSources}${img}</picture>`;
}

function resolveResuxImageRenderInput(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): ResuxImageRenderInput {
  const props = collectComponentProps(node, context.scope, locals);
  const runtimeImageConfig = resolveRuntimeImageConfig(context.runtimeConfig);
  const baseModifiers = resolveResuxImageModifierProps(props.modifiers);
  const explicitFormat = readStringProp(props.format);
  const explicitFormats = parseImageFormats(
    props.formats
    ?? (explicitFormat?.includes(",") ? explicitFormat : undefined),
  );
  const hasExplicitQuality = Object.prototype.hasOwnProperty.call(props, "quality");
  const hasExplicitFormat = Object.prototype.hasOwnProperty.call(props, "format");
  const explicitQuality = readNumberProp(props.quality);
  const modifiers = normalizeImageModifiers({
    ...baseModifiers,
    ...(hasExplicitFormat && !explicitFormat ? { format: false } : {}),
    ...(hasExplicitQuality && !explicitQuality ? { quality: false } : {}),
  });
  const provider = readStringProp(props.provider);
  const quality = hasExplicitQuality
    ? explicitQuality
    : (explicitQuality ?? runtimeImageConfig.quality);
  const cache = normalizeImageCacheValue(props.cache ?? runtimeImageConfig.cache);
  const fit = readStringProp(props.fit) as ResuxImageFit | undefined;
  const width = readNumberProp(props.width);
  const height = readNumberProp(props.height);
  const priority = readBooleanProp(props.priority, false);
  const preload = readBooleanProp(props.preload, priority);
  const explicitLoading = readStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : !priority);
  const loading = explicitLoading ?? (lazy ? "lazy" : "eager");
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true;
  const lazyRootMargin = readStringProp(props.rootMargin) ?? "0px 0px";
  const lazyThresholdRaw = Number(props.threshold);
  const lazyThreshold = Number.isFinite(lazyThresholdRaw)
    ? Math.min(1, Math.max(0, lazyThresholdRaw))
    : 0;
  const decoding = readStringProp(props.decoding) ?? "async";
  const fetchPriority = readStringProp(props.fetchpriority ?? props.fetchPriority)
    ?? (priority ? "high" : undefined);
  const densities = parseImageNumberList(props.densities)
    || runtimeImageConfig.densities
    || [1, 2];
  const widths = parseImageNumberList(props.widths) ?? [];
  const passthrough = collectResuxImagePassthroughAttributes(props);
  const src = readStringProp(props.src)
    ?? readStringProp(props.fallbackSrc ?? props.fallback)
    ?? "";
  const alt = readStringProp(props.alt) ?? "";
  const placeholderSrc = resolveMediaPlaceholderSource(props.placeholder);
  const fallbackSrc = readStringProp(props.fallbackSrc ?? props.fallback);

  return {
    src,
    alt,
    width,
    height,
    sizes: readStringProp(props.sizes),
    densities,
    widths,
    loading,
    decoding,
    fetchPriority,
    provider,
    cache,
    quality,
    fit,
    format: explicitFormats.length
      ? undefined
      : (hasExplicitFormat ? explicitFormat : (explicitFormat ?? runtimeImageConfig.format)),
    formats: explicitFormats,
    preload,
    deferLazy,
    lazyRootMargin,
    lazyThreshold,
    placeholderSrc,
    placeholderClass: readStringProp(props.placeholderClass),
    placeholderStyle: readStringProp(props.placeholderStyle),
    fallbackSrc,
    modifiers,
    attrs: passthrough,
  };
}

function collectResuxImagePassthroughAttributes(
  props: ComponentProps,
): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [name, rawValue] of Object.entries(props)) {
    if (resuxImageReservedProps.has(name)) {
      continue;
    }
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue;
    }
    const attrName = name === "className"
      ? "class"
      : name === "referrerPolicy"
        ? "referrerpolicy"
        : name === "crossOrigin"
          ? "crossorigin"
          : name;
    attrs[attrName] = stringifyAttributeValue(attrName, rawValue);
  }
  return attrs;
}

function resolveResuxImageModifierProps(value: unknown): ResuxImageModifiers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return normalizeImageModifiers(value as ResuxImageModifiers);
}

function buildResuxImageSrcset(
  builder: ResuxImageBuilder,
  input: ResuxImageRenderInput,
): string | undefined {
  const widthCandidates = resolveResuxImageWidthCandidates(input);
  if (widthCandidates.length) {
    return widthCandidates
      .map((width) => `${builder(input.src, {
        provider: input.provider,
        cache: input.cache,
        width,
        height: resolveResuxImageCandidateHeight(input, width),
        quality: input.quality,
        fit: input.fit,
        format: input.format,
        modifiers: input.modifiers,
      })} ${width}w`)
      .join(", ");
  }

  if (!input.width || !input.densities.length) {
    return undefined;
  }

  return [...new Set(input.densities)]
    .sort((left, right) => left - right)
    .map((density) => {
      const width = Math.max(1, Math.round(input.width! * density));
      return `${builder(input.src, {
        provider: input.provider,
        cache: input.cache,
        width,
        height: input.height ? Math.max(1, Math.round(input.height * density)) : undefined,
        quality: input.quality,
        fit: input.fit,
        format: input.format,
        modifiers: input.modifiers,
      })} ${density}x`;
    })
    .join(", ");
}

function resolveResuxImageWidthCandidates(input: ResuxImageRenderInput): number[] {
  const explicitWidths = input.widths.length
    ? normalizeResuxImageWidthCandidates(input.widths, input.width)
    : [];
  if (explicitWidths.length) {
    return explicitWidths;
  }
  if (!input.sizes) {
    return [];
  }
  return resolveResuxImageWidthsFromSizes(
    input.sizes,
    input.densities,
    input.width,
  );
}

function resolveResuxImageWidthsFromSizes(
  sizes: string,
  densities: number[],
  maxWidth?: number,
): number[] {
  const descriptors = sizes
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const baseWidths: number[] = [];
  for (const descriptor of descriptors) {
    const match = [...descriptor.matchAll(/([0-9]*\.?[0-9]+)\s*(px|vw)\b/g)].pop();
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (match[2] === "px") {
      baseWidths.push(Math.round(value));
      continue;
    }
    for (const viewportWidth of resuxResponsiveViewportWidths) {
      baseWidths.push(Math.round((viewportWidth * value) / 100));
    }
  }

  const safeDensities = densities.length
    ? [...new Set(densities)]
      .filter((entry) => Number.isFinite(entry) && entry > 0)
      .sort((left, right) => left - right)
    : [1];
  const expandedWidths = baseWidths.flatMap((width) =>
    safeDensities.map((density) => Math.round(width * density)),
  );

  if (!expandedWidths.length && Number.isFinite(maxWidth) && (maxWidth as number) > 0) {
    return [Math.max(1, Math.round(maxWidth as number))];
  }
  return normalizeResuxImageWidthCandidates(expandedWidths, maxWidth);
}

function normalizeResuxImageWidthCandidates(
  candidates: number[],
  maxWidth?: number,
): number[] {
  const resolvedMaxWidth = Number.isFinite(maxWidth) && (maxWidth as number) > 0
    ? Math.round(maxWidth as number)
    : Number.POSITIVE_INFINITY;
  const normalized = [...new Set(candidates
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.min(8192, Math.max(1, Math.round(entry)), resolvedMaxWidth)))]
    .sort((left, right) => left - right);
  const compacted: number[] = [];
  for (const width of normalized) {
    const previous = compacted[compacted.length - 1];
    const shouldKeep = previous === undefined
      || width - previous >= 24
      || (Number.isFinite(resolvedMaxWidth) && width === resolvedMaxWidth);
    if (shouldKeep) {
      compacted.push(width);
    }
  }
  return compacted;
}

function resolveResuxImageCandidateHeight(
  input: ResuxImageRenderInput,
  width: number,
): number | undefined {
  if (!input.height) {
    return undefined;
  }
  if (!input.width) {
    return input.height;
  }
  const scaledHeight = Math.round((input.height / input.width) * width);
  return Math.max(1, scaledHeight);
}

function registerResuxImagePreload(
  context: RenderTemplateContext,
  href: string,
  srcset: string | undefined,
  input: ResuxImageRenderInput,
  enabled: boolean,
): void {
  if (!enabled || !href || !context.addHeadEntry) {
    return;
  }

  const link: Record<string, string> = {
    rel: "preload",
    as: "image",
    href,
    ...(input.fetchPriority ? { fetchpriority: input.fetchPriority } : {}),
  };
  if (srcset) {
    link.imagesrcset = srcset;
  }
  if (input.sizes) {
    link.imagesizes = input.sizes;
  }
  if (input.format && input.formats.length === 0) {
    link.type = resuxImageMimeType(input.format);
  }
  context.addHeadEntry({ link: [link] });
}

function registerResuxVideoPreload(
  context: RenderTemplateContext,
  href: string | undefined,
  type: string | undefined,
  fetchPriority: string | undefined,
  enabled: boolean,
): void {
  if (!enabled || !href || !context.addHeadEntry) {
    return;
  }
  const resolvedType = type || resolveVideoMimeTypeFromSource(href);
  const link: Record<string, string> = {
    rel: "preload",
    as: "video",
    href,
    ...(resolvedType ? { type: resolvedType } : {}),
    ...(fetchPriority ? { fetchpriority: fetchPriority } : {}),
  };
  context.addHeadEntry({ link: [link] });
}

function resolveVideoMimeTypeFromSource(src: string | undefined): string | undefined {
  const raw = String(src || "").trim().toLowerCase();
  if (!raw) {
    return undefined;
  }
  if (raw.endsWith(".mp4") || raw.endsWith(".m4v")) {
    return "video/mp4";
  }
  if (raw.endsWith(".webm")) {
    return "video/webm";
  }
  if (raw.endsWith(".ogg")) {
    return "video/ogg";
  }
  if (raw.endsWith(".mov")) {
    return "video/quicktime";
  }
  return undefined;
}

function resolveVideoSkipSeconds(
  value: unknown,
  fallback: number,
): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(120, Math.max(0.25, Math.round(parsed * 100) / 100));
}

function formatVideoSkipDuration(seconds: number): string {
  const normalized = resolveVideoSkipSeconds(seconds, 10);
  return Number.isInteger(normalized) ? `${Math.trunc(normalized)}s` : `${normalized}s`;
}

function renderResuxImgTag(
  input: ResuxImageRenderInput,
  src: string,
  srcset: string | undefined,
  styleScopeId?: string,
): string {
  const attrs: string[] = [];
  const isDeferredLazy = input.deferLazy && input.loading.toLowerCase() === "lazy";
  const placeholderSrc = input.placeholderSrc;
  const placeholderClass = input.placeholderClass;
  const placeholderStyle = input.placeholderStyle;
  const aspectRatioStyle = resolveAspectRatioStyle(input.width, input.height, input.attrs.style, placeholderStyle);
  const placeholderBackground = placeholderSrc
    ? `background-image: url('${placeholderSrc}'); background-size: cover; background-position: center; background-repeat: no-repeat`
    : undefined;
  const mergedClass = mergeClassNames(input.attrs.class, placeholderClass);
  const mergedStyle = mergeInlineStyles(
    input.attrs.style,
    aspectRatioStyle,
    placeholderBackground,
    placeholderStyle,
  );
  const initialSrc = isDeferredLazy
    ? resuxLazyPlaceholderSrc
    : src;
  const mergedAttrs = {
    ...input.attrs,
    ...(mergedClass ? { class: mergedClass } : {}),
    ...(mergedStyle ? { style: mergedStyle } : {}),
    src: initialSrc,
    alt: input.alt,
    loading: input.loading,
    decoding: input.decoding,
    "data-resux-media": "img",
    "data-resux-img": isDeferredLazy ? "idle" : "loading",
    ...(!isDeferredLazy ? { "data-resux-loading": "true" } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-image": "true" } : {}),
    ...(isDeferredLazy ? { "data-resux-lazy": "true" } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-src": src, "data-src": src } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-root-margin": input.lazyRootMargin } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-threshold": String(input.lazyThreshold) } : {}),
    ...(isDeferredLazy && srcset ? { "data-rx-lazy-srcset": srcset, "data-srcset": srcset } : {}),
    ...(isDeferredLazy && input.sizes ? { "data-rx-lazy-sizes": input.sizes } : {}),
    ...(placeholderSrc ? { "data-rx-placeholder-src": placeholderSrc, "data-placeholder": placeholderSrc } : {}),
    ...(placeholderClass ? { "data-rx-placeholder-class": placeholderClass } : {}),
    ...(placeholderStyle ? { "data-rx-placeholder-style": placeholderStyle } : {}),
    ...(placeholderSrc ? { "data-rx-placeholder-active": "true", "data-resux-placeholder-active": "true" } : {}),
    ...(input.fallbackSrc ? { "data-rx-fallback-src": input.fallbackSrc } : {}),
    ...(input.fetchPriority ? { fetchpriority: input.fetchPriority } : {}),
    ...(input.width ? { width: String(input.width) } : {}),
    ...(input.height ? { height: String(input.height) } : {}),
    ...(!isDeferredLazy && srcset ? { srcset } : {}),
    ...(!isDeferredLazy && input.sizes ? { sizes: input.sizes } : {}),
  };

  for (const [name, value] of Object.entries(mergedAttrs)) {
    if (value === undefined || value === null) {
      continue;
    }
    attrs.push(`${name}="${escapeAttribute(String(value))}"`);
  }
  appendStyleScopeAttribute(attrs, styleScopeId);
  const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  return `<img${attrText}>`;
}

function parseImageFormats(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseImageNumberList(value: unknown): number[] | undefined {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!values) {
    return undefined;
  }
  const numbers = values
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.round(entry));
  return numbers.length ? numbers : undefined;
}

function normalizeVideoTransformFormat(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "video/mp4" || normalized === "mp4") {
    return "mp4";
  }
  if (normalized === "video/webm" || normalized === "webm") {
    return "webm";
  }
  return undefined;
}

function parseVideoFormats(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = values
    .map((entry) => normalizeVideoTransformFormat(entry))
    .filter((entry): entry is string => Boolean(entry));
  return [...new Set(normalized)];
}

function normalizeVideoTransformQualityValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === false) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return Math.max(144, Math.min(4320, Math.round(value)));
  }
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (!raw) {
      return undefined;
    }
    const numeric = raw.endsWith("p") ? raw.slice(0, -1) : raw;
    const parsed = Number(numeric);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.max(144, Math.min(4320, Math.round(parsed)));
  }
  return undefined;
}

function parseVideoTransformQualityList(value: unknown): number[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = values
    .map((entry) => normalizeVideoTransformQualityValue(entry))
    .filter((entry): entry is number => Number.isFinite(entry));
  return [...new Set(normalized)].sort((left, right) => left - right);
}

function isVideoTransformQualityInputList(
  value: unknown,
): value is Array<string | number> {
  return Array.isArray(value)
    && value.every((entry) => typeof entry === "string" || typeof entry === "number");
}

function normalizeVideoQualityLabel(value: unknown): string | undefined {
  const numeric = normalizeVideoTransformQualityValue(value);
  return numeric ? `${numeric}p` : undefined;
}

function inferVideoExtensionFromSource(value: string | undefined): string | undefined {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    return undefined;
  }
  const withoutQuery = raw.split(/[?#]/)[0];
  if (withoutQuery.endsWith(".mp4") || withoutQuery.endsWith(".m4v")) {
    return "mp4";
  }
  if (withoutQuery.endsWith(".webm")) {
    return "webm";
  }
  if (withoutQuery.endsWith(".mov")) {
    return "mp4";
  }
  return undefined;
}

function readStringProp(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumberProp(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed);
}

function readBooleanProp(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "") {
      return true;
    }
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
}

function resolveMediaPlaceholderSource(value: unknown): string | undefined {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }
  if (value === true) {
    return resuxDefaultPlaceholderSrc;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return resuxDefaultPlaceholderSrc;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return undefined;
  }
  if (normalized === "empty") {
    return undefined;
  }
  const modeSource = createMediaModePlaceholderDataUri(normalized);
  if (modeSource) {
    return modeSource;
  }
  if (looksLikeMediaSource(trimmed)) {
    return trimmed;
  }
  return createTextPlaceholderDataUri(trimmed);
}

function createMediaModePlaceholderDataUri(mode: string): string | undefined {
  if (mode === "blur") {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Blur placeholder">`
      + `<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0b1220"/></linearGradient></defs>`
      + `<rect width="800" height="450" fill="url(#g)"/>`
      + `<rect x="32" y="32" width="736" height="386" rx="28" fill="rgba(255,255,255,0.06)"/>`
      + `</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  if (mode === "skeleton") {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Skeleton placeholder">`
      + `<rect width="800" height="450" fill="#0f172a"/>`
      + `<rect x="32" y="32" width="736" height="386" rx="28" fill="#1e293b"/>`
      + `<rect x="72" y="290" width="420" height="24" rx="12" fill="#334155"/>`
      + `<rect x="72" y="330" width="300" height="20" rx="10" fill="#475569"/>`
      + `</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  if (mode === "spinner") {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Spinner placeholder">`
      + `<rect width="800" height="450" fill="#0f172a"/>`
      + `<circle cx="400" cy="225" r="62" fill="none" stroke="#334155" stroke-width="14"/>`
      + `<path d="M400 163a62 62 0 0 1 54 31" fill="none" stroke="#38bdf8" stroke-width="14" stroke-linecap="round"/>`
      + `</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  return undefined;
}

function looksLikeMediaSource(value: string): boolean {
  return (
    value.startsWith("/")
    || value.startsWith("./")
    || value.startsWith("../")
    || value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("data:image/")
    || value.startsWith("blob:")
  );
}

function createTextPlaceholderDataUri(value: string): string {
  const safeLabel = escapeSvgText(value);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${safeLabel}">`
    + `<rect width="640" height="360" fill="#0f172a"/>`
    + `<rect x="24" y="24" width="592" height="312" rx="20" fill="#111827" stroke="#334155" stroke-width="2"/>`
    + `<text x="320" y="192" fill="#cbd5e1" font-size="30" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${safeLabel}</text>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mergeClassNames(...values: Array<string | undefined>): string | undefined {
  const tokens = values
    .flatMap((value) => String(value ?? "").split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.length ? [...new Set(tokens)].join(" ") : undefined;
}

function mergeInlineStyles(...values: Array<string | undefined>): string | undefined {
  const parts = values
    .flatMap((value) => String(value ?? "").split(";"))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
}

function hasInlineStyleProperty(styleValue: unknown, propertyName: string): boolean {
  if (typeof styleValue !== "string") {
    return false;
  }
  const normalized = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|;)\\s*${normalized}\\s*:`, "i");
  return pattern.test(styleValue);
}

function resolveAspectRatioStyle(
  width: number | undefined,
  height: number | undefined,
  ...styleValues: Array<unknown>
): string | undefined {
  if (!width || !height) {
    return undefined;
  }
  if (styleValues.some((entry) => hasInlineStyleProperty(entry, "aspect-ratio"))) {
    return undefined;
  }
  return `aspect-ratio: ${width} / ${height}`;
}

function resolvePictureSourceInputs(
  value: unknown,
  fallbackInput: ResuxImageRenderInput,
): ResuxPictureSourceInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const resolved: ResuxPictureSourceInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const src = readStringProp(record.src) ?? fallbackInput.src;
    if (!src) {
      continue;
    }
    const hasQuality = Object.prototype.hasOwnProperty.call(record, "quality");
    const hasFormat = Object.prototype.hasOwnProperty.call(record, "format");
    const explicitFormat = readStringProp(record.format);
    const sourceWidths = parseImageNumberList(record.widths) ?? fallbackInput.widths;
    const baseModifiers = resolveResuxImageModifierProps(record.modifiers);
    const modifiers: ResuxImageModifiers = normalizeImageModifiers({
      ...fallbackInput.modifiers,
      ...baseModifiers,
      ...(hasFormat && !explicitFormat ? { format: false } : {}),
      ...(hasQuality && !readNumberProp(record.quality) ? { quality: false } : {}),
      ...(readStringProp(record.fit) ? { fit: readStringProp(record.fit)! as ResuxImageFit } : {}),
      ...(readNumberProp(record.width) ? { width: readNumberProp(record.width)! } : {}),
      ...(readNumberProp(record.height) ? { height: readNumberProp(record.height)! } : {}),
      ...(readNumberProp(record.quality) ? { quality: readNumberProp(record.quality)! } : {}),
      ...(explicitFormat ? { format: explicitFormat } : {}),
    });

    resolved.push({
      src,
      srcset: readStringProp(record.srcset),
      type: readStringProp(record.type),
      media: readStringProp(record.media),
      sizes: readStringProp(record.sizes) ?? fallbackInput.sizes,
      width: readNumberProp(record.width) ?? fallbackInput.width,
      height: readNumberProp(record.height) ?? fallbackInput.height,
      widths: sourceWidths,
      quality: hasQuality
        ? readNumberProp(record.quality)
        : fallbackInput.quality,
      format: hasFormat
        ? explicitFormat
        : fallbackInput.format,
      fit: (readStringProp(record.fit) as ResuxImageFit | undefined) ?? fallbackInput.fit,
      modifiers,
    });
  }

  return resolved;
}

function resolveVideoSources(value: unknown): ResuxVideoSourceInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sources: ResuxVideoSourceInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const src = readStringProp(record.src);
    if (!src) {
      continue;
    }
    const quality = normalizeVideoQualityLabel(record.quality)
      ?? normalizeVideoQualityLabel(record.label);
    sources.push({
      src,
      type: readStringProp(record.type),
      ...(quality ? { quality } : {}),
    });
  }
  return sources;
}

function normalizeVideoQualityId(value: unknown): string | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return undefined;
  }
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || undefined;
}

function resolveVideoQualityOptions(
  value: unknown,
  fallbackSources: ResuxVideoSourceInput[],
  fallbackSrc: string | undefined,
  generatedOptions: ResuxVideoQualityOption[] = [],
): ResuxVideoQualityOption[] {
  if (!Array.isArray(value)) {
    return generatedOptions.length
      ? generatedOptions
      : deriveVideoQualityOptionsFromSources(fallbackSources);
  }

  const resolved: ResuxVideoQualityOption[] = [];
  const usedIds = new Set<string>();
  let autoIndex = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const explicitSources = resolveVideoSources(record.sources);
    const directSrc = readStringProp(record.src);
    const directType = readStringProp(record.type);
    const sources = explicitSources.length
      ? explicitSources
      : directSrc
        ? [{ src: directSrc, type: directType }]
        : [];
    if (!sources.length) {
      continue;
    }
    const rawLabel = readStringProp(record.label);
    const rawId = normalizeVideoQualityId(record.id)
      ?? normalizeVideoQualityId(rawLabel)
      ?? `q${autoIndex + 1}`;
    let candidateId = rawId;
    while (usedIds.has(candidateId)) {
      autoIndex += 1;
      candidateId = `${rawId}-${autoIndex + 1}`;
    }
    usedIds.add(candidateId);
    autoIndex += 1;
    const label = rawLabel ?? candidateId.toUpperCase();
    resolved.push({
      id: candidateId,
      label,
      sources,
    });
  }

  if (resolved.length > 0) {
    return resolved;
  }
  if (generatedOptions.length) {
    return generatedOptions;
  }
  const fromSources = deriveVideoQualityOptionsFromSources(fallbackSources);
  if (fromSources.length) {
    return fromSources;
  }
  if (fallbackSrc) {
    return [];
  }
  return [];
}

function deriveVideoQualityOptionsFromSources(
  sources: ResuxVideoSourceInput[],
): ResuxVideoQualityOption[] {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }
  const grouped = new Map<string, ResuxVideoQualityOption>();
  for (const source of sources) {
    const qualityLabel = normalizeVideoQualityLabel(source.quality);
    if (!qualityLabel) {
      continue;
    }
    const id = normalizeVideoQualityId(qualityLabel);
    if (!id) {
      continue;
    }
    let entry = grouped.get(id);
    if (!entry) {
      entry = { id, label: qualityLabel, sources: [] };
      grouped.set(id, entry);
    }
    entry.sources.push({
      src: source.src,
      ...(source.type ? { type: source.type } : {}),
      quality: qualityLabel,
    });
  }
  const resolved = Array.from(grouped.values())
    .filter((entry) => entry.sources.length > 0)
    .sort((left, right) => {
      const leftHeight = normalizeVideoTransformQualityValue(left.label) ?? Number.POSITIVE_INFINITY;
      const rightHeight = normalizeVideoTransformQualityValue(right.label) ?? Number.POSITIVE_INFINITY;
      return leftHeight - rightHeight;
    });
  return resolved.length > 1 ? resolved : [];
}

function resolveVideoDefaultQuality(
  value: unknown,
  qualities: ResuxVideoQualityOption[],
): string | undefined {
  if (!qualities.length) {
    return undefined;
  }
  const explicit = normalizeVideoQualityId(value);
  if (explicit && qualities.some((entry) => entry.id === explicit)) {
    return explicit;
  }
  return qualities[0].id;
}

function serializeVideoQualityOptions(options: ResuxVideoQualityOption[]): string {
  return JSON.stringify(options.map((entry) => ({
    id: entry.id,
    label: entry.label,
    sources: entry.sources.map((source) => ({
      src: source.src,
      ...(source.type ? { type: source.type } : {}),
    })),
  })));
}

function normalizeVideoPlaybackSpeed(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 100) / 100;
}

function resolveVideoPlaybackSpeeds(value: unknown): number[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!rawValues) {
    return [0.5, 0.75, 1, 1.25, 1.5, 2];
  }
  const normalized = rawValues
    .map((entry) => normalizeVideoPlaybackSpeed(entry))
    .filter((entry): entry is number => Number.isFinite(entry));
  const uniqueSorted = [...new Set(normalized)].sort((left, right) => left - right);
  return uniqueSorted.length > 0 ? uniqueSorted : [0.5, 0.75, 1, 1.25, 1.5, 2];
}

function resolveVideoDefaultSpeed(value: unknown, speeds: number[]): number {
  const fallback = speeds.includes(1) ? 1 : (speeds[0] ?? 1);
  const explicit = normalizeVideoPlaybackSpeed(value);
  if (!explicit) {
    return fallback;
  }
  if (speeds.includes(explicit)) {
    return explicit;
  }
  let nearest = speeds[0] ?? explicit;
  let nearestDelta = Math.abs(nearest - explicit);
  for (const speed of speeds) {
    const delta = Math.abs(speed - explicit);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function serializeVideoPlaybackSpeeds(speeds: number[]): string {
  return speeds.map((entry) => String(entry)).join(",");
}

function formatVideoPlaybackRateLabel(value: number): string {
  const normalized = Number.isFinite(value) && value > 0 ? value : 1;
  const rounded = Math.round(normalized * 100) / 100;
  const text = Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
  return `${text}x`;
}

function resuxImageMimeType(format: string): string {
  const normalized = format.toLowerCase();
  if (normalized === "jpg") {
    return "image/jpeg";
  }
  return normalized.startsWith("image/") ? normalized : `image/${normalized}`;
}

function inferImageMimeTypeFromSource(src: string): string | undefined {
  const clean = src.split(/[?#]/)[0]?.toLowerCase();
  if (!clean) {
    return undefined;
  }
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex < 0) {
    return undefined;
  }
  const extension = clean.slice(dotIndex + 1);
  if (!extension) {
    return undefined;
  }
  return resuxImageMimeType(extension);
}

function renderVueIsland(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string {
  const name = resolveVueIslandName(node, context, locals);
  const props = resolveVueIslandProps(node, context, locals);
  const scopeAttr = context.styleScopeId ? ` ${context.styleScopeId}=""` : "";
  return `<div${scopeAttr} data-rx-vue-island="${escapeAttribute(name)}" data-rx-vue-props="${escapeAttribute(JSON.stringify(props))}"></div>`;
}

function appendStyleScopeAttribute(attrs: string[], styleScopeId?: string): void {
  if (styleScopeId) {
    attrs.push(`${styleScopeId}=""`);
  }
}

const loadingIndicatorDefaults = {
  color: "#2563eb",
  errorColor: "#dc2626",
  height: 3,
  duration: 2000,
  throttle: 200,
} as const;

function renderResuxLoadingIndicatorSync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
  slotHtml: string,
): string {
  const options = resolveResuxLoadingIndicatorOptions(node, context, locals);
  return renderResuxLoadingIndicatorMarkup(options, slotHtml);
}

async function renderResuxLoadingIndicatorAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
  slotHtml: Promise<string>,
): Promise<string> {
  const options = resolveResuxLoadingIndicatorOptions(node, context, locals);
  return renderResuxLoadingIndicatorMarkup(options, await slotHtml);
}

function resolveResuxLoadingIndicatorOptions(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): {
  color: string | false;
  errorColor: string | false;
  height: number;
  duration: number;
  throttle: number;
  estimatedProgress: "default" | "custom";
} {
  const props = collectComponentProps(node, context.scope, locals);
  const color = normalizeLoadingColor(props.color, loadingIndicatorDefaults.color);
  const errorColor = normalizeLoadingColor(
    props.errorColor,
    loadingIndicatorDefaults.errorColor,
  );

  return {
    color,
    errorColor,
    height: normalizeLoadingNumber(props.height, loadingIndicatorDefaults.height, 1),
    duration: normalizeLoadingNumber(props.duration, loadingIndicatorDefaults.duration, 1),
    throttle: normalizeLoadingNumber(props.throttle, loadingIndicatorDefaults.throttle, 0),
    estimatedProgress:
      typeof props.estimatedProgress === "function" ? "custom" : "default",
  };
}

function normalizeLoadingColor(
  value: unknown,
  fallback: string,
): string | false {
  if (value === false) {
    return false;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function normalizeLoadingNumber(
  value: unknown,
  fallback: number,
  min: number,
): number {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.round(numeric));
}

function renderResuxLoadingIndicatorMarkup(
  options: {
    color: string | false;
    errorColor: string | false;
    height: number;
    duration: number;
    throttle: number;
    estimatedProgress: "default" | "custom";
  },
  slotHtml: string,
): string {
  const styleParts = [`--resux-loader-height: ${options.height}px`];
  if (options.color !== false) {
    styleParts.push(`--resux-loader-color: ${options.color}`);
  }
  if (options.errorColor !== false) {
    styleParts.push(`--resux-loader-error-color: ${options.errorColor}`);
  }

  const attrs = [
    `data-rx-loading-indicator="true"`,
    "hidden",
    `data-state="idle"`,
    `aria-live="polite"`,
    `aria-busy="false"`,
    `data-duration="${options.duration}"`,
    `data-throttle="${options.throttle}"`,
    `data-estimated-progress="${options.estimatedProgress}"`,
    `style="${escapeAttribute(styleParts.join("; "))}"`,
  ];

  const slot = slotHtml.trim().length > 0
    ? `<div class="rx-loading-slot" data-rx-loading-slot>${slotHtml}</div>`
    : "";

  return `<div ${attrs.join(" ")}><div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>${slot}</div>`;
}

function resolveVueIslandName(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string {
  const dynamic = node.attrs.find((attr) => attr.kind === "dynamic" && attr.name === "name");
  if (dynamic) {
    return stringifyValue(evaluateExpression(dynamic.value, context.scope, locals));
  }

  const fixed = node.attrs.find((attr) => attr.kind === "static" && attr.name === "name");
  if (!fixed?.value) {
    throw new Error("<VueIsland> needs a name attribute.");
  }

  return fixed.value;
}

function resolveVueIslandProps(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): Record<string, unknown> {
  const propsAttr = node.attrs.find((attr) => attr.name === "props");
  if (!propsAttr) {
    return {};
  }

  const props = propsAttr.kind === "static"
    ? {}
    : evaluateExpression(propsAttr.value, context.scope, locals);

  if (!props || typeof props !== "object" || Array.isArray(props)) {
    throw new Error("<VueIsland> props must evaluate to an object.");
  }

  assertJsonSerializable(props, "<VueIsland> props");
  return props as Record<string, unknown>;
}

export class AsyncResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly globalStateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;
  private readonly styleIds = new Set<string>();
  readonly headEntries: HeadEntry[] = [];
  readonly resuxApp: ResuxAppLike;

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly vueIslands: Record<string, string> = {},
    private readonly layouts: Record<string, ComponentDefinition> = {},
    private readonly pageMeta: PageMeta = {},
    private readonly runtimeConfig: RuntimeConfig = { public: {} }
  ) {
    this.resuxApp = createResuxApp(route, modules, runtimeConfig);
  }

  async renderComponent(
    definition: ComponentDefinition,
    renderPage?: () => Promise<string>,
    renderSlot?: () => Promise<string>,
    props: ComponentProps = {}
  ): Promise<string> {
    this.collectComponentStyles(definition);
    const scopeId = `s${this.nextScopeId++}`;
    const stateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;
    const globalStateKeys = new Set<string>();
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = Object.create(null) as Record<string, AsyncDataResource<unknown>>;
    const setupContext = createServerSetupContext(
      this.route,
      props,
      stateRefs,
      asyncDataRefs,
      this.headEntries,
      this.resuxApp,
      this.runtimeConfig,
      this.globalStateRefs,
      globalStateKeys
    );
    const scope = await withActiveResuxApp(this.resuxApp, () => definition.script(setupContext));

    this.scopes[scopeId] = {
      id: scopeId,
      moduleId: definition.id,
      props,
      stateRefs,
      globalStateKeys,
      asyncDataRefs
    };

    return withActiveResuxApp(this.resuxApp, () => renderTemplateNodesAsync(
      definition.template,
      {
        scope,
        scopeId,
        moduleId: definition.id,
        styleScopeId: definition.styleScopeId,
        route: this.route,
        runtimeConfig: this.runtimeConfig,
        components: this.components,
        layouts: this.layouts,
        pageMeta: this.pageMeta,
        addHeadEntry: (entry) => insertHeadEntryWithPriority(this.headEntries, entry),
        renderPage,
        renderSlot,
        renderLayout: (name, slot) => this.renderLayout(name, slot)
      },
      (component, props, slot) => this.renderComponent(component, undefined, slot, props)
    ));
  }

  private collectComponentStyles(definition: ComponentDefinition): void {
    for (const style of definition.styles ?? []) {
      if (this.styleIds.has(style.id)) {
        continue;
      }
      this.styleIds.add(style.id);
      this.headEntries.push({ style: [style] });
    }
  }

  async renderLayout(name: string | false | undefined, renderSlot: () => Promise<string>): Promise<string> {
    if (name === false) {
      return renderSlot();
    }

    const selectedLayout = name ?? this.pageMeta.layout ?? "default";
    if (selectedLayout === false) {
      return renderSlot();
    }
    const layoutName = normalizeLayoutName(selectedLayout);
    const layout = this.layouts[layoutName];
    if (!layout) {
      return renderSlot();
    }

    return this.renderComponent(layout, undefined, renderSlot);
  }

  createPayload(): ResuxPayload {
    const scopes: Record<string, SerializedScope> = {};

    for (const [id, scope] of Object.entries(this.scopes)) {
      scopes[id] = {
        id,
        moduleId: scope.moduleId,
        props: serializeProps(scope.props),
        state: serializeRefs(scope.stateRefs),
        globalStateKeys: [...scope.globalStateKeys],
        asyncData: serializeAsyncData(scope.asyncDataRefs)
      };
    }

    return {
      route: this.route,
      scopes,
      globalState: serializeRefs(this.globalStateRefs),
      modules: this.modules,
      vueIslands: this.vueIslands,
      config: publicRuntimeConfig(this.runtimeConfig)
    };
  }
}

export async function renderAppAsync(options: RenderAppOptions): Promise<RenderResult> {
  const pageMeta = {
    ...(options.page.meta ?? {}),
    ...(options.pageMeta ?? {})
  };
  const runtimeConfig = options.runtimeConfig ?? { public: {} };
  const [pageMetaHead, runtimeI18nHead] = await Promise.all([
    headFromPageMeta(pageMeta, options.route, runtimeConfig),
    createRuntimeI18nHead(options.route, runtimeConfig)
  ]);
  const appHead = mergeHead([
    options.appHead ?? {},
    pageMetaHead,
    runtimeI18nHead ?? {}
  ]);
  const renderer = new AsyncResuxRenderer(
    options.route,
    options.components ?? {},
    options.modules ?? {},
    options.vueIslands ?? {},
    options.layouts ?? {},
    pageMeta,
    runtimeConfig
  );

  for (const plugin of options.plugins ?? []) {
    await withActiveResuxApp(renderer.resuxApp, () => plugin(renderer.resuxApp));
  }

  renderer.headEntries.push(appHead);
  const pageRenderer = () => renderer.renderComponent(options.page, undefined, undefined, options.pageProps ?? {});
  const html = options.app
    ? await renderer.renderComponent(options.app, pageRenderer)
    : await pageRenderer();

  return {
    html,
    payload: renderer.createPayload(),
    head: mergeHead(renderer.headEntries)
  };
}

function createResuxApp(route: RouteContext, modules: Record<string, string>, runtimeConfig: RuntimeConfig): ResuxAppLike {
  const payload: ResuxPayload = {
    route,
    scopes: {},
    globalState: Object.create(null) as Record<string, JsonValue>,
    modules,
    config: publicRuntimeConfig(runtimeConfig)
  };
  const provides = {} as ResuxAppProvides;

  return {
    route,
    payload,
    $config: runtimeConfig,
    provides,
    provide(key: string, value: unknown): void {
      (provides as Record<string, unknown>)[key] = value;
      (this as unknown as Record<string, unknown>)[`$${key}`] = value;
    },
    vueApp: {
      component(name: string, component?: any): any {
        return component;
      },
      directive(name: string, directive?: any): any {
        return directive;
      },
      use(plugin: any, ...options: any[]): any {
        return this;
      },
      mixin(mixin: any): any {
        return this;
      },
      provide(key: any, value: any): any {
        return this;
      },
      config: {
        globalProperties: {}
      }
    }
  };
}

function publicRuntimeConfig(runtimeConfig: RuntimeConfig): RuntimeConfig {
  return {
    public: runtimeConfig.public ?? {}
  };
}

let runtimeI18nSharedModulePromise: Promise<typeof import("../i18n/shared.js")> | null = null;

async function loadRuntimeI18nSharedModule(): Promise<typeof import("../i18n/shared.js")> {
  if (!runtimeI18nSharedModulePromise) {
    runtimeI18nSharedModulePromise = import("../i18n/shared.js");
  }
  return runtimeI18nSharedModulePromise;
}

function firstStringRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") {
      output[key] = entry;
    }
  }
  return Object.keys(output).length > 0 ? output : null;
}

function readRuntimeI18nConfigCandidate(runtimeConfig: RuntimeConfig): unknown {
  if (!runtimeConfig || !runtimeConfig.public || typeof runtimeConfig.public !== "object") {
    return undefined;
  }
  return (runtimeConfig.public as Record<string, unknown>).i18n;
}

async function headFromPageMeta(meta: PageMeta, route: RouteContext, runtimeConfig: RuntimeConfig): Promise<HeadEntry> {
  const head: HeadEntry = {
    meta: meta.meta
  };

  if (typeof meta.title === "string") {
    head.title = meta.title;
    return head;
  }

  const localizedTitleMap = firstStringRecord(meta.title);
  if (!localizedTitleMap) {
    return head;
  }

  const i18nCandidate = readRuntimeI18nConfigCandidate(runtimeConfig);
  if (!i18nCandidate) {
    return head;
  }

  const i18nShared = await loadRuntimeI18nSharedModule();
  const normalizedI18n = i18nShared.normalizeI18nRuntimeConfig(i18nCandidate);
  if (!normalizedI18n) {
    return head;
  }

  const resolvedRoute = i18nShared.resolveI18nRoute(route.path, normalizedI18n);
  const localizedTitle = i18nShared.resolveLocalizedValue(
    localizedTitleMap,
    resolvedRoute.locale.code,
    normalizedI18n.fallbackLocale
  );
  if (localizedTitle) {
    head.title = localizedTitle;
  }
  return head;
}

async function createRuntimeI18nHead(route: RouteContext, runtimeConfig: RuntimeConfig): Promise<HeadEntry | null> {
  const i18nCandidate = readRuntimeI18nConfigCandidate(runtimeConfig);
  if (!i18nCandidate || typeof i18nCandidate !== "object" || Array.isArray(i18nCandidate)) {
    return null;
  }

  const i18nShared = await loadRuntimeI18nSharedModule();
  const normalizedI18n = i18nShared.normalizeI18nRuntimeConfig(i18nCandidate);
  if (!normalizedI18n) {
    return null;
  }

  const rawI18n = i18nCandidate as Record<string, unknown>;
  const seoConfig = rawI18n.seo;
  const includeHreflang = !seoConfig || typeof seoConfig !== "object" || Array.isArray(seoConfig)
    ? true
    : (seoConfig as Record<string, unknown>).hreflang !== false;
  const i18nHead = i18nShared.createI18nHead(route.path, route.origin, normalizedI18n, { includeHreflang });
  return {
    htmlAttrs: i18nHead.htmlAttrs,
    link: i18nHead.link
  };
}

interface SeoMetaTag {
  attribute: "name" | "property";
  value: string;
}

const seoMetaTags: Record<string, SeoMetaTag> = {
  description: { attribute: "name", value: "description" },
  keywords: { attribute: "name", value: "keywords" },
  robots: { attribute: "name", value: "robots" },
  author: { attribute: "name", value: "author" },
  themeColor: { attribute: "name", value: "theme-color" },
  colorScheme: { attribute: "name", value: "color-scheme" },
  applicationName: { attribute: "name", value: "application-name" },
  referrer: { attribute: "name", value: "referrer" },
  generator: { attribute: "name", value: "generator" },
  ogTitle: { attribute: "property", value: "og:title" },
  ogDescription: { attribute: "property", value: "og:description" },
  ogImage: { attribute: "property", value: "og:image" },
  ogImageSecureUrl: { attribute: "property", value: "og:image:secure_url" },
  ogImageAlt: { attribute: "property", value: "og:image:alt" },
  ogImageWidth: { attribute: "property", value: "og:image:width" },
  ogImageHeight: { attribute: "property", value: "og:image:height" },
  ogUrl: { attribute: "property", value: "og:url" },
  ogType: { attribute: "property", value: "og:type" },
  ogSiteName: { attribute: "property", value: "og:site_name" },
  ogLocale: { attribute: "property", value: "og:locale" },
  fbAppId: { attribute: "property", value: "fb:app_id" },
  articlePublishedTime: { attribute: "property", value: "article:published_time" },
  articleModifiedTime: { attribute: "property", value: "article:modified_time" },
  articleExpirationTime: { attribute: "property", value: "article:expiration_time" },
  articleAuthor: { attribute: "property", value: "article:author" },
  articleSection: { attribute: "property", value: "article:section" },
  articleTag: { attribute: "property", value: "article:tag" },
  twitterCard: { attribute: "name", value: "twitter:card" },
  twitterTitle: { attribute: "name", value: "twitter:title" },
  twitterDescription: { attribute: "name", value: "twitter:description" },
  twitterImage: { attribute: "name", value: "twitter:image" },
  twitterImageAlt: { attribute: "name", value: "twitter:image:alt" },
  twitterSite: { attribute: "name", value: "twitter:site" },
  twitterCreator: { attribute: "name", value: "twitter:creator" },
  twitterUrl: { attribute: "name", value: "twitter:url" },
  twitterDomain: { attribute: "name", value: "twitter:domain" },
  twitterLabel1: { attribute: "name", value: "twitter:label1" },
  twitterData1: { attribute: "name", value: "twitter:data1" },
  twitterLabel2: { attribute: "name", value: "twitter:label2" },
  twitterData2: { attribute: "name", value: "twitter:data2" }
};

function seoMetaToHead(input: SeoMetaInput): HeadEntry {
  const head: HeadEntry = {};
  const meta: Array<Record<string, string>> = [];

  for (const [key, value] of Object.entries(input)) {
    if (key === "title") {
      const title = firstSeoMetaValue(value);
      if (title !== null) {
        head.title = title;
      }
      continue;
    }

    const tag = seoMetaTagForKey(key);
    for (const content of normalizeSeoMetaValues(value)) {
      meta.push({ [tag.attribute]: tag.value, content });
    }
  }

  if (meta.length > 0) {
    head.meta = meta;
  }

  return head;
}

function seoMetaTagForKey(key: string): SeoMetaTag {
  const exact = seoMetaTags[key];
  if (exact) {
    return exact;
  }

  if (hasMetaPrefix(key, "og")) {
    return { attribute: "property", value: `og:${camelCaseToMetaName(key.slice(2), "_")}` };
  }

  if (hasMetaPrefix(key, "twitter")) {
    return { attribute: "name", value: `twitter:${camelCaseToMetaName(key.slice(7), "_")}` };
  }

  for (const prefix of ["fb", "article", "book", "profile", "music", "video", "al"]) {
    if (hasMetaPrefix(key, prefix)) {
      return { attribute: "property", value: `${prefix}:${camelCaseToMetaName(key.slice(prefix.length), "_")}` };
    }
  }

  return { attribute: "name", value: camelCaseToMetaName(key, "-") };
}

function hasMetaPrefix(key: string, prefix: string): boolean {
  return key.startsWith(prefix) && key.length > prefix.length && /[A-Z]/.test(key[prefix.length]);
}

function normalizeSeoMetaValues(value: SeoMetaInput[string]): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((entry) => normalizeSeoMetaValue(entry))
    .filter((entry): entry is string => entry !== null);
}

function firstSeoMetaValue(value: SeoMetaInput[string]): string | null {
  return normalizeSeoMetaValues(value)[0] ?? null;
}

function normalizeSeoMetaValue(value: SeoMetaValue): string | null {
  if (value === null || value === undefined || value === false) {
    return null;
  }
  return String(value);
}

function camelCaseToMetaName(value: string, separator: "-" | "_"): string {
  return value
    .replace(/^[A-Z]/, (match) => match.toLowerCase())
    .replace(/[A-Z]/g, (match) => `${separator}${match.toLowerCase()}`);
}

function mergeHead(entries: HeadEntry[]): HeadEntry {
  const merged: HeadEntry = {
    meta: [],
    link: [],
    style: [],
    htmlAttrs: {}
  };

  for (const entry of entries) {
    if (entry.title) {
      merged.title = entry.title;
    }
    if (entry.meta) {
      merged.meta!.push(...entry.meta);
    }
    if (entry.link) {
      merged.link!.push(...entry.link);
    }
    if (entry.style) {
      merged.style!.push(...entry.style);
    }
    if (entry.htmlAttrs) {
      merged.htmlAttrs = {
        ...(merged.htmlAttrs ?? {}),
        ...entry.htmlAttrs
      };
    }
  }

  merged.link = sortHeadLinksForPriority(merged.link ?? []);

  return merged;
}

function renderHead(head: HeadEntry): string {
  const tags: string[] = [];
  tags.push(`<title>${escapeHtml(head.title ?? "Resux App")}</title>`);

  const links = sortHeadLinksForPriority(normalizeHeadLinks(head.link ?? []));
  const highPriorityImagePreloads = links.filter((link) =>
    isPriorityImagePreloadLink(link)
  );
  const remainingLinks = links.filter((link) =>
    !isPriorityImagePreloadLink(link)
  );

  for (const link of highPriorityImagePreloads) {
    tags.push(`<link data-rx-head="true" ${renderAttributes(link)}>`);
  }

  for (const meta of head.meta ?? []) {
    tags.push(`<meta data-rx-head="true" ${renderAttributes(meta)}>`);
  }

  for (const link of remainingLinks) {
    tags.push(`<link data-rx-head="true" ${renderAttributes(link)}>`);
  }

  for (const style of head.style ?? []) {
    if (!style) {
      continue;
    }
    const styleId = typeof style === "object" && (style as any).id ? String((style as any).id) : "";
    const styleIdAttr = styleId ? ` data-rx-style="${escapeAttribute(styleId)}"` : "";
    const cssContent = escapeStyleContent(style);
    tags.push(`<style data-rx-head="true"${styleIdAttr}>${cssContent}</style>`);
  }

  return tags.join("");
}

function sortHeadLinksForPriority(links: Record<string, string>[]): Record<string, string>[] {
  return links
    .map((link, index) => ({
      link,
      index,
      priority: isPriorityImagePreloadLink(link)
        ? 0
        : normalizeHeadLinkRel(link) === "preload"
          ? 1
          : 2,
    }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map((entry) => entry.link);
}

const VALID_PRELOAD_AS_VALUES = new Set([
  "audio",
  "document",
  "embed",
  "fetch",
  "font",
  "image",
  "object",
  "script",
  "style",
  "track",
  "video",
  "worker",
]);

function normalizeHeadLinks(links: Record<string, string>[]): Record<string, string>[] {
  const normalized: Record<string, string>[] = [];
  for (const link of links) {
    const next = normalizeHeadLinkForRender(link);
    if (next) {
      normalized.push(next);
    }
  }
  return normalized;
}

function normalizeHeadLinkForRender(link: Record<string, string>): Record<string, string> | null {
  if (!link || typeof link !== "object" || Array.isArray(link)) {
    return null;
  }
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(link)) {
    if (value === undefined || value === null) {
      continue;
    }
    output[key] = String(value);
  }
  const rel = normalizeHeadLinkRel(output);
  if (rel === "modulepreload") {
    delete output.as;
    return output;
  }
  if (rel !== "preload") {
    return output;
  }
  const normalizedAs = normalizePreloadAsValue(output.as, output);
  if (!normalizedAs) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      const href = String(output.href ?? "").trim();
      console.warn(
        `[resux] Skipping invalid preload link for "${href || "<unknown>"}". Unsupported as="${String(output.as ?? "")}".`,
      );
    }
    return null;
  }
  output.as = normalizedAs;
  return output;
}

function normalizePreloadAsValue(
  value: string | undefined,
  link: Record<string, string>,
): string | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (VALID_PRELOAD_AS_VALUES.has(normalized)) {
    return normalized;
  }
  const inferredFromAsValue = inferPreloadAsFromHint(normalized);
  if (inferredFromAsValue && VALID_PRELOAD_AS_VALUES.has(inferredFromAsValue)) {
    return inferredFromAsValue;
  }
  const assetType = detectPreloadAssetType(link);
  if (assetType && VALID_PRELOAD_AS_VALUES.has(assetType)) {
    return assetType;
  }
  return undefined;
}

function detectPreloadAssetType(link: Record<string, string>): string | undefined {
  const explicitType = String(link.type ?? "").trim().toLowerCase();
  const inferredFromType = inferPreloadAsFromHint(explicitType);
  if (inferredFromType) {
    return inferredFromType;
  }

  const href = String(link.href ?? "").trim().toLowerCase().split(/[?#]/)[0];
  const inferredFromHref = inferPreloadAsFromHint(href);
  if (inferredFromHref) {
    return inferredFromHref;
  }
  return undefined;
}

function inferPreloadAsFromHint(hint: string): string | undefined {
  const normalized = String(hint ?? "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized === "audio"
    || normalized === "document"
    || normalized === "embed"
    || normalized === "fetch"
    || normalized === "font"
    || normalized === "image"
    || normalized === "object"
    || normalized === "script"
    || normalized === "style"
    || normalized === "track"
    || normalized === "video"
    || normalized === "worker"
  ) {
    return normalized;
  }
  if (normalized === "module" || normalized === "runtime") {
    return "script";
  }
  if (
    normalized.startsWith("image/")
    || /(^|[/.])(avif|gif|ico|jpe?g|png|svg|webp)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "image";
  }
  if (
    normalized.startsWith("video/")
    || /(^|[/.])(m4v|mov|mp4|webm|ogg)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "video";
  }
  if (
    normalized.startsWith("audio/")
    || /(^|[/.])(mp3|wav|aac|flac|m4a|oga)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "audio";
  }
  if (
    normalized.startsWith("font/")
    || /(^|[/.])(woff2?|ttf|otf)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "font";
  }
  if (normalized === "text/css" || /(^|[/.])css(?:$|[^a-z0-9])/.test(normalized)) {
    return "style";
  }
  if (
    normalized.includes("javascript")
    || normalized.includes("ecmascript")
    || /(^|[/.])m?js(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "script";
  }
  return undefined;
}

function normalizeHeadLinkRel(link: Record<string, string>): string {
  return String(link.rel ?? "").trim().toLowerCase();
}

function isPriorityImagePreloadLink(link: Record<string, string>): boolean {
  if (normalizeHeadLinkRel(link) !== "preload") {
    return false;
  }
  return String(link.as ?? "").trim().toLowerCase() === "image";
}

function isPriorityImagePreloadEntry(entry: HeadEntry): boolean {
  return (
    !entry.title
    && !entry.meta
    && !entry.style
    && Array.isArray(entry.link)
    && entry.link.length > 0
    && entry.link.every((link) => isPriorityImagePreloadLink(link))
  );
}

function insertHeadEntryWithPriority(entries: HeadEntry[], entry: HeadEntry): void {
  if (!isPriorityImagePreloadEntry(entry)) {
    entries.push(entry);
    return;
  }

  const insertionIndex = entries.findIndex(
    (candidate) => !isPriorityImagePreloadEntry(candidate),
  );
  if (insertionIndex === -1) {
    entries.push(entry);
    return;
  }

  entries.splice(insertionIndex, 0, entry);
}

function escapeStyleContent(css: unknown): string {
  if (css === null || css === undefined) {
    return "";
  }
  let str = "";
  if (typeof css === "string") {
    str = css;
  } else if (typeof css === "object") {
    if ("css" in (css as any)) {
      str = (css as any).css ?? "";
    } else if ("content" in (css as any)) {
      str = (css as any).content ?? "";
    } else if ("children" in (css as any)) {
      str = (css as any).children ?? "";
    } else if ("innerHTML" in (css as any)) {
      str = (css as any).innerHTML ?? "";
    } else {
      str = String(css);
    }
  } else {
    str = String(css);
  }
  return str.replace(/<\/style/gi, "<\\/style");
}

function renderAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(" ");
}

function resolveLayoutName(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string | false | undefined {
  const dynamic = node.attrs.find((attr) => attr.kind === "dynamic" && attr.name === "name");
  if (dynamic) {
    const value = evaluateExpression(dynamic.value, context.scope, locals);
    return value === false ? false : stringifyValue(value);
  }

  const staticName = node.attrs.find((attr) => attr.kind === "static" && attr.name === "name");
  if (staticName) {
    return staticName.value;
  }

  return context.pageMeta.layout;
}

function normalizeLayoutName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "default";
}

export function evaluateExpression(
  expression: string,
  scope: Record<string, unknown>,
  locals: Record<string, unknown> = {}
): unknown {
  if (scope && scope.__rx_expressions && (scope.__rx_expressions as Record<string, Function>)[expression]) {
    return (scope.__rx_expressions as Record<string, Function>)[expression](scope, locals);
  }
  const fn = new Function(
    "scope",
    "locals",
    `with (scope) { with (locals) { return (${expression}); } }`
  );
  return fn(scope, locals);
}

type ClientPatch =
  | { type: "text"; id: string; value: string }
  | { type: "attr"; id: string; attr: string; value: string }
  | { type: "html"; id: string; value: string }
  | { type: "block"; id: string; value: string };

export function renderClientPatches(
  template: TemplateNode[],
  scope: Record<string, unknown>,
  scopeId: string,
  styleScopeId?: string
): ClientPatch[] {
  const patches: ClientPatch[] = [];
  collectPatches(template, scope, scopeId, {}, patches, styleScopeId);
  return patches;
}

function collectPatches(
  nodes: TemplateNode[],
  scope: Record<string, unknown>,
  scopeId: string,
  locals: Record<string, unknown>,
  patches: ClientPatch[],
  styleScopeId?: string
): void {
  for (const node of nodes) {
    if (node.type === "interpolation") {
      patches.push({
        type: "text",
        id: node.bindingId,
        value: stringifyValue(evaluateExpression(node.expression, scope, locals))
      });
      continue;
    }

    if (node.type !== "element") {
      continue;
    }

    if (node.for) {
      patches.push({
        type: "block",
        id: node.for.blockId,
        value: renderTemplateNode(node, {
          scope,
          scopeId,
          moduleId: "",
          styleScopeId,
          route: { path: "", params: {}, query: {} },
          runtimeConfig: { public: {} },
          components: {},
          layouts: {},
          pageMeta: {}
        }, locals).replace(/^<span[^>]*>|<\/span>$/g, "")
      });
      continue;
    }

    if (node.if) {
      patches.push({
        type: "block",
        id: node.if.blockId,
        value: renderTemplateNode(node, {
          scope,
          scopeId,
          moduleId: "",
          styleScopeId,
          route: { path: "", params: {}, query: {} },
          runtimeConfig: { public: {} },
          components: {},
          layouts: {},
          pageMeta: {}
        }, locals).replace(/^<span[^>]*>|<\/span>$/g, "")
      });
      continue;
    }

    if (node.html) {
      patches.push({
        type: "html",
        id: node.html.bindingId,
        value: sanitizeHtml(evaluateExpression(node.html.expression, scope, locals))
      });
    }

    if (node.tag !== "ResuxImg" && node.tag !== "ResuxPicture" && node.tag !== "ResuxVideo") {
      for (const attr of node.attrs) {
        if (attr.kind === "dynamic" && attr.bindingId) {
          patches.push({
            type: "attr",
            id: attr.bindingId,
            attr: nativeAttributeName(node, attr.name),
            value: stringifyAttributeValue(nativeAttributeName(node, attr.name), evaluateExpression(attr.value, scope, locals))
          });
        }
      }
    }

    collectPatches(node.children, scope, scopeId, locals, patches, styleScopeId);
  }
}

function nativeElementTag(node: ElementTemplateNode): string {
  if (node.tag === "ResuxLink") {
    return "a";
  }
  if (node.tag === "ResuxImg") {
    return "img";
  }
  if (node.tag === "ResuxPicture") {
    return "picture";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    const asAttr = node.attrs.find(a => a.name === "as");
    return (asAttr && asAttr.kind === "static" ? asAttr.value : "section");
  }
  return node.tag;
}

function nativeAttributeName(node: ElementTemplateNode, name: string): string {
  if (node.tag === "ResuxLink" && name === "to") {
    return "href";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    if (name === "options") return "data-resux-options";
    if (name === "name") return "data-resux-enhancement";
    if (name === "trigger") return "data-resux-trigger";
    if (name === "mode") return "data-resux-mode";
    if (name === "noCls") return "data-resux-no-cls";
    if (name === "demo") return "data-resux-demo";
  }
  return name;
}

function collectComponentProps(
  node: ElementTemplateNode,
  scope: Record<string, unknown>,
  locals: Record<string, unknown>
): ComponentProps {
  const props: ComponentProps = {};
  for (const attr of node.attrs) {
    const name = normalizePropName(attr.name);
    props[name] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  return props;
}

function normalizePropName(name: string): string {
  return name.replace(/-([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());
}

function normalizeClientRuntimePackageRegistry(
  input?: ResuxClientPackageImportRegistry,
): { importers: string[]; css: Record<string, string[]>; declared: string[] } {
  const importers = [...new Set(
    (Array.isArray(input?.importers) ? input?.importers : [])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => entry.length > 0),
  )].sort((left, right) => left.localeCompare(right));
  const declared = [...new Set(
    (Array.isArray(input?.declared) ? input?.declared : [])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => entry.length > 0),
  )].sort((left, right) => left.localeCompare(right));
  const cssSource = input?.css && typeof input.css === "object" && !Array.isArray(input.css)
    ? input.css
    : {};
  const css: Record<string, string[]> = {};
  for (const [packageName, entries] of Object.entries(cssSource)) {
    const key = String(packageName || "").trim();
    if (!key) {
      continue;
    }
    const normalizedEntries = [...new Set(
      (Array.isArray(entries) ? entries : [])
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.length > 0),
    )].sort((left, right) => left.localeCompare(right));
    if (normalizedEntries.length > 0) {
      css[key] = normalizedEntries;
    }
  }
  return { importers, css, declared };
}

function registerResuxGlobals() {
  if (typeof globalThis !== "undefined") {
    const defineProp = (name: string, getter: () => any) => {
      if (!(name in globalThis)) {
        let hasCustomVal = false;
        let customVal: any;
        Object.defineProperty(globalThis, name, {
          get() {
            return hasCustomVal ? customVal : getter();
          },
          set(v) {
            hasCustomVal = true;
            customVal = v;
          },
          configurable: true
        });
      }
    };

    defineProp("$device", () => {
      try { return useDevice(); } catch { return { isMobile: false, isTablet: false, isDesktop: true, isIos: false, isAndroid: false }; }
    });
    defineProp("device", () => (globalThis as any).$device);

    defineProp("$config", () => {
      try { return useRuntimeConfig(); } catch { return { public: {} }; }
    });
    defineProp("config", () => (globalThis as any).$config);

    defineProp("$route", () => {
      try { return useRoute(); } catch { return { path: "/", params: {}, query: {} }; }
    });
    defineProp("route", () => (globalThis as any).$route);

    defineProp("$router", () => {
      try { return useRouter(); } catch { return null; }
    });
    defineProp("router", () => (globalThis as any).$router);

    defineProp("$fetch", () => {
      return (url: string, init?: RequestInit) => {
        try {
          const app = useResuxApp();
          const apiURL = resolveServerApiURL(url, app.route, app.$config);
          return fetch(apiURL, init).then(r => r.json());
        } catch {
          return fetch(url, init).then(r => r.json());
        }
      };
    });

    defineProp("$t", () => {
      return (key: string, params?: any) => {
        try { return (globalThis as any).__RESUX_USE_I18N__ ? (globalThis as any).__RESUX_USE_I18N__().t(key, params) : key; } catch { return key; }
      };
    });
    defineProp("t", () => (globalThis as any).$t);

    defineProp("$localePath", () => {
      return (to: string, localeCode?: string) => {
        try { return (globalThis as any).__RESUX_USE_LOCALE_PATH__ ? (globalThis as any).__RESUX_USE_LOCALE_PATH__()(to, localeCode) : to; } catch { return to; }
      };
    });
    defineProp("localePath", () => (globalThis as any).$localePath);

    defineProp("$switchLocalePath", () => {
      return (localeCode: string, to?: string) => {
        try { return (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__ ? (globalThis as any).__RESUX_USE_SWITCH_LOCALE_PATH__()(localeCode, to) : to; } catch { return to; }
      };
    });
    defineProp("switchLocalePath", () => (globalThis as any).$switchLocalePath);
  }
}
registerResuxGlobals();

function createClientRuntimePackageRegistrySource(options: ClientRuntimeSourceOptions): string {
  const normalized = normalizeClientRuntimePackageRegistry(options.packageRegistry);
  const importerBody = normalized.importers
    .map((specifier) => `  ${JSON.stringify(specifier)}: () => import(${JSON.stringify(specifier)})`)
    .join(",\n");
  return [
    `const resuxPackageImporters = {\n${importerBody}\n};`,
    `const resuxPackageCssImports = ${JSON.stringify(normalized.css)};`,
    `const resuxDeclaredPackages = new Set(${JSON.stringify(normalized.declared)});`,
  ].join("\n");
}

export function getClientRuntimeSource(options: ClientRuntimeSourceOptions = {}): string {
  const packageRegistrySource = createClientRuntimePackageRegistrySource(options);
  return String.raw`
const scopeCache = new Map();

function parseUserAgent(ua) {
  const userAgent = ua || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|PlayBook|Silk/i.test(userAgent) || (isMobile && /Tablet/i.test(userAgent));
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  return {
    isMobile,
    isTablet,
    isDesktop,
    isIos,
    isAndroid
  };
}

function useDevice() {
  const app = globalThis.__RESUX_APP__;
  const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return parseUserAgent(ua);
}

if (typeof globalThis !== "undefined") {
  const defineProp = (name, getter) => {
    if (!(name in globalThis)) {
      let hasCustomVal = false;
      let customVal;
      Object.defineProperty(globalThis, name, {
        get() {
          return hasCustomVal ? customVal : getter();
        },
        set(v) {
          hasCustomVal = true;
          customVal = v;
        },
        configurable: true
      });
    }
  };

  defineProp("$device", () => {
    try {
      const app = globalThis.__RESUX_APP__;
      const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
      return parseUserAgent(ua);
    } catch (e) {
      return { isMobile: false, isTablet: false, isDesktop: true, isIos: false, isAndroid: false };
    }
  });
  defineProp("device", () => globalThis.$device);

  defineProp("$config", () => {
    try {
      const app = globalThis.__RESUX_APP__;
      return app ? app.$config : { public: {} };
    } catch (e) {
      return { public: {} };
    }
  });
  defineProp("config", () => globalThis.$config);

  defineProp("$route", () => {
    try {
      const app = globalThis.__RESUX_APP__;
      return app ? app.route : { path: "/", params: {}, query: {} };
    } catch (e) {
      return { path: "/", params: {}, query: {} };
    }
  });
  defineProp("route", () => globalThis.$route);

  defineProp("$router", () => {
    try {
      return globalThis.__RESUX_ROUTER__;
    } catch (e) {
      return null;
    }
  });
  defineProp("router", () => globalThis.$router);

  defineProp("$fetch", () => {
    return (url, init) => fetch(url, init).then(r => r.json());
  });

  defineProp("$t", () => {
    return (key, params) => {
      try {
        return useClientI18n().t(key, params);
      } catch (e) {
        return key;
      }
    };
  });
  defineProp("t", () => globalThis.$t);

  defineProp("$localePath", () => {
    return (to, localeCode) => {
      try {
        return globalThis.__RESUX_USE_LOCALE_PATH__ ? globalThis.__RESUX_USE_LOCALE_PATH__()(to, localeCode) : to;
      } catch (e) {
        return to;
      }
    };
  });
  defineProp("localePath", () => globalThis.$localePath);

  defineProp("$switchLocalePath", () => {
    return (localeCode, to) => {
      try {
        return globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ ? globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__()(localeCode, to) : to;
      } catch (e) {
        return to;
      }
    };
  });
  defineProp("switchLocalePath", () => globalThis.$switchLocalePath);
}

const routePayloadCache = new Map();
const routePayloadRequests = new Map();
const routePayloadFailures = new Map();
const ROUTE_PREFETCH_FAILURE_COOLDOWN_MS = 5000;
const ROUTE_PAYLOAD_TIMEOUT_MS = 30000;
let routePayloadGeneration = 0;
let clientRouteRevision;
function getClientRouteRevision() {
  clientRouteRevision ||= ref(0);
  return clientRouteRevision;
}
const mountedVueIslands = new Map();
const pendingAsyncDataControllers = globalThis.__RESUX_PENDING_ASYNC_DATA_CONTROLLERS__ ||= new Set();
let devImportRevision = 0;
let routeTransitionToken = 0;
let routeTransitionHideTimer = 0;
let routeTransitionShowTimer = 0;
let routeTransitionProgressTimer = 0;
let routeTransitionStartedAt = 0;
let routeTransitionVisible = false;
let routeTransitionIndicator = null;
const lazyImageObservers = new Map();
const lazyVideoObservers = new Map();
const clientPluginIds = new Set();
const clientMiddlewareById = new Map();
const clientProvides = globalThis.__RESUX_PROVIDES__ ||= {};
const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();
const globalStateSnapshots = globalThis.__RESUX_GLOBAL_STATE_SNAPSHOTS__ ||= new Map();
const dirtyGlobalStateKeys = new Set();
let globalStateRefreshQueued = false;
const RESUX_LAZY_PLACEHOLDER_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const RESUX_DEFAULT_PLACEHOLDER_SRC = "/__resux/resux-placeholder.svg";
const observedLazyImages = new Set();
const observedLazyVideos = new Set();
const lazyImageObserverByElement = new WeakMap();
const lazyVideoObserverByElement = new WeakMap();
const failedMediaSources = new Set();
const initializedVideoControlShells = new WeakSet();
const managedVideoControlSyncByShell = new WeakMap();
const managedVideoControlCleanupByShell = new WeakMap();
const managedVideoControlShells = new Set();
let managedVideoFullscreenListenersReady = false;
const registeredDelegatedEvents = new Set();
let managedPageLoadReady = typeof document !== "undefined"
  ? document.readyState === "complete"
  : true;
const resuxLazyPackageCache = new Map();
const resuxLoadedPackages = new Set();
const resuxInjectedPackageCss = new Set();
const resuxClientEnhancements = new Map();
const resuxActiveEnhancementDisposers = new Set();
const resuxScheduledEnhancementDisposers = new Set();
const resuxBoundEnhancementTargets = new WeakSet();
const resuxVisibleEnhancementCallbacks = new Map();
let resuxVisibleEnhancementObserver = null;
let resuxVisibleEnhancementPollTimer = 0;
const RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS = 5000;
let resuxClientEnhancementManifestPromise = null;
${packageRegistrySource}
const ROUTER_IGNORED_EVENT_TARGET_SELECTOR = "video,source,img,picture,audio,[data-rx-video-controls],[data-rx-video-zone],[data-resux-video-zone],button,select,option,input,label";
const MEDIA_NAVIGATION_BLOCK_TARGET_SELECTOR = "[data-resux-media], [data-rx-video-shell], [data-rx-video-controls], video, source, img, picture, audio";
const MEDIA_URL_SCHEME_RE = /^(javascript:|data:|blob:|mailto:|tel:)/i;
const MEDIA_STATIC_EXTENSION_RE = /\.(avif|gif|ico|jpe?g|m4v|mov|mp3|mp4|ogg|pdf|png|svg|wav|webm|webp)$/i;
let activeResuxError = null;

const __rxFlags = {
  isReactive: "__v_isReactive",
  isReadonly: "__v_isReadonly",
  raw: "__v_raw",
  isRef: "__v_isRef"
};
const __rxTargetMap = new WeakMap();
const __rxReactiveMap = new WeakMap();
const __rxReadonlyMap = new WeakMap();
let __rxActiveEffect;
let __rxShouldTrack = true;
const __rxTrackStack = [];
const __rxQueue = new Set();
let __rxFlushing = false;
const __rxResolvedPromise = Promise.resolve();
let __rxFlushPromise = null;

function createError(input) {
  if (typeof input === "string") {
    const error = new Error(input);
    error.name = "ResuxError";
    return error;
  }
  const message = input && typeof input.message === "string" ? input.message : "Resux error";
  const error = new Error(message);
  error.name = input && typeof input.name === "string" ? input.name : "ResuxError";
  if (input && typeof input.statusCode === "number") {
    error.statusCode = input.statusCode;
  }
  if (input && typeof input.fatal === "boolean") {
    error.fatal = input.fatal;
  }
  if (input && "data" in input) {
    error.data = input.data;
  }
  return error;
}

function showError(input) {
  const error = createError(input);
  useActiveResuxError().value = error;
  dispatchRuntimeErrorEvent("resux:app-error", error);
  throw error;
}

function clearError() {
  useActiveResuxError().value = null;
  dispatchRuntimeErrorEvent("resux:app-error-cleared", null);
}

function dispatchRuntimeErrorEvent(name, error) {
  if (typeof window === "undefined" || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent(name, { detail: { error } }));
}

function useActiveResuxError() {
  if (!activeResuxError) {
    activeResuxError = ref(null);
  }
  return activeResuxError;
}

function isClientRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function uniqueArray(items) {
  return [...new Set(items)];
}

function isEnhancementDebugEnabled() {
  if (!isClientRuntime()) {
    return false;
  }
  const queryFlag = /(?:\?|&)resux-enhancement-debug=1(?:&|$)/.test(window.location.search);
  const globalFlag = Boolean(window.__RESUX_ENHANCEMENT_DEBUG__);
  const envFlag = Boolean(import.meta && import.meta.env && import.meta.env.DEV);
  return envFlag || queryFlag || globalFlag;
}

function logEnhancementDebug(message) {
  if (!isEnhancementDebugEnabled()) {
    return;
  }
  console.info("[resux:enhancement] " + message);
}

function dispatchEnhancementEvent(eventName, detail) {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:enhancement:" + eventName, { detail }));
}

function dispatchPackageEvent(eventName, detail) {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:package:" + eventName, { detail }));
}

function dispatchPackageCssLoaded(detail) {
  if (!isClientRuntime() || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:package-css:loaded", { detail }));
}

function readEnhancementElementId(target) {
  if (!target) {
    return undefined;
  }
  const id = target.getAttribute("id");
  if (typeof id === "string" && id.trim()) {
    return id.trim();
  }
  const dataId = target.getAttribute("data-resux-enhancement-id");
  return typeof dataId === "string" && dataId.trim() ? dataId.trim() : undefined;
}

function setEnhancementStatus(target, status) {
  target.setAttribute("data-resux-enhancement-status", status);
  target.setAttribute("data-rx-enhancement-status", status);
}

function setEnhancementBound(target, bound) {
  if (bound) {
    target.dataset.rxEnhancementBound = "true";
  } else {
    delete target.dataset.rxEnhancementBound;
  }
}

function getEnhancementErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isEnhancementOptionsObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertEnhancementOptionsSerializable(value, path, seen) {
  if (value === null) {
    return;
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return;
  }
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("[resux] Enhancement options contain a non-finite number at \"" + path + "\".");
    }
    return;
  }
  if (valueType === "undefined" || valueType === "function" || valueType === "symbol" || valueType === "bigint") {
    throw new Error("[resux] Options for client enhancement must be JSON-serializable. Unsupported value at \"" + path + "\" (" + valueType + ").");
  }
  if (valueType !== "object") {
    return;
  }
  const objectValue = value;
  if (typeof Node !== "undefined" && objectValue instanceof Node) {
    throw new Error("[resux] Options for client enhancement cannot include DOM nodes (\"" + path + "\").");
  }
  if (seen.has(objectValue)) {
    throw new Error("[resux] Options for client enhancement contain a circular reference at \"" + path + "\".");
  }
  seen.add(objectValue);
  if (Array.isArray(objectValue)) {
    for (let index = 0; index < objectValue.length; index += 1) {
      assertEnhancementOptionsSerializable(objectValue[index], path + "[" + index + "]", seen);
    }
    return;
  }
  const prototype = Object.getPrototypeOf(objectValue);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("[resux] Options for client enhancement must use plain objects and arrays. Invalid value at \"" + path + "\".");
  }
  for (const [key, nestedValue] of Object.entries(objectValue)) {
    assertEnhancementOptionsSerializable(nestedValue, path + "." + key, seen);
  }
}

function normalizeEnhancementOptionsInput(name, options) {
  if (options === undefined || options === null) {
    return {};
  }
  if (!isEnhancementOptionsObject(options)) {
    throw new Error("[resux] Options for \"" + name + "\" must be a JSON-serializable plain object.");
  }
  assertEnhancementOptionsSerializable(options, "$", new WeakSet());
  return options;
}

function createEnhancementSetupPayload(trigger, options) {
  const payloadOptions = { ...options };
  return {
    ...payloadOptions,
    trigger,
    options: payloadOptions,
    __resux: {
      trigger,
      options: payloadOptions,
    },
  };
}

function isElementProbablyVisible(target) {
  if (!isClientRuntime()) {
    return true;
  }
  const rect = target.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.top <= window.innerHeight;
}

function releaseVisibleEnhancementResourcesIfIdle() {
  if (resuxVisibleEnhancementCallbacks.size > 0) {
    return;
  }
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}

function unobserveVisibleEnhancement(target, callback) {
  const callbacks = resuxVisibleEnhancementCallbacks.get(target);
  if (!callbacks) {
    return;
  }
  if (callback) {
    callbacks.delete(callback);
  } else {
    callbacks.clear();
  }
  if (callbacks.size > 0) {
    return;
  }
  resuxVisibleEnhancementCallbacks.delete(target);
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.unobserve(target);
  }
  releaseVisibleEnhancementResourcesIfIdle();
}

function ensureVisibleEnhancementResources() {
  if (!resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
          continue;
        }
        const callbacks = resuxVisibleEnhancementCallbacks.get(entry.target);
        if (!callbacks) {
          continue;
        }
        for (const activate of callbacks) {
          activate();
        }
      }
    }, { rootMargin: "200px 0px" });
  }
  if (!resuxVisibleEnhancementPollTimer) {
    resuxVisibleEnhancementPollTimer = window.setInterval(() => {
      for (const [target, callbacks] of resuxVisibleEnhancementCallbacks) {
        if (!target.isConnected) {
          unobserveVisibleEnhancement(target);
          continue;
        }
        if (isElementProbablyVisible(target)) {
          for (const activate of callbacks) {
            activate();
          }
        }
      }
    }, 200);
  }
}

function observeVisibleEnhancement(target, activate) {
  let settled = false;
  const run = () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
    if (target.isConnected) {
      activate();
    }
  };
  let callbacks = resuxVisibleEnhancementCallbacks.get(target);
  const isNewTarget = callbacks === undefined;
  callbacks ??= new Set();
  if (isNewTarget) {
    resuxVisibleEnhancementCallbacks.set(target, callbacks);
    ensureVisibleEnhancementResources();
    resuxVisibleEnhancementObserver.observe(target);
  }
  callbacks.add(run);
  return () => {
    if (settled) {
      return;
    }
    settled = true;
    unobserveVisibleEnhancement(target, run);
  };
}

async function ensureClientEnhancementManifestLoaded() {
  if (!isClientRuntime()) {
    return;
  }
  if (!resuxClientEnhancementManifestPromise) {
    logEnhancementDebug("runtime loaded");
    resuxClientEnhancementManifestPromise = (async () => {
      try {
        const manifestUrl = window.__RESUX_CLIENT_ENHANCEMENTS_SRC__ || "/__resux/client-enhancements.mjs";
        await import(/* @vite-ignore */ manifestUrl);
        logEnhancementDebug("manifest loaded");
      } catch (error) {
        const message = getEnhancementErrorMessage(error);
        if (isEnhancementDebugEnabled()) {
          console.warn("[resux:enhancement] failed to load manifest: " + message);
        }
      }
    })();
  }
  await resuxClientEnhancementManifestPromise;
}

function packageCacheKey(name, options = {}) {
  const exportName = typeof options.exportName === "string" ? options.exportName : "";
  const preferDefault = options.preferDefault === false ? "named" : "default";
  const mode = normalizePackageMode(options.mode, options.clientOnly ? "clientOnly" : "ssr");
  const css = Array.isArray(options.css) ? options.css.join(",") : String(options.css || "");
  return [name, exportName, preferDefault, mode, css].join("::");
}

function normalizePackageCssInput(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function readRuntimePackagesConfig() {
  try {
    const runtimeConfig = useRuntimeConfig();
    const direct = (runtimeConfig.public && runtimeConfig.public.packages) || runtimeConfig.packages;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct;
    }
  } catch {
    // useRuntimeConfig is not always available in pure client helpers.
  }
  return {};
}

function normalizePackageMode(value, fallback = "ssr") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (normalized === "ssr" || normalized === "clientOnly" || normalized === "serverOnly" || normalized === "progressive") {
    return normalized;
  }
  return fallback;
}

function resolvePackageMode(name, options = {}, config = {}) {
  if (options && options.clientOnly === true) {
    return "clientOnly";
  }
  if (options && options.mode) {
    return normalizePackageMode(options.mode, "ssr");
  }
  const configuredModes = config && typeof config.mode === "object" ? config.mode : null;
  if (configuredModes && name in configuredModes) {
    return normalizePackageMode(configuredModes[name], "ssr");
  }
  const serverOnlyList = Array.isArray(config.serverOnly) ? config.serverOnly : [];
  if (serverOnlyList.includes(name)) {
    return "serverOnly";
  }
  const clientOnlyList = Array.isArray(config.clientOnly) ? config.clientOnly : [];
  if (clientOnlyList.includes(name)) {
    return "clientOnly";
  }
  return "ssr";
}

function isClientRuntimePackageMode(mode) {
  return mode === "clientOnly" || mode === "progressive";
}

function isClientPackageCssHref(value) {
  return /^([a-z]+:)?\/\//i.test(value)
    || value.startsWith("/")
    || value.startsWith("./")
    || value.startsWith("../")
    || value.startsWith("#");
}

function resolveRegisteredPackageImporter(name) {
  if (!name) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(resuxPackageImporters, name)) {
    return undefined;
  }
  const importer = resuxPackageImporters[name];
  return typeof importer === "function" ? importer : undefined;
}

async function injectClientPackageCss(cssEntries, packageName) {
  if (!isClientRuntime()) {
    return;
  }
  const configuredEntries = Array.isArray(resuxPackageCssImports[packageName])
    ? resuxPackageCssImports[packageName]
    : [];
  const allEntries = uniqueArray([
    ...configuredEntries,
    ...(Array.isArray(cssEntries) ? cssEntries : []),
  ]);
  const styleImports = [];
  for (const href of allEntries) {
    if (!href || resuxInjectedPackageCss.has(href)) {
      continue;
    }
    if (isClientPackageCssHref(href)) {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", href);
      link.setAttribute("data-resux-package-css", href);
      document.head.appendChild(link);
      resuxInjectedPackageCss.add(href);
      dispatchPackageCssLoaded({
        name: packageName,
        entry: href,
      });
      continue;
    }
    const importer = resolveRegisteredPackageImporter(href);
    if (!importer) {
      throw new Error(
        "Failed to load CSS entry \"" + href + "\" for package \"" + packageName + "\": "
        + "no static importer was generated. Add it to packages.css or a detected useClientPackage/useLazyPackage call.",
      );
    }
    styleImports.push(
      importer().then(() => {
        dispatchPackageCssLoaded({
          name: packageName,
          entry: href,
        });
      }).catch((error) => {
        throw new Error(
          "Failed to load CSS entry \"" + href + "\" for package \"" + packageName + "\": " + (error instanceof Error ? error.message : String(error)),
        );
      }),
    );
    resuxInjectedPackageCss.add(href);
  }
  if (styleImports.length > 0) {
    await Promise.all(styleImports);
  }
}

function packageImportError(name, mode, cause) {
  const reason = cause instanceof Error ? cause.message : String(cause);
  if (isClientRuntimePackageMode(mode) && !isClientRuntime()) {
    return new Error(
      "Package \"" + name + "\" appears to be browser-only and was imported during SSR. "
      + "Use useClientPackage(\"" + name + "\") or useLazyPackage(\"" + name + "\", { mode: \"clientOnly\" }) inside onMounted() or a client enhancement.",
    );
  }
  if (mode === "serverOnly" && isClientRuntime()) {
    return new Error(
      "Package \"" + name + "\" is marked serverOnly and cannot run in the browser. "
      + "Load it on the server or change its packages.mode entry.",
    );
  }
  if (/Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|failed to resolve/i.test(reason)) {
    return new Error(
      "Package \"" + name + "\" is not installed. Run \"npm install " + name + "\" or remove this integration.",
    );
  }
  return new Error("Failed to load package \"" + name + "\": " + reason);
}

async function useLazyPackage(name, options = {}) {
  const packageName = String(name || "").trim();
  if (!packageName) {
    throw new Error("useLazyPackage(name) needs a package name.");
  }

  const packageConfig = readRuntimePackagesConfig();
  const mode = resolvePackageMode(packageName, options, packageConfig);
  if (isClientRuntimePackageMode(mode) && !isClientRuntime()) {
    throw packageImportError(packageName, mode, new Error("client-only package requested on server"));
  }
  if (mode === "serverOnly" && isClientRuntime()) {
    throw packageImportError(packageName, mode, new Error("server-only package requested on client"));
  }

  const cssFromConfig = Array.isArray(packageConfig.css)
    ? packageConfig.css
    : packageConfig.css && typeof packageConfig.css === "object"
      ? packageConfig.css[packageName]
      : [];
  const css = uniqueArray([
    ...normalizePackageCssInput(cssFromConfig),
    ...normalizePackageCssInput(options.css),
  ]);
  await injectClientPackageCss(css, packageName);

  const key = packageCacheKey(packageName, { ...options, mode, css });
  const cached = resuxLazyPackageCache.get(key);
  if (cached) {
    return cached;
  }

  const loader = (async () => {
    dispatchPackageEvent("loading", {
      name: packageName,
      mode,
    });
    try {
      const importer = resolveRegisteredPackageImporter(packageName);
      if (!importer) {
        if (resuxDeclaredPackages.has(packageName)) {
          throw new Error(
            "Package \"" + packageName + "\" is configured for client loading but is unavailable in the generated client registry. "
            + "Run \"npm install " + packageName + "\" or remove it from packages config/usages.",
          );
        }
        throw new Error(
          "Package \"" + packageName + "\" is not registered for lazy loading. "
          + "Add it to packages.lazy/packages.clientOnly/packages.css or use it via a detected Resux package integration call.",
        );
      }
      const imported = await importer();
      resuxLoadedPackages.add(packageName);
      dispatchPackageEvent("loaded", {
        name: packageName,
        mode,
      });
      if (options.exportName) {
        const selected = imported[options.exportName];
        if (selected === undefined) {
          throw new Error("Export \"" + options.exportName + "\" was not found in package \"" + packageName + "\".");
        }
        return selected;
      }
      if (options.preferDefault === false) {
        return imported;
      }
      return imported.default ?? imported;
    } catch (error) {
      dispatchPackageEvent("error", {
        name: packageName,
        mode,
        error: getEnhancementErrorMessage(error),
      });
      throw packageImportError(packageName, mode, error);
    }
  })();

  resuxLazyPackageCache.set(key, loader);
  void loader.catch(() => {
    if (resuxLazyPackageCache.get(key) === loader) {
      resuxLazyPackageCache.delete(key);
    }
  });
  return loader;
}

async function useClientPackage(name, options = {}) {
  return useLazyPackage(name, { ...options, mode: "clientOnly", clientOnly: true });
}

function usePackageReady(name) {
  return resuxLoadedPackages.has(String(name || "").trim());
}

function defineLazyPackage(name, options = {}) {
  return () => useLazyPackage(name, options);
}

function defineClientOnlyPackage(name, options = {}) {
  return () => useClientPackage(name, options);
}

function readEnhancementPayloadOptions(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const record = payload;
  if (isEnhancementOptionsObject(record.options)) {
    return { ...record.options };
  }
  const { trigger: _trigger, options: _options, __resux: _meta, ...directOptions } = record;
  return directOptions;
}

function definePackageAdapter(definition) {
  const enhancementName = String(definition && definition.name || "").trim();
  if (!enhancementName) {
    throw new Error("[resux] definePackageAdapter requires a non-empty adapter name.");
  }
  if (!definition || typeof definition.enhance !== "function") {
    throw new Error("[resux] definePackageAdapter(\"" + enhancementName + "\") requires an enhance() function.");
  }

  const packageName = String(definition.packageName || enhancementName).trim();
  const mode = normalizePackageMode(definition.mode, "progressive");
  const imports = uniqueArray([
    packageName,
    ...(Array.isArray(definition.imports) ? definition.imports.map((entry) => String(entry || "").trim()) : []),
  ].filter((entry) => entry.length > 0));
  const css = normalizePackageCssInput(definition.css);
  const defaults = definition.defaults && isEnhancementOptionsObject(definition.defaults)
    ? { ...definition.defaults }
    : {};

  return defineClientEnhancement(enhancementName, async (target, payload) => {
    const userOptions = readEnhancementPayloadOptions(payload);
    const mergedOptions = { ...defaults, ...userOptions };
    try {
      assertEnhancementOptionsSerializable(mergedOptions, "$", new WeakSet());
    } catch (error) {
      throw new Error(
        "[resux] Adapter \"" + enhancementName + "\" received non-serializable options. "
        + getEnhancementErrorMessage(error),
      );
    }

    if (typeof definition.validateOptions === "function") {
      definition.validateOptions(mergedOptions);
    }

    const modules = imports.length
      ? await Promise.all(imports.map((specifier, index) => useLazyPackage(specifier, {
        mode,
        clientOnly: mode === "clientOnly",
        preferDefault: false,
        css: index === 0 ? css : [],
      })))
      : [];

    return definition.enhance(target, mergedOptions, {
      packageName,
      mode,
      modules,
    });
  });
}

function scheduleEnhancementTrigger(name, trigger, target, activate) {
  const fire = () => {
    void activate().catch(() => {
      // useClientEnhancement already reports error status/events.
    });
  };
  if (trigger === "manual") {
    return () => {};
  }
  if (trigger === "immediate") {
    queueMicrotask(() => {
      fire();
    });
    return () => {};
  }
  if (trigger === "interaction") {
    const handler = () => {
      fire();
      target.removeEventListener("click", handler, true);
      target.removeEventListener("pointerdown", handler, true);
      target.removeEventListener("touchstart", handler, true);
      target.removeEventListener("focusin", handler, true);
      target.removeEventListener("keydown", handler, true);
    };
    target.addEventListener("click", handler, true);
    target.addEventListener("pointerdown", handler, true);
    target.addEventListener("touchstart", handler, true);
    target.addEventListener("focusin", handler, true);
    target.addEventListener("keydown", handler, true);
    return () => {
      target.removeEventListener("click", handler, true);
      target.removeEventListener("pointerdown", handler, true);
      target.removeEventListener("touchstart", handler, true);
      target.removeEventListener("focusin", handler, true);
      target.removeEventListener("keydown", handler, true);
    };
  }
  if (trigger === "idle") {
    const idle = window;
    if (typeof idle.requestIdleCallback === "function") {
      const id = idle.requestIdleCallback(() => {
        fire();
      });
      return () => {
        if (typeof idle.cancelIdleCallback === "function") {
          idle.cancelIdleCallback(id);
        }
      };
    }
    const timeoutId = window.setTimeout(() => {
      fire();
    }, 32);
    return () => window.clearTimeout(timeoutId);
  }
  if (trigger === "page-load") {
    if (document.readyState === "complete") {
      fire();
      return () => {};
    }
    const onLoad = () => {
      window.removeEventListener("load", onLoad);
      fire();
    };
    window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("load", onLoad);
    };
  }
  if (trigger === "visible") {
    if (isElementProbablyVisible(target)) {
      fire();
      return () => {};
    }
    if (typeof IntersectionObserver !== "function") {
      fire();
      return () => {};
    }
    const cancel = observeVisibleEnhancement(target, fire);
    logEnhancementDebug("observing visible trigger " + name);
    return cancel;
  }
  fire();
  return () => {};
}

function defineClientEnhancement(name, setup) {
  const normalized = String(name || "").trim();
  if (!normalized) {
    throw new Error("[resux] defineClientEnhancement requires a string name.");
  }
  if (typeof setup !== "function") {
    throw new Error("[resux] defineClientEnhancement(\"" + normalized + "\") requires a setup function.");
  }
  resuxClientEnhancements.set(normalized, setup);
  logEnhancementDebug("registered " + normalized);
  return { name: normalized, setup };
}

function resolveEnhancementTarget(input) {
  if (!isClientRuntime()) {
    return null;
  }
  if (!input) {
    return document.body;
  }
  if (typeof input === "string") {
    return document.querySelector(input);
  }
  return input;
}

async function useClientEnhancement(name, options = {}) {
  if (!isClientRuntime()) {
    return {
      ready: false,
      activate: async () => {},
      dispose: async () => {},
    };
  }
  await ensureClientEnhancementManifestLoaded();

  const target = resolveEnhancementTarget(options.target);
  if (!target) {
    throw new Error("Client enhancement \"" + String(name || "").trim() + "\" did not find a target element.");
  }

  const normalized = String(name || "").trim();
  const setup = resuxClientEnhancements.get(normalized);
  if (!setup) {
    const message = "[resux] Client enhancement \"" + normalized + "\" was used but not registered.\n"
      + "Create one of:\n"
      + "- client-enhancements/" + normalized + ".client.ts\n"
      + "- enhancements/" + normalized + ".client.ts\n"
      + "or call defineClientEnhancement(\"" + normalized + "\", setup) from a loaded client plugin.";
    setEnhancementStatus(target, "error");
    target.setAttribute("data-rx-enhancement-error", message);
    dispatchEnhancementEvent("error", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      error: message,
    });
    throw new Error(message);
  }

  let normalizedEnhancementOptions = {};
  try {
    normalizedEnhancementOptions = normalizeEnhancementOptionsInput(normalized, options.options);
  } catch (error) {
    const message = getEnhancementErrorMessage(error);
    setEnhancementStatus(target, "error");
    target.setAttribute("data-rx-enhancement-error", message);
    dispatchEnhancementEvent("error", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      error: message,
    });
    throw error instanceof Error ? error : new Error(message);
  }

  let activated = false;
  let disposed = false;
  let teardown;
  const trigger = options.trigger || "manual";
  let idleWarningTimer = 0;
  const shouldWarnIfIdle = trigger === "immediate" || trigger === "idle";

  if (shouldWarnIfIdle) {
    idleWarningTimer = window.setTimeout(() => {
      if (activated || disposed) {
        return;
      }
      const warning = "[resux] Enhancement \"" + normalized + "\" stayed idle for 5s. Check data-resux-trigger, IntersectionObserver, and whether the element is visible.";
      if (isEnhancementDebugEnabled()) {
        console.warn(warning);
      }
      setEnhancementStatus(target, "error");
      target.setAttribute("data-rx-enhancement-error", warning);
      dispatchEnhancementEvent("error", {
        name: normalized,
        elementId: readEnhancementElementId(target),
        error: warning,
      });
    }, RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS);
  }

  const activate = async () => {
    if (disposed || activated) {
      return;
    }
    activated = true;
    if (idleWarningTimer) {
      window.clearTimeout(idleWarningTimer);
      idleWarningTimer = 0;
    }
    setEnhancementStatus(target, "triggered");
    dispatchEnhancementEvent("triggered", {
      name: normalized,
      elementId: readEnhancementElementId(target),
      trigger,
    });
    logEnhancementDebug("trigger fired " + normalized);
    setEnhancementStatus(target, "loading");
    dispatchEnhancementEvent("loading", {
      name: normalized,
      elementId: readEnhancementElementId(target),
    });
    try {
      const setupPayload = createEnhancementSetupPayload(trigger, normalizedEnhancementOptions);
      teardown = await setup(target, setupPayload);
      if (disposed) {
        if (typeof teardown === "function") {
          await teardown();
        }
        teardown = undefined;
        return;
      }
      setEnhancementStatus(target, "active");
      dispatchEnhancementEvent("ready", {
        name: normalized,
        elementId: readEnhancementElementId(target),
      });
      logEnhancementDebug("setup complete");
      if (typeof teardown === "function") {
        resuxActiveEnhancementDisposers.add(teardown);
        dispatchEnhancementEvent("cleanup-ready", {
          name: normalized,
          elementId: readEnhancementElementId(target),
        });
        logEnhancementDebug("cleanup registered");
      }
    } catch (error) {
      const message = getEnhancementErrorMessage(error);
      setEnhancementStatus(target, "error");
      target.setAttribute("data-rx-enhancement-error", message);
      dispatchEnhancementEvent("error", {
        name: normalized,
        elementId: readEnhancementElementId(target),
        error: message,
      });
      throw error;
    }
  };

  const cancelTrigger = scheduleEnhancementTrigger(normalized, trigger, target, activate);
  const dispose = async () => {
    if (disposed) {
      return;
    }
    disposed = true;
    resuxScheduledEnhancementDisposers.delete(dispose);
    resuxBoundEnhancementTargets.delete(target);
    setEnhancementBound(target, false);
    if (idleWarningTimer) {
      window.clearTimeout(idleWarningTimer);
      idleWarningTimer = 0;
    }
    cancelTrigger();
    if (typeof teardown === "function") {
      resuxActiveEnhancementDisposers.delete(teardown);
      await teardown();
    }
  };

  resuxScheduledEnhancementDisposers.add(dispose);

  return {
    ready: activated,
    activate,
    dispose,
  };
}

export {
  useLazyPackage,
  useClientPackage,
  usePackageReady,
  defineLazyPackage,
  defineClientOnlyPackage,
  definePackageAdapter,
  defineClientEnhancement,
  useClientEnhancement,
  hasClientEnhancement,
  getClientEnhancement,
  scanClientEnhancements,
  disposeClientEnhancements,
};

async function disposeClientEnhancements() {
  const scheduledDisposers = [...resuxScheduledEnhancementDisposers];
  resuxScheduledEnhancementDisposers.clear();
  for (const dispose of scheduledDisposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
      // Suppress cleanup errors during navigation.
    }
  }

  resuxVisibleEnhancementCallbacks.clear();
  if (resuxVisibleEnhancementObserver) {
    resuxVisibleEnhancementObserver.disconnect();
    resuxVisibleEnhancementObserver = null;
  }
  if (resuxVisibleEnhancementPollTimer) {
    window.clearInterval(resuxVisibleEnhancementPollTimer);
    resuxVisibleEnhancementPollTimer = 0;
  }
}

function hasClientEnhancement(name) {
  const normalized = String(name || "").trim();
  return normalized.length > 0 && resuxClientEnhancements.has(normalized);
}

function getClientEnhancement(name) {
  const normalized = String(name || "").trim();
  return normalized ? resuxClientEnhancements.get(normalized) : undefined;
}

async function scanClientEnhancements(root = document) {
  if (isClientRuntime() && document.readyState === "loading") {
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }
  await ensureClientEnhancementManifestLoaded();
  await activateDeclaredClientEnhancements(root);
}

function normalizeEnhancementTrigger(value, fallback = "visible") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (normalized === "visible" || normalized === "interaction" || normalized === "idle" || normalized === "immediate" || normalized === "page-load" || normalized === "manual") {
    return normalized;
  }
  return fallback;
}

function parseEnhancementOptions(value, name) {
  if (!value || !value.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { options: parsed };
    }
    return {
      error: "[resux] Options for \"" + name + "\" must be a JSON object.",
    };
  } catch (error) {
    return {
      error: "[resux] Failed to parse options for \"" + name + "\". Ensure data-resux-options is valid JSON. " + getEnhancementErrorMessage(error),
    };
  }
}

function collectDeclaredClientEnhancementElements(root) {
  const selector = "[data-resux-enhancement], [use-client-enhancement]";
  const elements = [...root.querySelectorAll(selector)];
  if (typeof root.matches === "function" && root.matches(selector)) {
    elements.unshift(root);
  }
  return elements;
}

function readDeclaredClientEnhancement(element) {
  const name = (
    element.getAttribute("data-resux-enhancement")
    ?? element.getAttribute("use-client-enhancement")
    ?? ""
  ).trim();
  if (!name) {
    return null;
  }

  const trigger = normalizeEnhancementTrigger(
    element.getAttribute("data-resux-trigger")
    ?? element.getAttribute("data-trigger")
    ?? element.getAttribute("trigger"),
    "visible",
  );
  const optionsAttributeValue = (
    element.getAttribute("data-resux-options")
    ?? element.getAttribute("data-resux-enhancement-options")
    ?? element.getAttribute("data-enhancement-options")
    ?? element.getAttribute("data-options")
  );
  const parsedOptions = parseEnhancementOptions(optionsAttributeValue, name);
  if (optionsAttributeValue !== null) {
    element.setAttribute("data-resux-options", optionsAttributeValue);
  }
  return {
    name,
    trigger,
    options: parsedOptions.options,
    error: parsedOptions.error,
  };
}

function reportDeclaredClientEnhancementError(element, declaration, error) {
  setEnhancementStatus(element, "error");
  element.setAttribute("data-rx-enhancement-error", error);
  dispatchEnhancementEvent("error", {
    name: declaration.name,
    trigger: declaration.trigger,
    elementId: readEnhancementElementId(element),
    error,
  });
}

function prepareDeclaredClientEnhancement(element, declaration) {
  resuxBoundEnhancementTargets.add(element);
  element.setAttribute("data-resux-enhancement", declaration.name);
  element.setAttribute("data-resux-trigger", declaration.trigger);
  element.setAttribute("data-rx-enhancement", declaration.name);
  element.setAttribute("data-rx-enhancement-trigger", declaration.trigger);
  setEnhancementStatus(element, "found");
  dispatchEnhancementEvent("found", {
    name: declaration.name,
    trigger: declaration.trigger,
    elementId: readEnhancementElementId(element),
  });
  logEnhancementDebug("found element " + declaration.name + " trigger=" + declaration.trigger);
}

async function activateDeclaredClientEnhancement(element) {
  if (resuxBoundEnhancementTargets.has(element)) {
    return;
  }
  const declaration = readDeclaredClientEnhancement(element);
  if (!declaration) {
    return;
  }
  if (declaration.error) {
    reportDeclaredClientEnhancementError(element, declaration, declaration.error);
    return;
  }

  prepareDeclaredClientEnhancement(element, declaration);
  try {
    await useClientEnhancement(declaration.name, {
      target: element,
      trigger: declaration.trigger,
      options: declaration.options,
    });
    setEnhancementBound(element, true);
    element.removeAttribute("data-rx-enhancement-error");
  } catch (error) {
    resuxBoundEnhancementTargets.delete(element);
    setEnhancementBound(element, false);
    reportDeclaredClientEnhancementError(
      element,
      declaration,
      getEnhancementErrorMessage(error),
    );
  }
}

async function activateDeclaredClientEnhancements(root = document) {
  if (!isClientRuntime() || !root || typeof root.querySelectorAll !== "function") {
    return;
  }
  logEnhancementDebug("scanning DOM");
  for (const element of collectDeclaredClientEnhancementElements(root)) {
    await activateDeclaredClientEnhancement(element);
  }
}


const __rxIterateKey = Symbol("iterate");

function __rxIsObject(value) {
  return value !== null && typeof value === "object";
}

function __rxHasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}

function __rxQueueJob(job) {
  __rxQueue.add(job);
  if (__rxFlushing) {
    return;
  }
  __rxFlushing = true;
  __rxFlushPromise = __rxResolvedPromise.then(__rxFlushJobs);
}

function __rxFlushJobs() {
  let didError = false;
  let firstError;
  const executionCounts = new Map();
  try {
    while (__rxQueue.size > 0) {
      const currentQueue = [...__rxQueue];
      __rxQueue.clear();
      for (const job of currentQueue) {
        const count = executionCounts.get(job) || 0;
        if (count >= 100) {
          if (!didError) {
            didError = true;
            firstError = new Error("Resux scheduler stopped a recursively queued job after 100 executions.");
          }
          continue;
        }
        executionCounts.set(job, count + 1);
        try {
          job();
        } catch (error) {
          if (!didError) {
            didError = true;
            firstError = error;
          }
        }
      }
    }
  } finally {
    __rxFlushing = false;
    __rxFlushPromise = null;
  }
  if (didError) {
    throw firstError;
  }
}

function nextTick(fn) {
  const promise = __rxFlushPromise || __rxResolvedPromise;
  return fn ? promise.then(fn) : promise;
}

function __rxCleanupEffect(reactiveEffect) {
  for (const dep of reactiveEffect.deps) {
    dep.delete(reactiveEffect);
  }
  reactiveEffect.deps.length = 0;
}

function __rxTriggerEffects(dep) {
  for (const reactiveEffect of [...dep]) {
    if (reactiveEffect === __rxActiveEffect) {
      continue;
    }
    if (reactiveEffect.scheduler) {
      reactiveEffect.scheduler();
    } else {
      reactiveEffect.run();
    }
  }
}

class __rxReactiveEffect {
  constructor(fn, scheduler, onStop) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.onStop = onStop;
    this.active = true;
    this.deps = [];
    this.parent = undefined;
  }

  run() {
    if (!this.active) {
      return this.fn();
    }
    let parent = __rxActiveEffect;
    while (parent) {
      if (parent === this) {
        return undefined;
      }
      parent = parent.parent;
    }
    __rxCleanupEffect(this);
    this.parent = __rxActiveEffect;
    __rxActiveEffect = this;
    __rxTrackStack.push(__rxShouldTrack);
    __rxShouldTrack = true;
    try {
      return this.fn();
    } finally {
      __rxShouldTrack = __rxTrackStack.pop() ?? true;
      __rxActiveEffect = this.parent;
      this.parent = undefined;
    }
  }

  stop() {
    if (!this.active) {
      return;
    }
    __rxCleanupEffect(this);
    if (typeof this.onStop === "function") {
      this.onStop();
    }
    this.active = false;
  }
}

function effect(fn, options = {}) {
  const _effect = new __rxReactiveEffect(fn, options.scheduler, options.onStop);
  if (!options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

function __rxTrack(target, key) {
  if (!__rxShouldTrack || !__rxActiveEffect) {
    return;
  }
  let depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    __rxTargetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  if (dep.has(__rxActiveEffect)) {
    return;
  }
  dep.add(__rxActiveEffect);
  __rxActiveEffect.deps.push(dep);
}

function __rxTrigger(target, key, type = "set") {
  const depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    return;
  }
  const effects = new Set();
  const addEffects = (dep) => {
    if (!dep) return;
    for (const effect of dep) effects.add(effect);
  };
  addEffects(depsMap.get(key));
  if (type === "add" || type === "delete") {
    addEffects(depsMap.get(__rxIterateKey));
  }
  __rxTriggerEffects(effects);
}

function reactive(target) {
  return __rxCreateReactiveObject(target, false, __rxReactiveMap, false);
}

function readonly(target) {
  return __rxCreateReactiveObject(target, true, __rxReadonlyMap, false);
}

function __rxCanUseBaseProxyHandlers(target) {
  const rawType = Object.prototype.toString.call(target);
  return rawType === "[object Object]" || rawType === "[object Array]";
}

function __rxCreateReactiveObject(target, isReadonlyValue, proxyMap, isShallow) {
  if (!__rxIsObject(target) || !__rxCanUseBaseProxyHandlers(target)) {
    return target;
  }
  const existing = proxyMap.get(target);
  if (existing) {
    return existing;
  }
  const proxy = new Proxy(target, {
    get(rawTarget, key, receiver) {
      if (key === __rxFlags.isReactive) {
        return !isReadonlyValue;
      }
      if (key === __rxFlags.isReadonly) {
        return isReadonlyValue;
      }
      if (key === __rxFlags.raw) {
        return rawTarget;
      }
      const value = Reflect.get(rawTarget, key, receiver);
      if (!isReadonlyValue) {
        __rxTrack(rawTarget, key);
      }
      if (isShallow || !__rxIsObject(value)) {
        return value;
      }
      return isReadonlyValue ? readonly(value) : reactive(value);
    },
    set(rawTarget, key, value, receiver) {
      if (isReadonlyValue) {
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(rawTarget, key);
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const oldLength = Array.isArray(rawTarget) ? rawTarget.length : 0;
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && (!hadKey || __rxHasChanged(value, oldValue))) {
        __rxTrigger(rawTarget, key, hadKey ? "set" : "add");
        if (
          Array.isArray(rawTarget)
          && key !== "length"
          && /^(?:0|[1-9]\d*)$/.test(String(key))
          && Number(key) >= oldLength
          && Number(key) < 4294967295
        ) {
          __rxTrigger(rawTarget, "length");
        }
      }
      return success;
    },
    ownKeys(rawTarget) {
      if (!isReadonlyValue) {
        __rxTrack(rawTarget, __rxIterateKey);
      }
      return Reflect.ownKeys(rawTarget);
    },
    deleteProperty(rawTarget, key) {
      if (isReadonlyValue) {
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(rawTarget, key);
      const success = Reflect.deleteProperty(rawTarget, key);
      if (hadKey && success) {
        __rxTrigger(rawTarget, key, "delete");
      }
      return success;
    }
  });
  proxyMap.set(target, proxy);
  return proxy;
}

function isReactive(value) {
  return Boolean(__rxIsObject(value) && value[__rxFlags.isReactive]);
}

function isReadonly(value) {
  return Boolean(__rxIsObject(value) && value[__rxFlags.isReadonly]);
}

class __rxRefImpl {
  constructor(value) {
    this.__v_isRef = true;
    this._rawValue = value;
    this._value = __rxIsObject(value) ? reactive(value) : value;
    this.dep = new Set();
  }

  get value() {
    if (__rxShouldTrack && __rxActiveEffect) {
      if (!this.dep.has(__rxActiveEffect)) {
        this.dep.add(__rxActiveEffect);
        __rxActiveEffect.deps.push(this.dep);
      }
    }
    return this._value;
  }

  set value(newValue) {
    if (!__rxHasChanged(newValue, this._rawValue)) {
      return;
    }
    this._rawValue = newValue;
    this._value = __rxIsObject(newValue) ? reactive(newValue) : newValue;
    __rxTriggerEffects(this.dep);
  }
}

function ref(value) {
  return isRef(value) ? value : new __rxRefImpl(value);
}

function isRef(value) {
  return Boolean(value && typeof value === "object" && value[__rxFlags.isRef] === true);
}

function unref(value) {
  return isRef(value) ? value.value : value;
}

class __rxObjectRef {
  constructor(object, key, defaultValue) {
    this.__v_isRef = true;
    this.object = object;
    this.key = key;
    this.defaultValue = defaultValue;
  }

  get value() {
    const value = this.object[this.key];
    return value === undefined ? this.defaultValue : value;
  }

  set value(newValue) {
    this.object[this.key] = newValue;
  }
}

function toRef(object, key, defaultValue) {
  const value = object[key];
  return isRef(value) ? value : new __rxObjectRef(object, key, defaultValue);
}

function toRefs(object) {
  const output = Array.isArray(object) ? new Array(object.length) : {};
  for (const key of Object.keys(object)) {
    output[key] = toRef(object, key);
  }
  return output;
}

function computed(getterOrOptions) {
  const getter = typeof getterOrOptions === "function"
    ? getterOrOptions
    : getterOrOptions.get;
  const setter = typeof getterOrOptions === "function"
    ? undefined
    : getterOrOptions.set;
  const dep = new Set();
  let dirty = true;
  let value;
  const runner = effect(getter, {
    lazy: true,
    scheduler: () => {
      if (!dirty) {
        dirty = true;
        __rxTriggerEffects(dep);
      }
    }
  });

  return {
    __v_isRef: true,
    __v_isReadonly: true,
    get value() {
      if (__rxShouldTrack && __rxActiveEffect && !dep.has(__rxActiveEffect)) {
        dep.add(__rxActiveEffect);
        __rxActiveEffect.deps.push(dep);
      }
      if (dirty) {
        dirty = false;
        value = runner();
      }
      return value;
    },
    set value(newValue) {
      if (setter) {
        setter(newValue);
      }
    }
  };
}

const __rxInitialWatchValue = Symbol("initial-watch-value");

function watch(source, callback, options = {}) {
  return __rxDoWatch(source, callback, options);
}

function watchEffect(effectFn, options = {}) {
  return __rxDoWatch(effectFn, null, options);
}

function __rxDoWatch(source, callback, options) {
  const deep = options.deep === true
    || (callback !== null && __rxContainsReactiveSource(source));
  const immediate = options.immediate === true;
  const flush = options.flush ?? "post";
  let cleanup;
  const onCleanup = (fn) => {
    cleanup = fn;
  };

  let getter;
  if (callback === null) {
    getter = () => {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
      source(onCleanup);
    };
  } else {
    getter = () => __rxResolveWatchSource(source);
  }

  if (deep) {
    const baseGetter = getter;
    getter = () => __rxTraverse(baseGetter());
  }

  let oldValue = __rxInitialWatchValue;

  const job = () => {
    if (callback === null) {
      runner();
      return;
    }
    const newValue = runner();
    if (deep || oldValue === __rxInitialWatchValue || __rxHasChanged(newValue, oldValue)) {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
      callback(newValue, oldValue === __rxInitialWatchValue ? undefined : oldValue, onCleanup);
      oldValue = newValue;
    }
  };

  const scheduler = flush === "sync"
    ? job
    : () => __rxQueueJob(job);

  const runner = effect(getter, {
    scheduler,
    lazy: callback !== null
  });

  if (callback) {
    if (immediate) {
      job();
    } else {
      oldValue = runner();
    }
  }

  return () => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    runner.effect.stop();
  };
}

function __rxResolveWatchSource(source) {
  if (Array.isArray(source)) {
    return source.map((entry) => __rxResolveWatchEntry(entry));
  }
  return __rxResolveWatchEntry(source);
}

function __rxResolveWatchEntry(source) {
  if (isRef(source)) {
    return source.value;
  }
  if (isReactive(source)) {
    return source;
  }
  if (typeof source === "function") {
    return source();
  }
  return source;
}

function __rxContainsReactiveSource(source) {
  if (isReactive(source)) {
    return true;
  }
  return Array.isArray(source) && source.some((entry) => isReactive(entry));
}

function __rxTraverse(value, seen = new Set()) {
  if (!__rxIsObject(value) || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.enumerable) {
      __rxTraverse(value[key], seen);
    }
  }
  return value;
}

export function defineResuxPlugin(plugin) {
  return plugin;
}

export function defineResuxRouteMiddleware(middleware) {
  return middleware;
}

export function defineClientRouteRedirect(to, options = {}) {
  return {
    type: "redirect",
    to,
    statusCode: options.statusCode
  };
}

export function defineClientRouteAbort(message, options = {}) {
  return {
    type: "abort",
    message,
    statusCode: options.statusCode
  };
}

export function useResuxApp() {
  return getClientResuxApp();
}

export function useResuxImage() {
  const app = getClientResuxApp();
  return createClientImageBuilder(app.route, app.$config);
}

let clientNoPrefixLocaleRef = null;

function readClientI18nConfig() {
  const runtimeConfig = getClientResuxApp().$config;
  const raw = runtimeConfig?.public?.i18n;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.locales) || raw.locales.length === 0) {
    return null;
  }
  const locales = raw.locales
    .map((entry) => ({
      code: String(entry?.code || "").trim().toLowerCase(),
      name: typeof entry?.name === "string" ? entry.name : undefined,
      dir: entry?.dir === "rtl" ? "rtl" : "ltr"
    }))
    .filter((entry) => entry.code);
  if (!locales.length) return null;
  const defaultLocale = locales.some((entry) => entry.code === String(raw.defaultLocale || "").toLowerCase())
    ? String(raw.defaultLocale).toLowerCase()
    : locales[0].code;
  const fallbackLocale = locales.some((entry) => entry.code === String(raw.fallbackLocale || "").toLowerCase())
    ? String(raw.fallbackLocale).toLowerCase()
    : defaultLocale;
  const strategy = raw.strategy === "prefix" || raw.strategy === "no_prefix"
    ? raw.strategy
    : "prefix_except_default";
  return { locales, defaultLocale, fallbackLocale, strategy, messages: raw.messages || {} };
}

function splitClientI18nTarget(to) {
  const base = typeof location !== "undefined" ? location.href : "http://resux.local/";
  const url = new URL(String(to || "/"), base);
  return { pathname: url.pathname || "/", search: url.search, hash: url.hash };
}

function clientI18nLogicalPath(pathname, config) {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const locale = config.locales.find((entry) => entry.code === first);
  if (!locale || config.strategy === "no_prefix") return normalized;
  const rest = segments.slice(1).join("/");
  return rest ? "/" + rest : "/";
}

function resolveClientI18nLocaleCode(config, routePath) {
  if (config.strategy === "no_prefix") {
    clientNoPrefixLocaleRef ||= ref(config.defaultLocale);
    return clientNoPrefixLocaleRef.value;
  }
  const { pathname } = splitClientI18nTarget(routePath || getClientResuxApp().route?.path || "/");
  const first = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return config.locales.some((entry) => entry.code === first) ? first : config.defaultLocale;
}

function readClientTranslation(messages, localeCode, key) {
  const forbidden = new Set(["__proto__", "prototype", "constructor"]);
  let current = messages?.[localeCode];
  for (const part of String(key || "").split(".")) {
    if (!part || forbidden.has(part) || !current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function interpolateClientTranslation(value, params = {}) {
  if (typeof value !== "string") return value;
  return value.replace(/\{([^{}]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}

function buildClientLocalePath(to, localeCode, config) {
  const targetLocale = config.locales.find((entry) => entry.code === String(localeCode || "").toLowerCase());
  if (!targetLocale) return String(to || "/");
  const { pathname, search, hash } = splitClientI18nTarget(to);
  const logical = clientI18nLogicalPath(pathname, config);
  let localized = logical;
  if (config.strategy === "prefix" || (config.strategy === "prefix_except_default" && targetLocale.code !== config.defaultLocale)) {
    localized = logical === "/" ? "/" + targetLocale.code : "/" + targetLocale.code + logical;
  }
  return localized + search + hash;
}

function useClientI18n(routeOverride) {
  const config = readClientI18nConfig();
  if (!config) {
    return {
      locale: ref("en"), dir: ref("ltr"), locales: [], defaultLocale: "en", fallbackLocale: "en", strategy: "prefix_except_default",
      t: (key) => key, tm: (key) => key, resolveLocalized: (value) => value,
      localePath: (to) => to, switchLocalePath: (_locale, to) => to || getClientResuxApp().route?.path || "/", setLocale: () => {}
    };
  }
  const routePath = getClientResuxApp().route?.path || routeOverride?.path || (typeof location !== "undefined" ? location.pathname + location.search + location.hash : "/");
  const locale = computed(() => {
    getClientRouteRevision().value;
    return resolveClientI18nLocaleCode(config, getClientResuxApp().route?.path || routePath);
  });
  const dir = computed(() => config.locales.find((entry) => entry.code === locale.value)?.dir || "ltr");
  const t = (key, params = {}) => {
    const value = readClientTranslation(config.messages, locale.value, key) ?? readClientTranslation(config.messages, config.fallbackLocale, key);
    return typeof value === "string" ? interpolateClientTranslation(value, params) : String(key);
  };
  const tm = (key) => readClientTranslation(config.messages, locale.value, key) ?? readClientTranslation(config.messages, config.fallbackLocale, key) ?? key;
  return {
    locale, dir, locales: config.locales, defaultLocale: config.defaultLocale, fallbackLocale: config.fallbackLocale, strategy: config.strategy, t, tm,
    resolveLocalized(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value == null ? null : String(value);
      return value[locale.value] ?? value[config.fallbackLocale] ?? value[config.defaultLocale] ?? null;
    },
    localePath(to, localeCode = locale.value) { return buildClientLocalePath(to, localeCode, config); },
    switchLocalePath(localeCode, to) {
      const current = to || (typeof location !== "undefined" ? location.pathname + location.search + location.hash : routePath);
      return buildClientLocalePath(current, localeCode, config);
    },
    setLocale(localeCode, to) {
      const targetLocale = config.locales.find((entry) => entry.code === String(localeCode || "").toLowerCase());
      if (!targetLocale) return;
      if (config.strategy === "no_prefix") {
        clientNoPrefixLocaleRef ||= ref(config.defaultLocale);
        clientNoPrefixLocaleRef.value = targetLocale.code;
        if (typeof document !== "undefined") {
          document.documentElement?.setAttribute("lang", targetLocale.code);
          document.documentElement?.setAttribute("dir", targetLocale.dir);
        }
        return;
      }
      const current = to || (typeof location !== "undefined" ? location.pathname + location.search + location.hash : routePath);
      return createClientRouter().push(buildClientLocalePath(current, targetLocale.code, config));
    }
  };
}

function getClientResuxApp(routeOverride) {
  const payload = globalThis.__RESUX__ ?? {
    route: routeOverride ?? { path: "/", params: {}, query: {} },
    scopes: {},
    globalState: {},
    modules: {},
    config: { public: {} }
  };
  const route = payload.route ?? routeOverride ?? { path: "/", params: {}, query: {} };
  const config = payload.config ?? { public: {} };
  let app = globalThis.__RESUX_APP__;

  if (!app) {
    app = {
      route,
      payload,
      $config: config,
      provides: clientProvides,
      provide(key, value) {
        clientProvides[key] = value;
        this["$" + key] = value;
      },
      vueApp: {
        component(name, component) {
          return component;
        },
        directive(name, directive) {
          return directive;
        },
        use(plugin, ...options) {
          return this;
        },
        mixin(mixin) {
          return this;
        },
        provide(key, value) {
          return this;
        },
        config: {
          globalProperties: {}
        }
      }
    };
    for (const [key, value] of Object.entries(clientProvides)) {
      app["$" + key] = value;
    }
    globalThis.__RESUX_APP__ = app;
  } else {
    const previousRoutePath = app.route?.path;
    app.route = route;
    app.payload = payload;
    app.$config = config;
    app.provides = clientProvides;
    if (previousRoutePath !== route?.path) {
      getClientRouteRevision().value += 1;
    }
  }

  return app;
}

function createClientImageBuilder(route, runtimeConfig) {
  return (src, options = {}) => {
    const normalizedSrc = normalizeClientImageSource(src, route);
    const imageConfig = readClientImageConfig(runtimeConfig);
    const providerName = String(options.provider || imageConfig.provider || "resux").trim().toLowerCase();
    const providerConfig = imageConfig.providers[providerName] || {};
    const baseURL = providerConfig.baseURL || (providerName === "vercel" ? "/_vercel/image" : "/__resux/image");
    const cacheOption = normalizeClientImageCacheValue(options.cache ?? imageConfig.cache);
    const modifiers = {
      ...(providerConfig.modifiers || {}),
      ...(Number.isFinite(imageConfig.quality) ? { quality: Math.round(imageConfig.quality) } : {}),
      ...(typeof imageConfig.format === "string" ? { format: imageConfig.format } : {}),
      ...(options.modifiers || {}),
      ...(Number.isFinite(options.width) ? { width: Math.round(options.width) } : {}),
      ...(Number.isFinite(options.height) ? { height: Math.round(options.height) } : {}),
      ...(Number.isFinite(options.quality) ? { quality: Math.round(options.quality) } : {}),
      ...(typeof options.fit === "string" ? { fit: options.fit } : {}),
      ...(typeof options.format === "string" ? { format: options.format } : {})
    };
    const normalizedFormat = normalizeClientImageOutputFormat(
      typeof modifiers.format === "string" ? modifiers.format : undefined
    );

    if (baseURL.includes("{src}")) {
      let resolved = baseURL.replaceAll("{src}", encodeURIComponent(normalizedSrc));
      for (const [key, value] of Object.entries(modifiers)) {
        resolved = resolved.replaceAll("{" + key + "}", encodeURIComponent(String(value)));
      }
      return resolved;
    }

    const query = new URLSearchParams();
    const sourceDescriptor = providerName === "vercel"
      ? { publicSource: normalizedSrc }
      : rewriteClientImageSourceForDisplayFormat(normalizedSrc, normalizedFormat);
    const useGeneratedCache = providerName === "resux" && typeof cacheOption === "string" && cacheOption.length > 0;

    if (providerName === "vercel") {
      query.set("url", normalizedSrc);
    } else {
      query.set("src", sourceDescriptor.publicSource);
      if (sourceDescriptor.originalSource) {
        query.set("original", sourceDescriptor.originalSource);
      }
    }

    const width = Number(modifiers.width);
    const height = Number(modifiers.height);
    const quality = Number(modifiers.quality);
    if (Number.isFinite(width) && width > 0) query.set("w", String(Math.round(width)));
    if (Number.isFinite(height) && height > 0) query.set("h", String(Math.round(height)));
    if (Number.isFinite(quality) && quality > 0) query.set("q", String(Math.round(quality)));
    if (typeof modifiers.fit === "string" && modifiers.fit) query.set("fit", modifiers.fit);
    if (normalizedFormat) {
      query.set("f", normalizedFormat);
    } else if (typeof modifiers.format === "string" && modifiers.format) {
      query.set("f", modifiers.format);
    }

    for (const [key, value] of Object.entries(modifiers)) {
      if (["width", "height", "quality", "fit", "format"].includes(key)) continue;
      if (value === undefined || value === null || value === false) continue;
      query.set(key, String(value));
    }

    if (useGeneratedCache) {
      query.set("cache", cacheOption);
      const generatedPath = createClientGeneratedImageRoutePath(
        sourceDescriptor.publicSource,
        sourceDescriptor.originalSource,
        normalizedFormat,
        modifiers,
      );
      const queryString = query.toString();
      return queryString ? generatedPath + "?" + queryString : generatedPath;
    }

    const separator = baseURL.includes("?") ? "&" : "?";
    return query.toString() ? baseURL + separator + query.toString() : baseURL;
  };
}

function normalizeClientImageCacheValue(value) {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }
  if (value === true) {
    return "1d";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return String(Math.round(value));
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
      return "1d";
    }
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
      return undefined;
    }
    return normalized;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["maxAge", "expiresIn", "ttl"]) {
      const normalized = normalizeClientImageCacheValue(value[key]);
      if (normalized) {
        return normalized;
      }
    }
  }
  return undefined;
}

function createClientGeneratedImageRoutePath(source, originalSource, normalizedFormat, modifiers) {
  const extension =
    normalizedFormat
    || inferClientImageExtensionFromSource(source)
    || inferClientImageExtensionFromSource(originalSource)
    || "bin";
  const signature = createClientImageTransformSignature(source, originalSource, normalizedFormat, modifiers);
  const digest = hashClientImageSignature(signature);
  return "/_resux/generated/images/" + digest + "." + extension;
}

function createClientImageTransformSignature(source, originalSource, normalizedFormat, modifiers) {
  const entries = ["src=" + source];
  if (originalSource) {
    entries.push("original=" + originalSource);
  }

  const width = Number(modifiers.width);
  if (Number.isFinite(width) && width > 0) {
    entries.push("w=" + Math.round(width));
  }
  const height = Number(modifiers.height);
  if (Number.isFinite(height) && height > 0) {
    entries.push("h=" + Math.round(height));
  }
  if (typeof modifiers.fit === "string" && modifiers.fit) {
    entries.push("fit=" + modifiers.fit);
  }
  if (normalizedFormat) {
    entries.push("f=" + normalizedFormat);
  }
  const quality = Number(modifiers.quality);
  if (Number.isFinite(quality) && quality > 0) {
    entries.push("q=" + Math.round(quality));
  }

  const extraKeys = Object.keys(modifiers)
    .filter((key) => !["width", "height", "quality", "fit", "format", "cache"].includes(key))
    .sort();
  for (const key of extraKeys) {
    const value = modifiers[key];
    if (value === undefined || value === null || value === false) {
      continue;
    }
    entries.push(key + "=" + String(value));
  }

  return entries.join("&");
}

function hashClientImageSignature(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function inferClientImageExtensionFromSource(value) {
  if (!value) {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("data:")) {
    const mimeMatch = /^data:image\/([a-zA-Z0-9.+-]+);/i.exec(trimmed);
    if (!mimeMatch) {
      return undefined;
    }
    const normalized = mimeMatch[1].toLowerCase();
    return normalized === "jpg" ? "jpeg" : normalized;
  }

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const dotIndex = withoutQuery.lastIndexOf(".");
  if (dotIndex < 0) {
    return undefined;
  }
  const extension = withoutQuery.slice(dotIndex + 1).toLowerCase();
  if (!extension) {
    return undefined;
  }
  return extension === "jpg" ? "jpeg" : extension;
}

function normalizeClientImageOutputFormat(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized === "jpg" ? "jpeg" : normalized;
}

function rewriteClientImageSourceForDisplayFormat(src, normalizedFormat) {
  if (!normalizedFormat) {
    return { publicSource: src };
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return { publicSource: src };
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const sourceUrl = new URL(src);
      const rewrittenPathname = rewriteClientImagePathExtension(sourceUrl.pathname, normalizedFormat);
      if (rewrittenPathname === sourceUrl.pathname) {
        return { publicSource: src };
      }
      sourceUrl.pathname = rewrittenPathname;
      return { publicSource: sourceUrl.toString(), originalSource: src };
    } catch {
      return { publicSource: src };
    }
  }

  const [pathPart, suffix = ""] = src.split(/(?=[?#])/);
  const rewrittenPath = rewriteClientImagePathExtension(pathPart, normalizedFormat);
  if (rewrittenPath === pathPart) {
    return { publicSource: src };
  }

  return { publicSource: rewrittenPath + suffix, originalSource: src };
}

function rewriteClientImagePathExtension(pathname, extension) {
  if (!pathname) {
    return pathname;
  }
  const normalizedExtension = extension.startsWith(".")
    ? extension.slice(1)
    : extension;
  const lastSlash = pathname.lastIndexOf("/");
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot > lastSlash) {
    return pathname.slice(0, lastDot + 1) + normalizedExtension;
  }
  return pathname + "." + normalizedExtension;
}

function normalizeClientImageSource(src, route) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("file:")) {
    return value;
  }
  if (value.startsWith("/")) return value;
  const basePath = route && typeof route.path === "string" && route.path.startsWith("/") ? route.path : "/";
  const directory = basePath.endsWith("/") ? basePath : basePath.slice(0, Math.max(basePath.lastIndexOf("/") + 1, 1));
  const resolved = new URL(value, "https://resux.local" + directory);
  return resolved.pathname + resolved.search + resolved.hash;
}

function readClientImageConfig(runtimeConfig) {
  const config = runtimeConfig && runtimeConfig.public ? runtimeConfig.public : {};
  const image = config.image || config.resuxImage || {};
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    return { providers: {} };
  }
  const providers = image.providers && typeof image.providers === "object" && !Array.isArray(image.providers)
    ? image.providers
    : {};
  const densities = Array.isArray(image.densities)
    ? image.densities.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry) && entry > 0).map((entry) => Math.round(entry))
    : undefined;
  return {
    provider: typeof image.provider === "string" ? image.provider : undefined,
    quality: Number.isFinite(image.quality)
      ? Math.min(100, Math.max(1, Math.round(Number(image.quality) || 1)))
      : undefined,
    format: typeof image.format === "string" ? image.format : undefined,
    cache: normalizeClientImageCacheValue(image.cache),
    densities: densities && densities.length ? densities : undefined,
    providers
  };
}

async function ensureClientPlugins(payload) {
  if (!payload || !Array.isArray(payload.plugins)) {
    return;
  }
  const app = getClientResuxApp(payload.route);

  for (const entry of payload.plugins) {
    if (!entry || entry.mode === "server" || typeof entry.id !== "string" || typeof entry.src !== "string") {
      continue;
    }
    if (clientPluginIds.has(entry.id)) {
      continue;
    }
    const imported = await import(/* @vite-ignore */ entry.src);
    const plugin = imported?.default ?? imported;
    if (typeof plugin === "function") {
      await plugin(app);
      getClientResuxApp(payload.route);
    }
    clientPluginIds.add(entry.id);
  }
}

async function ensureClientMiddleware(payload) {
  if (!payload || !Array.isArray(payload.middleware)) {
    return;
  }

  for (const entry of payload.middleware) {
    if (!entry || entry.mode !== "client" || typeof entry.id !== "string" || typeof entry.src !== "string") {
      continue;
    }
    if (clientMiddlewareById.has(entry.id)) {
      continue;
    }
    const imported = await import(/* @vite-ignore */ entry.src);
    const handler = imported?.default ?? imported;
    if (typeof handler === "function") {
      clientMiddlewareById.set(entry.id, {
        id: entry.id,
        name: String(entry.name ?? ""),
        global: Boolean(entry.global),
        handler
      });
    }
  }
}

function normalizeMiddlewareNames(value) {
  if (!value) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]).map((name) => String(name));
}

function normalizeClientMiddlewareResult(result) {
  if (result === undefined || result === null) {
    return null;
  }
  if (result === false) {
    return { type: "abort", statusCode: 403, message: "Navigation aborted" };
  }
  if (typeof result === "string") {
    return { type: "redirect", to: result, statusCode: 302 };
  }
  if (result.type === "redirect") {
    return {
      type: "redirect",
      to: result.to,
      statusCode: result.statusCode ?? 302
    };
  }
  if (result.type === "abort") {
    return {
      type: "abort",
      message: result.message ?? "Navigation aborted",
      statusCode: result.statusCode ?? 403
    };
  }
  if (typeof result.redirect === "string") {
    return { type: "redirect", to: result.redirect, statusCode: 302 };
  }
  if (result.redirect && typeof result.redirect === "object" && typeof result.redirect.to === "string") {
    return {
      type: "redirect",
      to: result.redirect.to,
      statusCode: result.redirect.statusCode ?? 302
    };
  }
  return null;
}

async function runClientRouteMiddleware(payload, fromRoute) {
  await ensureClientMiddleware(payload);
  const toRoute = payload?.route ?? fromRoute ?? { path: "/", params: {}, query: {} };
  const from = fromRoute ?? { path: "", params: {}, query: {} };
  const names = normalizeMiddlewareNames(payload?.pageMeta?.middleware);
  const allEntries = [...clientMiddlewareById.values()];
  const selected = [
    ...allEntries.filter((entry) => entry.global),
    ...names
      .map((name) => allEntries.find((entry) => entry.name === name))
      .filter(Boolean)
  ];

  for (const entry of selected) {
    const result = await entry.handler(toRoute, from);
    const normalized = normalizeClientMiddlewareResult(result);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}


function useClientGlobalState(key, factory) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error("useGlobalState(key) requires a non-empty key.");
  }

  if (!globalStateRefs.has(normalizedKey)) {
    const payload = globalThis.__RESUX__;
    const snapshot = payload && payload.globalState ? payload.globalState : Object.create(null);
    const hasValue = Object.prototype.hasOwnProperty.call(snapshot, normalizedKey);
    const value = hasValue ? snapshot[normalizedKey] : (typeof factory === "function" ? factory() : undefined);
    const label = 'useGlobalState("' + normalizedKey + '")';
    const serializedValue = cloneJsonSerializable(value, label);
    const stateRef = ref(value);
    globalStateSnapshots.set(normalizedKey, serializedValue);

    watch(stateRef, () => {
      try {
        const nextSnapshot = cloneJsonSerializable(stateRef.value, label);
        globalStateSnapshots.set(normalizedKey, nextSnapshot);
        const currentPayload = globalThis.__RESUX__;
        if (currentPayload) {
          currentPayload.globalState ||= Object.create(null);
          setSerializableRecordValue(currentPayload.globalState, normalizedKey, nextSnapshot);
        }
        queueGlobalStateRefresh(normalizedKey);
      } catch (error) {
        console.error("[resux:global-state] Reverting a non-serializable assignment for " + normalizedKey + ".", error);
        if (globalStateSnapshots.has(normalizedKey)) {
          stateRef.value = cloneJsonSerializable(globalStateSnapshots.get(normalizedKey), label);
        }
      }
    }, { flush: "post", deep: true });

    globalStateRefs.set(normalizedKey, stateRef);
  }

  return globalStateRefs.get(normalizedKey);
}

function serializeClientGlobalState() {
  const output = Object.create(null);
  for (const [key, stateRef] of globalStateRefs.entries()) {
    const label = 'useGlobalState("' + key + '")';
    try {
      const snapshot = cloneJsonSerializable(stateRef.value, label);
      globalStateSnapshots.set(key, snapshot);
      setSerializableRecordValue(output, key, snapshot);
    } catch (error) {
      console.error("[resux:global-state] Reverting a non-serializable assignment for " + key + ".", error);
      if (!globalStateSnapshots.has(key)) {
        continue;
      }
      const snapshot = cloneJsonSerializable(globalStateSnapshots.get(key), label);
      stateRef.value = cloneJsonSerializable(snapshot, label);
      setSerializableRecordValue(output, key, snapshot);
    }
  }
  return output;
}

function mergeClientGlobalState(payload) {
  if (!payload) {
    return payload;
  }
  const merged = Object.create(null);
  for (const [key, value] of Object.entries(payload.globalState || {})) {
    setSerializableRecordValue(merged, key, value);
  }
  for (const [key, value] of Object.entries(serializeClientGlobalState())) {
    setSerializableRecordValue(merged, key, value);
  }
  payload.globalState = merged;
  return payload;
}

function queueGlobalStateRefresh(key) {
  dirtyGlobalStateKeys.add(key);
  if (globalStateRefreshQueued) {
    return;
  }
  globalStateRefreshQueued = true;
  queueMicrotask(() => {
    globalStateRefreshQueued = false;
    const changedKeys = new Set(dirtyGlobalStateKeys);
    dirtyGlobalStateKeys.clear();
    void refreshScopesForGlobalState(changedKeys);
  });
}

async function refreshScopesForGlobalState(changedKeys) {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules || changedKeys.size === 0) {
    return;
  }

  const affectedScopes = [...scopeCache.entries()].filter(([scopeId]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      return false;
    }
    const keys = Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : [];
    return keys.some((key) => changedKeys.has(key));
  });

  await Promise.allSettled(affectedScopes.map(async ([scopeId, scopeRecord]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      return;
    }

    try {
      const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
      if (!component) {
        return;
      }

      const patches = component.render(scopeRecord);
      const serialized = component.serialize(scopeRecord);
      serializedScope.props = serialized.props;
      serializedScope.state = serialized.state;
      serializedScope.asyncData = serialized.asyncData;
      applyPatches(scopeId, patches);
    } catch (error) {
      console.error("[resux:global-state] Failed to refresh scope " + scopeId + ".", error);
    }
  }));
}

function normalizeComponentRegistryKey(key, apiName) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error(apiName + "(key) requires a non-empty key.");
  }
  return normalizedKey;
}

function hasOwnRegistryKey(registry, key) {
  return Object.prototype.hasOwnProperty.call(registry, key);
}

function setRegistryValue(registry, key, value) {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function createFetchAsyncDataKey(url, init) {
  return "fetch:" + hashFetchIdentity(serializeFetchRequestIdentity(url, init));
}

function serializeFetchRequestIdentity(url, init) {
  const headers = [];
  if (typeof Headers !== "undefined") {
    try {
      new Headers(init?.headers).forEach((value, key) => headers.push([key, value]));
      headers.sort(([left], [right]) => left.localeCompare(right));
    } catch {
      // Invalid headers will be reported by fetch itself; keep the cache key deterministic.
    }
  }
  return JSON.stringify({
    url,
    method: String(init?.method ?? "GET").toUpperCase(),
    headers,
    body: serializeFetchRequestBody(init?.body),
    cache: init?.cache ?? "",
    credentials: init?.credentials ?? "",
    integrity: init?.integrity ?? "",
    keepalive: init?.keepalive ?? false,
    mode: init?.mode ?? "",
    redirect: init?.redirect ?? "",
    referrer: init?.referrer ?? "",
    referrerPolicy: init?.referrerPolicy ?? "",
    duplex: init?.duplex ?? "",
    priority: init?.priority ?? ""
  });
}

function serializeFetchRequestBody(body) {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return ["string", body];
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return ["url-search-params", body.toString()];
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return ["form-data", ...Array.from(body.entries()).map(([key, value]) => [
      key,
      typeof value === "string"
        ? ["string", value]
        : ["file", value.name, value.size, value.type, value.lastModified]
    ])];
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return ["blob", body.name ?? "", body.size, body.type, body.lastModified ?? 0];
  }
  if (body instanceof ArrayBuffer) {
    const bytes = new Uint8Array(body);
    return ["array-buffer", bytes.byteLength, hashFetchBytes(bytes)];
  }
  if (ArrayBuffer.isView(body)) {
    const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    return ["array-buffer-view", bytes.byteLength, hashFetchBytes(bytes)];
  }
  return ["body", Object.prototype.toString.call(body)];
}

function hashFetchBytes(bytes) {
  let first = 2166136261;
  let second = 2246822519;
  for (const byte of bytes) {
    first = Math.imul(first ^ byte, 16777619);
    second = Math.imul(second ^ byte, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
}

function hashFetchIdentity(value) {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return (first >>> 0).toString(16).padStart(8, "0")
    + (second >>> 0).toString(16).padStart(8, "0");
}

export function createClientComponent(definition) {
  return {
    async createScope(serializedScope, route) {
      const stateRefs = Object.create(null);
      const globalStateKeys = new Set(Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : []);
      const asyncDataRefs = Object.create(null);
      const pendingCompletions = [];
      const mountedCallbacks = [];
      const props = serializedScope.props ?? {};
      const setupContext = {
        props,
        ref,
        reactive,
        computed,
        watch,
        watchEffect,
        readonly,
        toRef,
        toRefs,
        unref,
        isRef,
        isReactive,
        isReadonly,
        nextTick,
        useState(key, factory) {
          const normalizedKey = normalizeComponentRegistryKey(key, "useState");
          if (!hasOwnRegistryKey(stateRefs, normalizedKey)) {
            const hasValue = serializedScope.state && hasOwnRegistryKey(serializedScope.state, normalizedKey);
            setRegistryValue(
              stateRefs,
              normalizedKey,
              ref(hasValue ? serializedScope.state[normalizedKey] : factory?.())
            );
          }
          return stateRefs[normalizedKey];
        },
        useGlobalState(key, factory) {
          const normalizedKey = String(key || "").trim();
          if (normalizedKey) {
            globalStateKeys.add(normalizedKey);
          }
          return useClientGlobalState(key, factory);
        },
        useAsyncData(key, handler) {
          const normalizedKey = normalizeComponentRegistryKey(key, "useAsyncData");
          if (!hasOwnRegistryKey(asyncDataRefs, normalizedKey)) {
            const hasSnapshot = serializedScope.asyncData
              && hasOwnRegistryKey(serializedScope.asyncData, normalizedKey);
            const snapshot = hasSnapshot ? serializedScope.asyncData[normalizedKey] : undefined;
            const resource = createAsyncDataResource(
              snapshot?.value,
              snapshot?.pending ?? false,
              snapshot?.error ?? null
            );
            setRegistryValue(asyncDataRefs, normalizedKey, resource);
            if (resource.pending.value && typeof handler === "function") {
              const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
              if (controller) {
                pendingAsyncDataControllers.add(controller);
                resource.abortController = controller;
              }
              const completion = settleAsyncDataResource(resource, handler, normalizedKey, controller ? controller.signal : undefined)
                .finally(() => {
                  if (controller) {
                    pendingAsyncDataControllers.delete(controller);
                  }
                  resource.abortController = null;
                });
              resource.setCompletion(completion);
              pendingCompletions.push(completion);
            }
          }
          return asyncDataRefs[normalizedKey];
        },
        defineProps() {
          return props;
        },
        useRoute() {
          return route;
        },
        useRouter() {
          return createClientRouter();
        },
        useHead() {
          // Head updates are server-rendered by Resux.
        },
        useSeoMeta() {
          // SEO meta updates are server-rendered by Resux.
        },
        useRuntimeConfig() {
          return getClientResuxApp(route).$config;
        },
        useResuxApp() {
          return getClientResuxApp(route);
        },
        useResuxImage() {
          return createClientImageBuilder(route, getClientResuxApp(route).$config);
        },
        apiURL(url) {
          return url;
        },
        useFetch(url, init) {
          const key = createFetchAsyncDataKey(url, init);
          return setupContext.useAsyncData(key, () => setupContext.$fetch(url, init));
        },
        async $fetch(url, init) {
          const response = await fetch(url, init);
          if (!response.ok) {
            throw new Error("Fetch failed for " + url + ": " + response.status);
          }
          return response.json();
        },
        useError() {
          return useActiveResuxError();
        },
        clearError() {
          clearError();
        },
        showError(input) {
          return showError(input);
        },
        createError(input) {
          return createError(input);
        },
        useLazyPackage(name, options = {}) {
          return useLazyPackage(name, options);
        },
        useClientPackage(name, options = {}) {
          return useClientPackage(name, options);
        },
        usePackageReady(name) {
          return usePackageReady(name);
        },
        defineLazyPackage(name, options = {}) {
          return defineLazyPackage(name, options);
        },
        defineClientOnlyPackage(name, options = {}) {
          return defineClientOnlyPackage(name, options);
        },
        definePackageAdapter(definition) {
          return definePackageAdapter(definition);
        },
        defineClientEnhancement(name, setup) {
          return defineClientEnhancement(name, setup);
        },
        useClientEnhancement(name, options = {}) {
          return useClientEnhancement(name, options);
        },
        onMounted(callback) {
          if (typeof callback === "function") {
            mountedCallbacks.push(callback);
          }
        },
        definePageMeta() {
          // Page meta is compiled statically in Resux.
        },
        useI18n() {
          return useClientI18n(route);
        },
        useLocalePath() {
          return useClientI18n(route).localePath;
        },
        useSwitchLocalePath() {
          return useClientI18n(route).switchLocalePath;
        },
        useDevice() {
          return useDevice();
        },
        $device: useDevice()
      };
      const scope = await definition.script(setupContext);
      serializedScope.globalStateKeys = [...globalStateKeys];
      await Promise.allSettled(mountedCallbacks.map((callback) => callback()));
      return { scope, props, stateRefs, globalStateKeys, asyncDataRefs, pendingCompletions };
    },
    async run(scopeRecord, handlerName, event, eventLocals = {}) {
      const handler = scopeRecord.scope[handlerName];
      if (typeof handler !== "function") {
        throw new Error("Missing resumable handler " + handlerName + ".");
      }
      if (Object.keys(eventLocals).length > 0) {
        await handler(event, eventLocals);
      } else {
        await handler(event);
      }
      return renderClientPatches(definition.template, scopeRecord.scope, definition.styleScopeId);
    },
    render(scopeRecord) {
      return renderClientPatches(definition.template, scopeRecord.scope, definition.styleScopeId);
    },
    serialize(scopeRecord) {
      return {
        props: serializeProps(scopeRecord.props ?? {}),
        state: serializeRefs(scopeRecord.stateRefs),
        asyncData: serializeAsyncData(scopeRecord.asyncDataRefs)
      };
    }
  };
}

function shouldCaptureDelegatedEvent(eventName) {
  return (
    eventName === "focus"
    || eventName === "blur"
    || eventName === "mouseenter"
    || eventName === "mouseleave"
    || eventName === "pointerenter"
    || eventName === "pointerleave"
    || eventName === "load"
    || eventName === "error"
    || eventName === "loadstart"
    || eventName === "loadedmetadata"
    || eventName === "loadeddata"
    || eventName === "canplay"
    || eventName === "lazy-load-start"
    || eventName === "lazy-load-complete"
    || eventName === "invalid"
  );
}

function registerDelegatedEvent(eventName, useCapture = false) {
  if (!eventName || eventName === "click") {
    return;
  }
  const key = eventName + ":" + (useCapture ? "1" : "0");
  if (registeredDelegatedEvents.has(key)) {
    return;
  }
  registeredDelegatedEvents.add(key);
  document.addEventListener(eventName, (event) => {
    void handleDelegatedEvent(eventName, event);
  }, useCapture);
}

function registerDelegatedEventsFromDom(root = document) {
  const eventNames = new Set();
  const collect = (element) => {
    if (!element || !element.attributes) {
      return;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!attribute || typeof attribute.name !== "string" || !attribute.name.startsWith("data-rx-on-")) {
        continue;
      }
      const eventName = attribute.name.slice("data-rx-on-".length).trim();
      if (eventName) {
        eventNames.add(eventName);
      }
    }
  };
  if (root && root.nodeType === 1) {
    collect(root);
  }
  const iterableRoot = root && root.querySelectorAll ? root : document;
  if (iterableRoot && iterableRoot.querySelectorAll) {
    iterableRoot.querySelectorAll("*").forEach((element) => collect(element));
  }
  eventNames.forEach((eventName) => {
    registerDelegatedEvent(eventName, shouldCaptureDelegatedEvent(eventName));
  });
}

function installResux() {
  globalThis.__RESUX_USE_I18N__ = () => useClientI18n();
  globalThis.__RESUX_USE_LOCALE_PATH__ = () => useClientI18n().localePath;
  globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ = () => useClientI18n().switchLocalePath;
  if (globalThis.__RESUX_INSTALLED__) {
    return;
  }
  globalThis.__RESUX_INSTALLED__ = true;
  document.addEventListener("click", (event) => {
    if (handleNavigationClick(event)) {
      return;
    }
    void handleDelegatedEvent("click", event);
  });
  document.addEventListener("pointerover", (event) => {
    void prefetchNavigationTarget(event);
  });
  document.addEventListener("focusin", (event) => {
    void prefetchNavigationTarget(event);
  });
  document.addEventListener("load", handleManagedMediaLoad, true);
  document.addEventListener("error", handleManagedMediaError, true);
  document.addEventListener("loadedmetadata", handleManagedVideoReady, true);
  document.addEventListener("loadeddata", handleManagedVideoReady, true);
  document.addEventListener("canplay", handleManagedVideoReady, true);
  document.addEventListener("play", handleManagedVideoPlaybackState, true);
  document.addEventListener("pause", handleManagedVideoPlaybackState, true);
  registerDelegatedEventsFromDom(document);
  document.addEventListener("resux:page:finish", () => {
    void scanClientEnhancements(document);
  });
  if (typeof window !== "undefined" && typeof history !== "undefined" && typeof location !== "undefined") {
    if (!globalThis.__RESUX_ROUTER__) {
      globalThis.__RESUX_ROUTER__ = createClientRouter();
    }
    if (managedPageLoadReady) {
      managedPageLoadReady = true;
    } else {
      window.addEventListener("load", () => {
        managedPageLoadReady = true;
        activateDeferredLazyMedia();
      }, { once: true });
    }
    window.addEventListener("popstate", () => {
      void navigateTo(location.pathname + location.search + location.hash, {
        replace: true,
        force: true,
        preserveScroll: true,
      });
    });
    if (!history.state || !history.state.__resux) {
      history.replaceState({ __resux: true, path: location.pathname + location.search }, "", location.href);
    }
  }
  if (typeof window !== "undefined") {
    window.__RESUX_APPLY_DEV_UPDATE__ = applyDevUpdate;
  }
  void initializeClientRuntime();
}

async function initializeClientRuntime() {
  const payload = globalThis.__RESUX__;
  if (!payload) {
    return;
  }
  await ensureClientPlugins(payload);
  const middlewareResult = await runClientRouteMiddleware(payload, { path: "", params: {}, query: {} });
  if (middlewareResult?.type === "redirect") {
    await navigateTo(middlewareResult.to, { replace: true });
    return;
  }
  if (middlewareResult?.type === "abort") {
    return;
  }
  void resumePendingAsyncData();
  void mountVueIslands();
  activateDeferredLazyMedia();
  applyManagedVideoDefaultSpeeds();
  applyReducedMotionVideoPreference();
  initializeManagedVideoControls();
  registerDelegatedEventsFromDom(document);
}

function activateDeferredLazyMedia(root = document) {
  cleanupDetachedLazyMedia();
  activateDeferredLazyImages(root);
  activateDeferredLazyVideos(root);
  if (isManagedMediaDebugEnabled()) {
    const lazyImages = root?.querySelectorAll ? root.querySelectorAll("img[data-rx-lazy-image='true']").length : 0;
    const lazyVideos = root?.querySelectorAll ? root.querySelectorAll("video[data-rx-lazy-video='true']").length : 0;
    logManagedMediaDebug("media-activation", { lazyImages, lazyVideos });
  }
  dispatchPageReadyEvent(root);
}

function applyManagedVideoDefaultSpeeds(root = document) {
  const videos = root.querySelectorAll ? root.querySelectorAll("video[data-rx-video-default-speed]") : [];
  videos.forEach((video) => ensureManagedVideoElementDefaultSpeed(video));
}

function activateDeferredLazyImages(root = document) {
  const images = root.querySelectorAll ? root.querySelectorAll("img[data-rx-lazy-image='true']") : [];
  if (!images.length) {
    return;
  }
  for (const image of images) {
    if (!isManagedMediaConnected(image)) {
      continue;
    }
    if (
      image.getAttribute("data-rx-lazy-ready") === "true"
      || image.getAttribute("data-resux-revealed") === "true"
      || image.getAttribute("data-resux-loaded") === "true"
      || image.getAttribute("data-resux-error-handled") === "true"
      || observedLazyImages.has(image)
    ) {
      continue;
    }
    const observer = getLazyImageObserver(image);
    if (!observer) {
      revealDeferredLazyImage(image);
      continue;
    }
    observedLazyImages.add(image);
    lazyImageObserverByElement.set(image, observer);
    image.setAttribute("data-rx-lazy-observed", "true");
    image.setAttribute("data-resux-observed", "true");
    observer.observe(image);
  }
}

function getLazyImageObserver(image) {
  if (typeof IntersectionObserver !== "function") {
    return null;
  }
  const rootMargin = image.getAttribute("data-rx-lazy-root-margin") || "0px 0px";
  const thresholdRaw = Number(image.getAttribute("data-rx-lazy-threshold"));
  const threshold = Number.isFinite(thresholdRaw) ? Math.min(1, Math.max(0, thresholdRaw)) : 0;
  const key = rootMargin + "|" + String(threshold);
  if (lazyImageObservers.has(key)) {
    return lazyImageObservers.get(key);
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
        continue;
      }
      const target = entry.target;
      observer.unobserve(target);
      revealDeferredLazyImage(target);
    }
  }, { rootMargin, threshold });
  lazyImageObservers.set(key, observer);
  return observer;
}

function revealDeferredLazyImage(image) {
  if (!image || !isManagedMediaConnected(image)) {
    return;
  }
  unobserveLazyImage(image);

  if (
    image.getAttribute("data-rx-lazy-ready") === "true"
    || image.getAttribute("data-resux-revealed") === "true"
    || image.getAttribute("data-resux-loaded") === "true"
    || image.getAttribute("data-resux-error-handled") === "true"
  ) {
    return;
  }

  const targetSrc = image.getAttribute("data-rx-lazy-src") || image.getAttribute("data-src") || "";
  if (targetSrc && mediaSourceWasFailed(image, targetSrc)) {
    applyKnownImageFailure(image, targetSrc);
    return;
  }
  if (
    targetSrc
    && image.getAttribute("data-resux-loading") === "true"
    && mediaUrlsEqual(getCurrentMediaUrl(image), targetSrc, image)
  ) {
    return;
  }

  dispatchManagedEvent(image, "lazy-load-start");
  image.setAttribute("data-resux-revealed", "true");
  image.setAttribute("data-rx-lazy-pending", "true");
  image.setAttribute("data-rx-lazy-ready", "true");
  image.setAttribute("data-resux-loading", "true");
  image.setAttribute("data-resux-img", "loading");

  const picture = image.closest ? image.closest("picture") : null;
  if (picture && picture.querySelectorAll) {
    picture.setAttribute("data-resux-loading", "true");
    picture.querySelectorAll("source[data-rx-lazy-srcset]").forEach((source) => {
      const nextSrcset = source.getAttribute("data-rx-lazy-srcset");
      if (nextSrcset && !mediaSourceWasFailed(image, nextSrcset)) {
        source.setAttribute("srcset", nextSrcset);
      } else if (nextSrcset) {
        source.setAttribute("data-rx-failed-srcset", nextSrcset);
      }
      source.removeAttribute("data-rx-lazy-srcset");
      source.removeAttribute("data-srcset");
      const nextSizes = source.getAttribute("data-rx-lazy-sizes");
      if (nextSizes) {
        source.setAttribute("sizes", nextSizes);
      }
      source.removeAttribute("data-rx-lazy-sizes");
    });
  }

  const srcset = image.getAttribute("data-rx-lazy-srcset");
  if (srcset && !mediaSourceWasFailed(image, srcset)) {
    image.setAttribute("srcset", srcset);
  }
  image.removeAttribute("data-rx-lazy-srcset");
  image.removeAttribute("data-srcset");
  const sizes = image.getAttribute("data-rx-lazy-sizes");
  if (sizes) {
    image.setAttribute("sizes", sizes);
  }
  image.removeAttribute("data-rx-lazy-sizes");

  if (targetSrc && shouldAssignMediaSource(image, targetSrc)) {
    image.setAttribute("src", targetSrc);
  } else if (image.getAttribute("src") === RESUX_LAZY_PLACEHOLDER_SRC) {
    image.removeAttribute("src");
  }
  image.removeAttribute("data-rx-lazy-src");
  image.removeAttribute("data-src");
}

function activateDeferredLazyVideos(root = document) {
  const videos = root.querySelectorAll ? root.querySelectorAll("video[data-rx-lazy-video='true']") : [];
  if (!videos.length) {
    return;
  }
  for (const video of videos) {
    if (!isManagedMediaConnected(video)) {
      continue;
    }
    if (
      video.getAttribute("data-rx-lazy-ready") === "true"
      || video.getAttribute("data-resux-revealed") === "true"
      || video.getAttribute("data-resux-loaded") === "true"
      || video.getAttribute("data-resux-error-handled") === "true"
      || observedLazyVideos.has(video)
    ) {
      continue;
    }
    const deferUntilReady = video.getAttribute("data-rx-video-defer-ready") === "true";
    const revealOnReady = video.getAttribute("data-rx-video-ready-reveal") === "true";
    if (deferUntilReady && !managedPageLoadReady) {
      continue;
    }
    if (deferUntilReady && managedPageLoadReady && revealOnReady) {
      scheduleManagedVideoReveal(video);
      continue;
    }
    const observer = getLazyVideoObserver(video);
    if (!observer) {
      revealDeferredLazyVideo(video);
      continue;
    }
    observedLazyVideos.add(video);
    lazyVideoObserverByElement.set(video, observer);
    video.setAttribute("data-rx-lazy-observed", "true");
    video.setAttribute("data-resux-observed", "true");
    observer.observe(video);
  }
}

function getLazyVideoObserver(video) {
  if (typeof IntersectionObserver !== "function") {
    return null;
  }
  const rootMargin = video.getAttribute("data-rx-lazy-root-margin") || "320px 0px";
  const thresholdRaw = Number(video.getAttribute("data-rx-lazy-threshold"));
  const threshold = Number.isFinite(thresholdRaw) ? Math.min(1, Math.max(0, thresholdRaw)) : 0;
  const key = rootMargin + "|" + String(threshold);
  if (lazyVideoObservers.has(key)) {
    return lazyVideoObservers.get(key);
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
        continue;
      }
      const target = entry.target;
      observer.unobserve(target);
      revealDeferredLazyVideo(target);
    }
  }, { rootMargin, threshold });
  lazyVideoObservers.set(key, observer);
  return observer;
}

function scheduleManagedVideoReveal(video) {
  if (!video || !isManagedMediaConnected(video)) {
    return;
  }
  if (video.getAttribute("data-rx-video-reveal-scheduled") === "true") {
    return;
  }
  video.setAttribute("data-rx-video-reveal-scheduled", "true");
  const run = () => {
    video.removeAttribute("data-rx-video-reveal-scheduled");
    revealDeferredLazyVideo(video);
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 1200 });
    return;
  }
  setTimeout(run, 0);
}

function revealDeferredLazyVideo(video) {
  if (!video || !isManagedMediaConnected(video)) {
    return;
  }
  unobserveLazyVideo(video);

  const sourceNodes = video.querySelectorAll
    ? video.querySelectorAll("source[data-rx-lazy-src]")
    : [];
  const targetSrc = video.getAttribute("data-rx-lazy-src") || video.getAttribute("data-src") || "";
  const firstSourceTarget = sourceNodes.length
    ? (sourceNodes[0].getAttribute("data-rx-lazy-src") || sourceNodes[0].getAttribute("data-src") || "")
    : "";
  const revealTarget = targetSrc || firstSourceTarget;
  const loadingTarget = video.getAttribute("data-rx-video-loading-src") || "";

  if (
    video.getAttribute("data-rx-lazy-ready") === "true"
    || video.getAttribute("data-resux-revealed") === "true"
    || video.getAttribute("data-resux-loaded") === "true"
    || video.getAttribute("data-resux-error-handled") === "true"
  ) {
    return;
  }
  if (video.getAttribute("data-resux-video-loading") === "true") {
    if (!loadingTarget || !revealTarget || mediaUrlsEqual(loadingTarget, revealTarget, video)) {
      logManagedMediaDebug("video-reveal-skip-loading", { revealTarget, loadingTarget });
      return;
    }
  }
  if (revealTarget && mediaSourceWasFailed(video, revealTarget)) {
    applyKnownVideoFailure(video, revealTarget);
    return;
  }
  const knownFailedTarget = video.getAttribute("data-resux-failed-src") || video.getAttribute("data-rx-failed-src") || "";
  if (knownFailedTarget && revealTarget && mediaUrlsEqual(knownFailedTarget, revealTarget, video)) {
    logManagedMediaDebug("video-reveal-skip-failed", { revealTarget });
    return;
  }

  logManagedMediaDebug("video-reveal-start", {
    revealTarget,
    lazySrc: targetSrc,
    sourceCount: sourceNodes.length
  });
  dispatchManagedEvent(video, "lazy-load-start");
  video.setAttribute("data-resux-revealed", "true");

  const preload = video.getAttribute("data-rx-lazy-preload") || "metadata";
  video.setAttribute("preload", preload);
  ensureManagedVideoElementDefaultSpeed(video);
  const revealPoster = video.getAttribute("data-rx-poster") || video.getAttribute("data-rx-placeholder-src");
  if (revealPoster) {
    video.setAttribute("poster", revealPoster);
  }
  let assignedSource = false;
  let assignedPrimarySrc = "";
  let firstFailedSource = "";
  sourceNodes.forEach((source) => {
    const nextSrc = source.getAttribute("data-rx-lazy-src");
    if (nextSrc && !mediaSourceWasFailed(video, nextSrc)) {
      source.setAttribute("src", nextSrc);
      if (!assignedPrimarySrc) {
        assignedPrimarySrc = nextSrc;
      }
      assignedSource = true;
      logManagedMediaDebug("video-source-assigned", { src: nextSrc });
    } else if (nextSrc && !firstFailedSource) {
      firstFailedSource = nextSrc;
    }
    source.removeAttribute("data-rx-lazy-src");
    source.removeAttribute("data-src");
  });
  if (targetSrc && sourceNodes.length === 0 && shouldAssignMediaSource(video, targetSrc)) {
    video.setAttribute("src", targetSrc);
    assignedPrimarySrc = targetSrc;
    assignedSource = true;
    logManagedMediaDebug("video-source-assigned", { src: targetSrc });
  }
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  video.removeAttribute("data-rx-lazy-video");
  if (!assignedSource) {
    const knownFailedSrc = firstFailedSource || targetSrc;
    if (knownFailedSrc) {
      applyKnownVideoFailure(video, knownFailedSrc);
    }
    return;
  }
  video.setAttribute("data-rx-lazy-pending", "true");
  video.setAttribute("data-rx-lazy-ready", "true");
  video.setAttribute("data-resux-loading", "true");
  video.setAttribute("data-resux-video-loading", "true");
  video.setAttribute("data-resux-video", "loading");
  if (assignedPrimarySrc) {
    video.setAttribute("data-rx-video-loading-src", assignedPrimarySrc);
  }

  if (typeof video.load === "function" && video.getAttribute("data-rx-load-called") !== "true") {
    video.setAttribute("data-rx-load-called", "true");
    try {
      logManagedMediaDebug("video-load", { src: assignedPrimarySrc || revealTarget || "" });
      video.load();
    } catch {
      // Ignore load() runtime failures from older browsers.
    }
  } else {
    logManagedMediaDebug("video-load-skip", { reason: "already-called" });
  }
  if (shouldAutoplayManagedVideo(video)) {
    attemptManagedVideoPlay(video);
  }
}

function applyReducedMotionVideoPreference(root = document) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const videos = root.querySelectorAll ? root.querySelectorAll("video[data-rx-respect-reduced-motion='true']") : [];
  videos.forEach((video) => {
    if (video.getAttribute("data-rx-force-autoplay") === "true") {
      return;
    }
    video.removeAttribute("autoplay");
    if (typeof video.pause === "function") {
      video.pause();
    }
  });
}

function shouldAutoplayManagedVideo(video) {
  if (video.getAttribute("data-rx-autoplay-requested") !== "true") {
    return false;
  }
  if (video.getAttribute("data-rx-force-autoplay") === "true") {
    return true;
  }
  if (video.getAttribute("data-rx-respect-reduced-motion") !== "true") {
    return true;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function attemptManagedVideoPlay(video) {
  if (!video || video.getAttribute("data-rx-play-attempted") === "true") {
    return;
  }
  video.setAttribute("data-rx-play-attempted", "true");
  if (typeof video.play !== "function") {
    return;
  }
  const playResult = video.play();
  if (playResult && typeof playResult.catch === "function") {
    playResult.catch(() => {});
  }
}

function swallowManagedControlEvent(event) {
  if (!event) {
    return;
  }
  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
    return;
  }
  if (typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
}

function ensureManagedVideoFullscreenListeners() {
  if (managedVideoFullscreenListenersReady || typeof document === "undefined") {
    return;
  }
  managedVideoFullscreenListenersReady = true;
  const syncAllShells = () => {
    for (const shell of Array.from(managedVideoControlShells)) {
      if (!shell || !shell.isConnected) {
        managedVideoControlShells.delete(shell);
        continue;
      }
      const sync = managedVideoControlSyncByShell.get(shell);
      if (typeof sync === "function") {
        sync();
      }
    }
  };
  document.addEventListener("fullscreenchange", syncAllShells);
  document.addEventListener("webkitfullscreenchange", syncAllShells);
}

function isVideoControlTarget(target) {
  if (!target || !target.closest) {
    return false;
  }
  if (target.closest("[data-rx-video-zone], [data-resux-video-zone]")) {
    return false;
  }
  return Boolean(target.closest("[data-rx-video-controls], [data-resux-video-control], [data-rx-video-toggle], [data-rx-video-seek], [data-rx-video-volume], [data-rx-video-quality], [data-rx-video-speed], [data-rx-video-mute], [data-rx-video-fullscreen], [data-rx-video-skip-back-button], [data-rx-video-skip-forward-button], button, input, select, option, label, textarea, a"));
}

function shouldIgnoreManagedVideoStageInteraction(target) {
  if (!target || !target.closest) {
    return false;
  }
  if (target.closest("[data-rx-video-zone], [data-resux-video-zone]")) {
    return false;
  }
  return Boolean(
    target.closest("[data-resux-video-control], [data-rx-video-controls], button, input, select, textarea, a"),
  );
}

function showManagedVideoFeedback(shell, text, tone = "neutral") {
  if (!shell || !shell.querySelector || typeof text !== "string" || text.trim().length === 0) {
    return;
  }
  const node = shell.querySelector("[data-rx-video-feedback]");
  if (!node) {
    return;
  }
  const payload = text.trim();
  if (!payload) {
    return;
  }
  if (node.__rxFeedbackTimer) {
    clearTimeout(node.__rxFeedbackTimer);
    node.__rxFeedbackTimer = 0;
  }
  node.textContent = payload;
  node.setAttribute("data-rx-video-feedback-visible", "true");
  node.setAttribute("data-rx-video-feedback-tone", tone);
  node.__rxFeedbackTimer = setTimeout(() => {
    node.removeAttribute("data-rx-video-feedback-visible");
    node.removeAttribute("data-rx-video-feedback-tone");
    node.__rxFeedbackTimer = 0;
  }, 520);
}

function toggleManagedVideoPlayback(video) {
  if (!video) {
    return;
  }
  if (video.paused) {
    const playResult = typeof video.play === "function" ? video.play() : undefined;
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(() => {});
    }
    return;
  }
  if (typeof video.pause === "function") {
    video.pause();
  }
}

function toggleManagedVideoFullscreen(shell) {
  if (!shell) {
    return;
  }
  const isFullscreen = Boolean(
    document.fullscreenElement && (document.fullscreenElement === shell || document.fullscreenElement.contains(shell))
  );
  if (isFullscreen) {
    if (typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => {});
    } else if (typeof document.webkitExitFullscreen === "function") {
      document.webkitExitFullscreen();
    }
    return;
  }
  if (typeof shell.requestFullscreen === "function") {
    void shell.requestFullscreen().catch(() => {});
  } else if (typeof shell.webkitRequestFullscreen === "function") {
    shell.webkitRequestFullscreen();
  }
}

function syncManagedVideoControlsHitArea(shell, customControlsEnabled) {
  if (!shell || !shell.style || typeof shell.style.setProperty !== "function") {
    return;
  }
  const stage = shell.querySelector ? shell.querySelector("[data-rx-video-stage]") : null;
  const controls = shell.querySelector ? shell.querySelector("[data-rx-video-controls]") : null;
  if (customControlsEnabled && stage && controls && stage.getBoundingClientRect && controls.getBoundingClientRect) {
    const stageRect = stage.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const overlap = Math.max(0, stageRect.bottom - controlsRect.top + 8);
    if (Number.isFinite(overlap) && overlap > 0) {
      shell.style.setProperty("--rx-video-controls-hit-area", String(Math.ceil(overlap)) + "px");
      return;
    }
  }
  if (shell.getAttribute("data-rx-video-native-controls") === "true") {
    shell.style.setProperty("--rx-video-controls-hit-area", "4.25rem");
    return;
  }
  shell.style.setProperty("--rx-video-controls-hit-area", "0px");
}

function resolveManagedVideoState(video) {
  if (!video) {
    return "idle";
  }
  if (video.getAttribute("data-resux-error") === "true" || video.getAttribute("data-rx-error") === "true") {
    return "error";
  }
  if (video.getAttribute("data-rx-lazy-video") === "true" && video.getAttribute("data-rx-lazy-ready") !== "true") {
    return "idle";
  }
  if (video.getAttribute("data-resux-video-loading") === "true" || video.getAttribute("data-resux-loading") === "true") {
    return "loading";
  }
  if (!video.paused) {
    return "playing";
  }
  if (video.getAttribute("data-resux-loaded") === "true" && Number(video.currentTime) <= 0.01) {
    return "ready";
  }
  return "paused";
}

function resolveManagedVideoControlsLoad(shell) {
  return shell?.getAttribute?.("data-rx-video-controls-load") === "eager"
    ? "eager"
    : "lazy";
}

function resolveManagedVideoIconsLoad(shell) {
  return shell?.getAttribute?.("data-rx-video-icons-load") === "eager"
    ? "eager"
    : "lazy";
}

function isManagedVideoControlsActivated(shell) {
  return shell?.getAttribute?.("data-rx-video-controls-activated") === "true";
}

function activateManagedVideoControls(shell) {
  if (!shell) {
    return;
  }
  shell.setAttribute("data-rx-video-controls-activated", "true");
  shell.setAttribute("data-rx-video-controls-ready", "true");
  shell.setAttribute("data-resux-video-controls-ready", "true");
  if (resolveManagedVideoIconsLoad(shell) === "lazy") {
    shell.setAttribute("data-rx-video-icons-ready", "true");
  }
}

function scheduleManagedVideoControlsActivation(shell, sync) {
  if (!shell || resolveManagedVideoControlsLoad(shell) === "eager" || isManagedVideoControlsActivated(shell)) {
    return () => {};
  }

  let observer = null;
  let idleTimer = 0;
  let done = false;

  const cleanup = () => {
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
    observer = null;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = 0;
    }
    shell.removeEventListener("pointerdown", activateFromEvent, true);
    shell.removeEventListener("touchstart", activateFromEvent, true);
    shell.removeEventListener("focusin", activateFromEvent, true);
    shell.removeEventListener("mouseenter", activateFromEvent, true);
  };

  const activateNow = () => {
    if (done) {
      return;
    }
    done = true;
    cleanup();
    activateManagedVideoControls(shell);
    if (typeof sync === "function") {
      sync();
    }
  };

  const activateFromEvent = () => {
    activateNow();
  };

  shell.addEventListener("pointerdown", activateFromEvent, true);
  shell.addEventListener("touchstart", activateFromEvent, true);
  shell.addEventListener("focusin", activateFromEvent, true);
  shell.addEventListener("mouseenter", activateFromEvent, true);

  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        activateNow();
      }
    }, { rootMargin: "220px 0px" });
    observer.observe(shell);
  }

  idleTimer = setTimeout(() => {
    if (!isManagedMediaConnected(shell)) {
      return;
    }
    activateNow();
  }, 1400);

  return cleanup;
}

function initializeManagedVideoControls(root = document) {
  const shells = root.querySelectorAll ? root.querySelectorAll('[data-rx-video-shell="true"]') : [];
  if (!shells.length) {
    return;
  }
  shells.forEach((shell) => {
    if (initializedVideoControlShells.has(shell)) {
      const existingVideo = shell.querySelector ? shell.querySelector("video[data-resux-media='video']") : null;
      if (existingVideo) {
        updateManagedVideoControlShell(shell, existingVideo);
      }
      return;
    }

    const video = shell.querySelector ? shell.querySelector("video[data-resux-media='video']") : null;
    const stage = shell.querySelector ? shell.querySelector("[data-rx-video-stage]") : null;
    const toggleButton = shell.querySelector ? shell.querySelector("[data-rx-video-toggle]") : null;
    const muteButton = shell.querySelector ? shell.querySelector("[data-rx-video-mute]") : null;
    const fullscreenButton = shell.querySelector ? shell.querySelector("[data-rx-video-fullscreen]") : null;
    const skipBackButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-back-button]") : null;
    const skipForwardButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-forward-button]") : null;
    const speedButton = shell.querySelector ? shell.querySelector("[data-rx-video-speed]") : null;
    const qualitySelect = shell.querySelector ? shell.querySelector("[data-rx-video-quality]") : null;
    const leftZoneButton = shell.querySelector ? shell.querySelector("[data-rx-video-zone='left'], [data-rx-video-skip-back-zone]") : null;
    const centerZoneButton = shell.querySelector ? shell.querySelector("[data-rx-video-zone='center']") : null;
    const rightZoneButton = shell.querySelector ? shell.querySelector("[data-rx-video-zone='right'], [data-rx-video-skip-forward-zone]") : null;
    const seekInput = shell.querySelector ? shell.querySelector("[data-rx-video-seek]") : null;
    const volumeInput = shell.querySelector ? shell.querySelector("[data-rx-video-volume]") : null;
    if (!video) {
      return;
    }
    const customControlsEnabled = shell.getAttribute("data-rx-video-custom-controls") === "true";
    const hasCoreControls = Boolean(toggleButton && muteButton && fullscreenButton && seekInput && volumeInput);
    if (customControlsEnabled && !hasCoreControls) {
      return;
    }
    const hasInteractionZones = shell.getAttribute("data-rx-video-has-interaction-zones") === "true";
    if (!customControlsEnabled && !speedButton && !qualitySelect && !hasInteractionZones && !leftZoneButton && !rightZoneButton && !centerZoneButton) {
      return;
    }

    initializedVideoControlShells.add(shell);
    if (customControlsEnabled) {
      video.removeAttribute("controls");
    }
    if (resolveManagedVideoControlsLoad(shell) === "eager") {
      activateManagedVideoControls(shell);
    }
    syncManagedVideoControlsHitArea(shell, customControlsEnabled);
    ensureManagedVideoElementDefaultSpeed(video);
    ensureManagedVideoPlaybackSpeed(video, shell);
    if (volumeInput && Number.isFinite(video.volume)) {
      volumeInput.value = String(Math.min(1, Math.max(0, video.volume)));
    }
    const defaultQualityId = resolveManagedVideoDefaultQualityId(shell, parseManagedVideoQualityOptions(shell));
    if (defaultQualityId) {
      applyManagedVideoQuality(video, shell, defaultQualityId, {
        triggerLoad: false,
        preservePlayback: false,
        qualitySelect
      });
    }

    const sync = () => updateManagedVideoControlShell(shell, video);
    const cancelLazyActivation = scheduleManagedVideoControlsActivation(shell, sync);
    const syncEvents = ["play", "pause", "timeupdate", "loadedmetadata", "durationchange", "volumechange", "loadeddata", "canplay", "lazy-load-start", "lazy-load-complete", "ratechange"];
    const removeListeners = [];
    const bind = (target, eventName, handler, options) => {
      if (!target || typeof target.addEventListener !== "function") {
        return;
      }
      target.addEventListener(eventName, handler, options);
      removeListeners.push(() => {
        target.removeEventListener(eventName, handler, options);
      });
    };
    syncEvents.forEach((name) => bind(video, name, sync));

    let centerClickTimer = 0;
    const disposeShell = () => {
      if (centerClickTimer) {
        clearTimeout(centerClickTimer);
        centerClickTimer = 0;
      }
      cancelLazyActivation();
      while (removeListeners.length > 0) {
        const dispose = removeListeners.pop();
        try {
          dispose?.();
        } catch {}
      }
      managedVideoControlCleanupByShell.delete(shell);
      managedVideoControlSyncByShell.delete(shell);
      managedVideoControlShells.delete(shell);
    };
    shell.addEventListener("DOMNodeRemovedFromDocument", disposeShell, { once: true });
    managedVideoControlCleanupByShell.set(shell, disposeShell);
    managedVideoControlSyncByShell.set(shell, sync);
    managedVideoControlShells.add(shell);
    ensureManagedVideoFullscreenListeners();

    if (toggleButton) {
      bind(toggleButton, "click", (event) => {
        swallowManagedControlEvent(event);
        const wasPaused = Boolean(video.paused);
        toggleManagedVideoPlayback(video);
        const iconPlay = shell.getAttribute("data-rx-video-icon-play") || "Play";
        const iconPause = shell.getAttribute("data-rx-video-icon-pause") || "Pause";
        showManagedVideoFeedback(shell, wasPaused ? iconPlay : iconPause, wasPaused ? "play" : "pause");
        sync();
      });
    }

    if (muteButton) {
      bind(muteButton, "click", (event) => {
        swallowManagedControlEvent(event);
        if (video.muted || video.volume <= 0.01) {
          video.muted = false;
          if (video.volume <= 0.01) {
            video.volume = 0.6;
          }
        } else {
          video.muted = true;
        }
        sync();
      });
    }

    if (seekInput) {
      bind(seekInput, "input", (event) => {
        swallowManagedControlEvent(event);
        const duration = Number(video.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          return;
        }
        const ratio = Number(seekInput.value) / 100;
        video.currentTime = Math.min(duration, Math.max(0, duration * ratio));
        sync();
      });
    }

    if (volumeInput) {
      bind(volumeInput, "input", (event) => {
        swallowManagedControlEvent(event);
        const nextVolume = Math.min(1, Math.max(0, Number(volumeInput.value)));
        if (!Number.isFinite(nextVolume)) {
          return;
        }
        video.volume = nextVolume;
        video.muted = nextVolume <= 0.01;
        sync();
      });
    }

    const skipControlsEnabled = shell.getAttribute("data-rx-video-skip-controls") === "true";
    const clickToPlayEnabled = shell.getAttribute("data-rx-video-click-to-play") !== "false";
    const doubleClickFullscreenEnabled = shell.getAttribute("data-rx-video-double-click-fullscreen") !== "false";
    const skipBackwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-backward"), 10);
    const skipForwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-forward"), 10);
    const skipBy = (deltaSeconds, event, source = "zone") => {
      if (event) {
        swallowManagedControlEvent(event);
      }
      const duration = Number(video.duration);
      const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      const next = Number.isFinite(duration) && duration > 0
        ? Math.min(duration, Math.max(0, current + deltaSeconds))
        : Math.max(0, current + deltaSeconds);
      video.currentTime = next;
      const absoluteSeconds = Math.abs(deltaSeconds);
      const labelValue = Number.isInteger(absoluteSeconds)
        ? String(Math.trunc(absoluteSeconds))
        : String(Math.round(absoluteSeconds * 100) / 100);
      showManagedVideoFeedback(
        shell,
        (deltaSeconds < 0 ? "-" : "+") + labelValue + "s",
        deltaSeconds < 0 ? "skip-back" : "skip-forward",
      );
      dispatchManagedEvent(video, "resux:video-skip", {
        delta: deltaSeconds,
        currentTime: next,
        source,
      });
      sync();
    };

    const handleCenterSingleClick = (event) => {
      if (!clickToPlayEnabled || shouldIgnoreManagedVideoStageInteraction(event.target)) {
        return;
      }
      swallowManagedControlEvent(event);
      if (centerClickTimer) {
        clearTimeout(centerClickTimer);
        centerClickTimer = 0;
      }
      centerClickTimer = setTimeout(() => {
        centerClickTimer = 0;
        const wasPaused = Boolean(video.paused);
        toggleManagedVideoPlayback(video);
        const iconPlay = shell.getAttribute("data-rx-video-icon-play") || "Play";
        const iconPause = shell.getAttribute("data-rx-video-icon-pause") || "Pause";
        showManagedVideoFeedback(shell, wasPaused ? iconPlay : iconPause, wasPaused ? "play" : "pause");
        sync();
      }, 220);
    };

    const resolveStageClickRatio = (event) => {
      if (!stage || typeof stage.getBoundingClientRect !== "function") {
        return null;
      }
      const rect = stage.getBoundingClientRect();
      if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) {
        return null;
      }
      const clientX = Number(event.clientX);
      if (!Number.isFinite(clientX)) {
        return null;
      }
      const clampedX = Math.min(rect.width, Math.max(0, clientX - rect.left));
      return clampedX / rect.width;
    };

    if (stage) {
      bind(stage, "click", (event) => {
        if (!event || event.button !== 0 || shouldIgnoreManagedVideoStageInteraction(event.target)) {
          return;
        }
        const ratio = resolveStageClickRatio(event);
        if (ratio === null) {
          return;
        }
        if (skipControlsEnabled && ratio < (1 / 3)) {
          skipBy(-skipBackwardSeconds, event, "left-zone");
          return;
        }
        if (skipControlsEnabled && ratio > (2 / 3)) {
          skipBy(skipForwardSeconds, event, "right-zone");
          return;
        }
        handleCenterSingleClick(event);
      });
      bind(stage, "dblclick", (event) => {
        if (!doubleClickFullscreenEnabled || shouldIgnoreManagedVideoStageInteraction(event.target)) {
          return;
        }
        const ratio = resolveStageClickRatio(event);
        if (ratio === null || ratio < (1 / 3) || ratio > (2 / 3)) {
          return;
        }
        swallowManagedControlEvent(event);
        if (centerClickTimer) {
          clearTimeout(centerClickTimer);
          centerClickTimer = 0;
        }
        toggleManagedVideoFullscreen(shell);
        const icon = shell.getAttribute("data-rx-video-icon-fullscreen") || "Full";
        showManagedVideoFeedback(shell, icon, "fullscreen");
        sync();
      });
    }

    if (skipControlsEnabled && leftZoneButton) {
      bind(leftZoneButton, "click", (event) => {
        if (isVideoControlTarget(event.target)) {
          return;
        }
        skipBy(-skipBackwardSeconds, event, "left-zone-button");
      });
    }
    if (skipControlsEnabled && rightZoneButton) {
      bind(rightZoneButton, "click", (event) => {
        if (isVideoControlTarget(event.target)) {
          return;
        }
        skipBy(skipForwardSeconds, event, "right-zone-button");
      });
    }
    if (skipControlsEnabled && skipBackButton) {
      bind(skipBackButton, "click", (event) => {
        if (isVideoControlTarget(event.target) && event.target !== skipBackButton) {
          return;
        }
        skipBy(-skipBackwardSeconds, event, "control-back-button");
      });
    }
    if (skipControlsEnabled && skipForwardButton) {
      bind(skipForwardButton, "click", (event) => {
        if (isVideoControlTarget(event.target) && event.target !== skipForwardButton) {
          return;
        }
        skipBy(skipForwardSeconds, event, "control-forward-button");
      });
    }

    if (centerZoneButton) {
      bind(centerZoneButton, "click", (event) => {
        if (shouldIgnoreManagedVideoStageInteraction(event.target)) {
          return;
        }
        handleCenterSingleClick(event);
      });
      bind(centerZoneButton, "dblclick", (event) => {
        if (!doubleClickFullscreenEnabled || isVideoControlTarget(event.target)) {
          return;
        }
        swallowManagedControlEvent(event);
        if (centerClickTimer) {
          clearTimeout(centerClickTimer);
          centerClickTimer = 0;
        }
        toggleManagedVideoFullscreen(shell);
        sync();
      });
    }

    if (speedButton) {
      bind(speedButton, "click", (event) => {
        swallowManagedControlEvent(event);
        const nextSpeed = nextManagedVideoPlaybackSpeed(video, shell);
        if (!nextSpeed) {
          return;
        }
        applyManagedVideoPlaybackSpeed(video, shell, nextSpeed);
        showManagedVideoFeedback(shell, formatManagedVideoPlaybackRateLabel(nextSpeed), "speed");
        sync();
      });
    }

    if (qualitySelect) {
      bind(qualitySelect, "change", (event) => {
        swallowManagedControlEvent(event);
        applyManagedVideoQuality(video, shell, qualitySelect.value, {
          triggerLoad: true,
          preservePlayback: true,
          qualitySelect
        });
        const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
        const label = selectedOption?.textContent?.trim() || qualitySelect.value;
        if (label) {
          showManagedVideoFeedback(shell, label, "quality");
        }
        sync();
      });
      syncManagedVideoQualityControl(shell, video, qualitySelect);
    }

    if (fullscreenButton) {
      bind(fullscreenButton, "click", (event) => {
        swallowManagedControlEvent(event);
        toggleManagedVideoFullscreen(shell);
        const icon = shell.getAttribute("data-rx-video-icon-fullscreen") || "Full";
        showManagedVideoFeedback(shell, icon, "fullscreen");
        sync();
      });
    }

    sync();
  });
}

function updateManagedVideoControlShell(shell, video) {
  if (!shell || !video) {
    return;
  }
  const customControlsEnabled = shell.getAttribute("data-rx-video-custom-controls") === "true";
  const toggleButton = shell.querySelector ? shell.querySelector("[data-rx-video-toggle]") : null;
  const muteButton = shell.querySelector ? shell.querySelector("[data-rx-video-mute]") : null;
  const fullscreenButton = shell.querySelector ? shell.querySelector("[data-rx-video-fullscreen]") : null;
  const skipBackButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-back-button]") : null;
  const skipForwardButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-forward-button]") : null;
  const speedButton = shell.querySelector ? shell.querySelector("[data-rx-video-speed]") : null;
  const qualitySelect = shell.querySelector ? shell.querySelector("[data-rx-video-quality]") : null;
  const seekInput = shell.querySelector ? shell.querySelector("[data-rx-video-seek]") : null;
  const volumeInput = shell.querySelector ? shell.querySelector("[data-rx-video-volume]") : null;
  const currentTimeLabel = shell.querySelector ? shell.querySelector("[data-rx-video-current]") : null;
  const durationLabel = shell.querySelector ? shell.querySelector("[data-rx-video-duration]") : null;
  if (
    customControlsEnabled
    && (!toggleButton || !muteButton || !fullscreenButton || !seekInput || !volumeInput || !currentTimeLabel || !durationLabel)
  ) {
    return;
  }

  const lazyPending = video.getAttribute("data-rx-lazy-video") === "true" && video.getAttribute("data-rx-lazy-ready") !== "true";
  const controlsLoadMode = resolveManagedVideoControlsLoad(shell);
  const controlsActivated = controlsLoadMode === "eager" || isManagedVideoControlsActivated(shell);
  if (controlsActivated) {
    shell.setAttribute("data-rx-video-controls-activated", "true");
  }
  const controlsReady = (!lazyPending && controlsActivated) ? "true" : "false";
  shell.setAttribute("data-rx-video-controls-ready", controlsReady);
  shell.setAttribute("data-resux-video-controls-ready", controlsReady);
  const iconsLoadMode = resolveManagedVideoIconsLoad(shell);
  const iconsReady = iconsLoadMode === "eager" || controlsActivated;
  if (iconsReady) {
    shell.setAttribute("data-rx-video-icons-ready", "true");
  }
  syncManagedVideoControlsHitArea(shell, customControlsEnabled);
  const videoState = resolveManagedVideoState(video);
  shell.setAttribute("data-rx-video-state", videoState);
  shell.setAttribute("data-resux-video", videoState);
  video.setAttribute("data-resux-video", videoState);

  if (customControlsEnabled && toggleButton && muteButton && fullscreenButton && seekInput && volumeInput && currentTimeLabel && durationLabel) {
    const iconPlay = shell.getAttribute("data-rx-video-icon-play") || "\u25b6";
    const iconPause = shell.getAttribute("data-rx-video-icon-pause") || "\u275a\u275a";
    const iconMute = shell.getAttribute("data-rx-video-icon-mute") || "\ud83d\udd07";
    const iconUnmute = shell.getAttribute("data-rx-video-icon-unmute") || "\ud83d\udd0a";
    const iconFullscreen = shell.getAttribute("data-rx-video-icon-fullscreen") || "\u26f6";
    const iconExitFullscreen = shell.getAttribute("data-rx-video-icon-exit-fullscreen") || "\ud83d\uddd7";
    const iconSkipBack = shell.getAttribute("data-rx-video-icon-skip-backward") || "\u23ea";
    const iconSkipForward = shell.getAttribute("data-rx-video-icon-skip-forward") || "\u23e9";
    const iconPlayFallback = shell.getAttribute("data-rx-video-icon-play-fallback") || "Play";
    const iconPauseFallback = shell.getAttribute("data-rx-video-icon-pause-fallback") || "Pause";
    const iconMuteFallback = shell.getAttribute("data-rx-video-icon-mute-fallback") || "Mute";
    const iconUnmuteFallback = shell.getAttribute("data-rx-video-icon-unmute-fallback") || "Sound";
    const iconFullscreenFallback = shell.getAttribute("data-rx-video-icon-fullscreen-fallback") || "Full";
    const iconExitFullscreenFallback = shell.getAttribute("data-rx-video-icon-exit-fullscreen-fallback") || "Exit";
    const iconSkipBackFallback = shell.getAttribute("data-rx-video-icon-skip-backward-fallback") || "Back";
    const iconSkipForwardFallback = shell.getAttribute("data-rx-video-icon-skip-forward-fallback") || "Fwd";
    const showVolume = shell.getAttribute("data-rx-video-show-volume") !== "false";
    const showProgress = shell.getAttribute("data-rx-video-show-progress") !== "false";
    const showTime = shell.getAttribute("data-rx-video-show-time") !== "false";
    const showFullscreen = shell.getAttribute("data-rx-video-show-fullscreen") !== "false";
    const showSkipControls = shell.getAttribute("data-rx-video-skip-controls") === "true";
    const skipBackwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-backward"), 10);
    const skipForwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-forward"), 10);

    toggleButton.textContent = video.paused
      ? (iconsReady ? iconPlay : iconPlayFallback)
      : (iconsReady ? iconPause : iconPauseFallback);
    toggleButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");

    const muted = video.muted || video.volume <= 0.01;
    muteButton.hidden = !showVolume;
    volumeInput.hidden = !showVolume;
    muteButton.textContent = muted
      ? (iconsReady ? iconMute : iconMuteFallback)
      : (iconsReady ? iconUnmute : iconUnmuteFallback);
    muteButton.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");

    const duration = Number(video.duration);
    const currentTime = Number(video.currentTime);
    const hasDuration = Number.isFinite(duration) && duration > 0;
    const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0;
    seekInput.hidden = !showProgress;
    currentTimeLabel.hidden = !showTime;
    durationLabel.hidden = !showTime;
    seekInput.value = hasDuration ? String(Math.min(100, Math.max(0, (safeCurrentTime / duration) * 100))) : "0";
    currentTimeLabel.textContent = formatManagedMediaTime(safeCurrentTime);
    durationLabel.textContent = formatManagedMediaTime(hasDuration ? duration : 0);

    const volumeValue = Number.isFinite(video.volume) ? video.volume : 0;
    volumeInput.value = String(Math.min(1, Math.max(0, volumeValue)));

    const isFullscreen = Boolean(
      document.fullscreenElement && (document.fullscreenElement === shell || document.fullscreenElement.contains(shell))
    );
    fullscreenButton.hidden = !showFullscreen;
    fullscreenButton.textContent = isFullscreen
      ? (iconsReady ? iconExitFullscreen : iconExitFullscreenFallback)
      : (iconsReady ? iconFullscreen : iconFullscreenFallback);
    fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");

    if (skipBackButton) {
      const backwardLabel = Number.isInteger(skipBackwardSeconds)
        ? String(Math.trunc(skipBackwardSeconds)) + "s"
        : String(skipBackwardSeconds) + "s";
      skipBackButton.hidden = !showSkipControls;
      skipBackButton.textContent = iconsReady ? iconSkipBack : iconSkipBackFallback;
      skipBackButton.setAttribute("aria-label", "Skip backward " + backwardLabel);
    }
    if (skipForwardButton) {
      const forwardLabel = Number.isInteger(skipForwardSeconds)
        ? String(Math.trunc(skipForwardSeconds)) + "s"
        : String(skipForwardSeconds) + "s";
      skipForwardButton.hidden = !showSkipControls;
      skipForwardButton.textContent = iconsReady ? iconSkipForward : iconSkipForwardFallback;
      skipForwardButton.setAttribute("aria-label", "Skip forward " + forwardLabel);
    }
  }

  const speedControlEnabled = shell.getAttribute("data-rx-video-speed-control") === "true";
  if (speedButton) {
    const activeSpeed = ensureManagedVideoPlaybackSpeed(video, shell);
    const labelPrefix = shell.getAttribute("data-rx-video-speed-label") || "Speed";
    const showIcon = shell.getAttribute("data-rx-video-show-speed-icon") !== "false";
    const iconSpeed = shell.getAttribute("data-rx-video-icon-speed") || "\u00bb";
    const speedLabel = formatManagedVideoPlaybackRateLabel(activeSpeed);
    speedButton.hidden = !speedControlEnabled;
    speedButton.setAttribute("aria-label", labelPrefix + ": " + speedLabel);
    speedButton.textContent = ((showIcon && iconsReady) ? (iconSpeed + " ") : "") + speedLabel;
  }
  syncManagedVideoQualityControl(shell, video, qualitySelect);
}

function formatManagedMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remaining = totalSeconds % 60;
  if (hours > 0) {
    return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0");
  }
  return minutes + ":" + String(remaining).padStart(2, "0");
}

function normalizeManagedVideoSkipSeconds(value, fallback = 10) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(120, Math.max(0.25, Math.round(parsed * 100) / 100));
}

function ensureManagedVideoElementDefaultSpeed(video) {
  if (!video || video.getAttribute("data-rx-video-default-speed-applied") === "true") {
    return;
  }
  const defaultSpeed = normalizeManagedVideoPlaybackSpeed(
    video.getAttribute("data-rx-video-default-speed")
  );
  if (!defaultSpeed) {
    return;
  }
  video.playbackRate = defaultSpeed;
  if (Number.isFinite(video.defaultPlaybackRate)) {
    video.defaultPlaybackRate = defaultSpeed;
  }
  video.setAttribute("data-rx-video-default-speed-applied", "true");
  video.setAttribute("data-rx-video-active-speed", String(defaultSpeed));
}

function normalizeManagedVideoPlaybackSpeed(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 100) / 100;
}

function readManagedVideoPlaybackSpeeds(shell) {
  const raw = shell?.getAttribute?.("data-rx-video-speeds") || "";
  const parsed = raw
    .split(",")
    .map((entry) => normalizeManagedVideoPlaybackSpeed(entry))
    .filter((entry) => Number.isFinite(entry));
  const uniqueSorted = [...new Set(parsed)].sort((left, right) => left - right);
  return uniqueSorted.length ? uniqueSorted : [0.5, 0.75, 1, 1.25, 1.5, 2];
}

function resolveManagedVideoDefaultSpeed(video, shell, speeds) {
  const fallback = speeds.includes(1) ? 1 : (speeds[0] || 1);
  const candidate = normalizeManagedVideoPlaybackSpeed(
    video.getAttribute("data-rx-video-default-speed")
    || shell.getAttribute("data-rx-video-default-speed")
  );
  if (!candidate) {
    return fallback;
  }
  if (speeds.includes(candidate)) {
    return candidate;
  }
  let nearest = speeds[0] || candidate;
  let nearestDelta = Math.abs(nearest - candidate);
  for (const speed of speeds) {
    const delta = Math.abs(speed - candidate);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function resolveNearestManagedVideoSpeed(value, speeds) {
  const normalized = normalizeManagedVideoPlaybackSpeed(value);
  if (!normalized) {
    return speeds[0] || 1;
  }
  if (speeds.includes(normalized)) {
    return normalized;
  }
  let nearest = speeds[0] || normalized;
  let nearestDelta = Math.abs(nearest - normalized);
  for (const speed of speeds) {
    const delta = Math.abs(speed - normalized);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function formatManagedVideoPlaybackRateLabel(value) {
  const normalized = normalizeManagedVideoPlaybackSpeed(value) || 1;
  const text = Number.isInteger(normalized) ? String(Math.trunc(normalized)) : String(normalized);
  return text + "x";
}

function managedVideoSpeedStorageKey(shell, video) {
  const explicit = shell?.getAttribute?.("data-rx-video-persist-speed-key")
    || video?.getAttribute?.("data-rx-video-persist-speed-key");
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }
  return "resux:video:playback-speed";
}

function readPersistedManagedVideoPlaybackSpeed(shell, video) {
  if (shell?.getAttribute?.("data-rx-video-persist-speed") !== "true" || typeof localStorage === "undefined") {
    return 0;
  }
  try {
    return normalizeManagedVideoPlaybackSpeed(localStorage.getItem(managedVideoSpeedStorageKey(shell, video))) || 0;
  } catch {
    return 0;
  }
}

function persistManagedVideoPlaybackSpeed(shell, video, speed) {
  if (shell?.getAttribute?.("data-rx-video-persist-speed") !== "true" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(managedVideoSpeedStorageKey(shell, video), String(speed));
  } catch {}
}

function applyManagedVideoPlaybackSpeed(video, shell, speed) {
  const normalized = normalizeManagedVideoPlaybackSpeed(speed);
  if (!normalized || !video) {
    return 0;
  }
  video.playbackRate = normalized;
  if (Number.isFinite(video.defaultPlaybackRate)) {
    video.defaultPlaybackRate = normalized;
  }
  if (shell && shell.setAttribute) {
    shell.setAttribute("data-rx-video-active-speed", String(normalized));
  }
  video.setAttribute("data-rx-video-active-speed", String(normalized));
  persistManagedVideoPlaybackSpeed(shell, video, normalized);
  return normalized;
}

function ensureManagedVideoPlaybackSpeed(video, shell) {
  const speeds = readManagedVideoPlaybackSpeeds(shell);
  const current = normalizeManagedVideoPlaybackSpeed(video.playbackRate);
  if (video.getAttribute("data-rx-video-speed-initialized") !== "true") {
    const persisted = readPersistedManagedVideoPlaybackSpeed(shell, video);
    const initial = persisted
      ? resolveNearestManagedVideoSpeed(persisted, speeds)
      : resolveManagedVideoDefaultSpeed(video, shell, speeds);
    video.setAttribute("data-rx-video-speed-initialized", "true");
    return applyManagedVideoPlaybackSpeed(video, shell, initial);
  }
  if (current && speeds.some((speed) => Math.abs(speed - current) < 0.001)) {
    if (shell && shell.setAttribute) {
      shell.setAttribute("data-rx-video-active-speed", String(current));
    }
    video.setAttribute("data-rx-video-active-speed", String(current));
    return current;
  }
  const next = current
    ? resolveNearestManagedVideoSpeed(current, speeds)
    : resolveManagedVideoDefaultSpeed(video, shell, speeds);
  return applyManagedVideoPlaybackSpeed(video, shell, next);
}

function nextManagedVideoPlaybackSpeed(video, shell) {
  const speedControlEnabled = shell?.getAttribute?.("data-rx-video-speed-control") === "true";
  if (!speedControlEnabled) {
    return 0;
  }
  const speeds = readManagedVideoPlaybackSpeeds(shell);
  if (!speeds.length) {
    return 0;
  }
  const current = ensureManagedVideoPlaybackSpeed(video, shell);
  if (!current) {
    return speeds[0];
  }
  const index = speeds.findIndex((speed) => Math.abs(speed - current) < 0.001);
  const nextIndex = index >= 0 ? (index + 1) % speeds.length : 0;
  return speeds[nextIndex];
}

function normalizeManagedVideoQualityId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return undefined;
  }
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || undefined;
}

function parseManagedVideoQualityOptions(shell) {
  const raw = shell?.getAttribute?.("data-rx-video-qualities") || "";
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const resolved = [];
    const seenIds = new Set();
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        continue;
      }
      const id = normalizeManagedVideoQualityId(entry.id);
      if (!id || seenIds.has(id)) {
        continue;
      }
      const sources = Array.isArray(entry.sources)
        ? entry.sources
          .filter((item) => item && typeof item === "object" && !Array.isArray(item))
          .map((item) => ({
            src: typeof item.src === "string" ? item.src.trim() : "",
            type: typeof item.type === "string" ? item.type.trim() : ""
          }))
          .filter((item) => item.src.length > 0)
        : [];
      if (!sources.length) {
        continue;
      }
      seenIds.add(id);
      resolved.push({
        id,
        label: typeof entry.label === "string" && entry.label.trim().length > 0
          ? entry.label.trim()
          : id.toUpperCase(),
        sources
      });
    }
    return resolved;
  } catch {
    return [];
  }
}

function resolveManagedVideoDefaultQualityId(shell, options) {
  const configured = normalizeManagedVideoQualityId(shell?.getAttribute?.("data-rx-video-default-quality"));
  if (configured && options.some((entry) => entry.id === configured)) {
    return configured;
  }
  return options[0]?.id;
}

function signatureManagedVideoSources(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map((entry) => {
      const type = entry?.type ? String(entry.type).trim() : "";
      return String(entry?.src || "") + (type ? "|" + type : "");
    })
    .join("||");
}

function applyManagedVideoLazyQualitySources(video, sources) {
  if (!video || !Array.isArray(sources) || sources.length === 0) {
    return;
  }
  const primary = sources[0]?.src || "";
  if (primary) {
    video.setAttribute("data-rx-lazy-src", primary);
    video.setAttribute("data-src", primary);
  }
  const sourceNodes = video.querySelectorAll ? Array.from(video.querySelectorAll("source")) : [];
  const ownerDocument = video.ownerDocument;
  for (let index = sourceNodes.length; index < sources.length; index++) {
    if (!ownerDocument || !ownerDocument.createElement) {
      break;
    }
    const node = ownerDocument.createElement("source");
    video.appendChild(node);
    sourceNodes.push(node);
  }
  for (let index = 0; index < sourceNodes.length; index++) {
    const node = sourceNodes[index];
    const source = sources[index];
    if (!source) {
      node.remove();
      continue;
    }
    node.removeAttribute("src");
    node.removeAttribute("data-rx-failed-src");
    node.setAttribute("data-rx-lazy-src", source.src);
    node.setAttribute("data-src", source.src);
    if (source.type) {
      node.setAttribute("type", source.type);
    } else {
      node.removeAttribute("type");
    }
  }
}

function applyManagedVideoQuality(video, shell, qualityId, options = {}) {
  if (!video || !shell) {
    return false;
  }
  const qualityOptions = parseManagedVideoQualityOptions(shell);
  if (!qualityOptions.length) {
    return false;
  }
  const normalizedId = normalizeManagedVideoQualityId(qualityId);
  const fallbackId = resolveManagedVideoDefaultQualityId(shell, qualityOptions);
  const target = qualityOptions.find((entry) => entry.id === normalizedId)
    || qualityOptions.find((entry) => entry.id === fallbackId)
    || qualityOptions[0];
  if (!target || !Array.isArray(target.sources) || target.sources.length === 0) {
    return false;
  }

  const targetId = target.id;
  const targetSignature = signatureManagedVideoSources(target.sources);
  const currentSignature = shell.getAttribute("data-rx-video-active-source-signature") || "";
  const previousQualityId = normalizeManagedVideoQualityId(
    video.getAttribute("data-rx-video-active-quality")
    || shell.getAttribute("data-rx-video-active-quality"),
  );
  const isLazyPending = video.getAttribute("data-rx-lazy-video") === "true"
    && video.getAttribute("data-rx-lazy-ready") !== "true";

  shell.setAttribute("data-rx-video-active-quality", targetId);
  video.setAttribute("data-rx-video-active-quality", targetId);
  if (options.qualitySelect && options.qualitySelect.value !== targetId) {
    options.qualitySelect.value = targetId;
  }

  if (isLazyPending) {
    shell.setAttribute("data-rx-video-active-source-signature", targetSignature);
    video.setAttribute("data-rx-video-active-source-signature", targetSignature);
    applyManagedVideoLazyQualitySources(video, target.sources);
    return true;
  }

  if (targetSignature === currentSignature) {
    return false;
  }
  const failedQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-failed-quality"));
  if (failedQuality && failedQuality === targetId && video.getAttribute("data-resux-error-handled") === "true") {
    return false;
  }

  shell.setAttribute("data-rx-video-active-source-signature", targetSignature);
  video.setAttribute("data-rx-video-active-source-signature", targetSignature);
  video.setAttribute("data-rx-video-active-quality", targetId);
  video.removeAttribute("data-resux-error");
  video.removeAttribute("data-rx-error");
  video.removeAttribute("data-resux-error-handled");
  video.removeAttribute("data-rx-video-failed-quality");
  video.removeAttribute("data-rx-load-called");
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  video.removeAttribute("src");

  const sourceNodes = video.querySelectorAll ? Array.from(video.querySelectorAll("source")) : [];
  const ownerDocument = video.ownerDocument;
  for (let index = sourceNodes.length; index < target.sources.length; index++) {
    if (!ownerDocument || !ownerDocument.createElement) {
      break;
    }
    const node = ownerDocument.createElement("source");
    video.appendChild(node);
    sourceNodes.push(node);
  }

  for (let index = 0; index < sourceNodes.length; index++) {
    const node = sourceNodes[index];
    const source = target.sources[index];
    if (!source) {
      node.remove();
      continue;
    }
    node.setAttribute("src", source.src);
    node.removeAttribute("data-rx-lazy-src");
    node.removeAttribute("data-src");
    node.removeAttribute("data-rx-failed-src");
    if (source.type) {
      node.setAttribute("type", source.type);
    } else {
      node.removeAttribute("type");
    }
  }

  const preservePlayback = options.preservePlayback !== false;
  const wasPlaying = preservePlayback && !video.paused;
  const previousTime = preservePlayback && Number.isFinite(video.currentTime) && video.currentTime > 0
    ? Number(video.currentTime)
    : 0;
  const previousPlaybackRate = preservePlayback && Number.isFinite(video.playbackRate) && video.playbackRate > 0
    ? Number(video.playbackRate)
    : 0;
  const previousVolume = preservePlayback && Number.isFinite(video.volume)
    ? Number(video.volume)
    : undefined;
  const previousMuted = preservePlayback ? Boolean(video.muted) : undefined;

  video.setAttribute("data-rx-video-pending-quality", targetId);
  if (previousQualityId && previousQualityId !== targetId) {
    video.setAttribute("data-rx-video-previous-quality", previousQualityId);
  } else {
    video.removeAttribute("data-rx-video-previous-quality");
  }

  video.setAttribute("data-resux-loading", "true");
  video.setAttribute("data-resux-video-loading", "true");
  video.setAttribute("data-resux-video", "loading");
  video.setAttribute("data-rx-video-loading-src", target.sources[0].src);
  const restorePlayback = () => {
    if (previousPlaybackRate > 0) {
      video.playbackRate = previousPlaybackRate;
      if (Number.isFinite(video.defaultPlaybackRate)) {
        video.defaultPlaybackRate = previousPlaybackRate;
      }
    }
    if (previousVolume !== undefined) {
      video.volume = Math.min(1, Math.max(0, previousVolume));
    }
    if (previousMuted !== undefined) {
      video.muted = previousMuted;
    }
    if (previousTime > 0 && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.min(video.duration, Math.max(0, previousTime));
    }
    if (wasPlaying) {
      attemptManagedVideoPlay(video);
    }
  };
  if (previousTime > 0 || wasPlaying) {
    video.addEventListener("loadedmetadata", restorePlayback, { once: true });
    video.addEventListener("canplay", restorePlayback, { once: true });
  }
  if (options.triggerLoad === false) {
    return true;
  }
  if (typeof video.load === "function") {
    try {
      video.load();
    } catch {
      // Keep runtime resilient on older browsers.
    }
  }
  return true;
}

function syncManagedVideoQualityControl(shell, video, qualitySelect) {
  if (!qualitySelect || !shell || !video) {
    return;
  }
  const qualityControlEnabled = shell.getAttribute("data-rx-video-quality-control") === "true";
  const options = qualityControlEnabled ? parseManagedVideoQualityOptions(shell) : [];
  const hasQualityOptions = qualityControlEnabled && options.length > 0;
  qualitySelect.hidden = !hasQualityOptions;
  if (!hasQualityOptions) {
    return;
  }
  const knownValues = new Set(Array.from(qualitySelect.options).map((entry) => entry.value));
  if (knownValues.size !== options.length || options.some((entry) => !knownValues.has(entry.id))) {
    qualitySelect.innerHTML = options
      .map((entry) => '<option value="' + escapeAttribute(entry.id) + '">' + escapeHtml(entry.label) + '</option>')
      .join("");
  }
  const active = normalizeManagedVideoQualityId(
    video.getAttribute("data-rx-video-active-quality")
    || shell.getAttribute("data-rx-video-active-quality")
    || resolveManagedVideoDefaultQualityId(shell, options)
  );
  if (active && qualitySelect.value !== active) {
    qualitySelect.value = active;
  }
}

function dispatchManagedEvent(target, name, detail = {}) {
  if (!target || typeof target.dispatchEvent !== "function") {
    return;
  }
  const view = target.ownerDocument?.defaultView ?? (typeof window !== "undefined" ? window : undefined);
  const CustomEventCtor = view && typeof view.CustomEvent === "function"
    ? view.CustomEvent
    : null;
  if (!CustomEventCtor) {
    return;
  }
  target.dispatchEvent(new CustomEventCtor(name, { bubbles: true, detail }));
}

function finalizeManagedImageReady(target) {
  if (!target) {
    return;
  }
  if (target.getAttribute("data-rx-lazy-pending") === "true") {
    target.removeAttribute("data-rx-lazy-pending");
    dispatchManagedEvent(target, "lazy-load-complete");
  }
  target.setAttribute("data-resux-loaded", "true");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-rx-image-decode-pending");
  target.setAttribute("data-resux-img", "loaded");
  clearManagedPlaceholderState(target);
}

function handleManagedMediaLoad(event) {
  const target = event && event.target;
  if (!target || !target.tagName) {
    return;
  }
  const tag = String(target.tagName).toLowerCase();
  if (tag !== "img") {
    return;
  }
  if (target.getAttribute("data-rx-lazy-image") === "true" && target.getAttribute("data-rx-lazy-ready") !== "true") {
    return;
  }
  if (target.getAttribute("data-rx-image-decode-pending") === "true") {
    return;
  }
  if (typeof target.decode === "function") {
    target.setAttribute("data-rx-image-decode-pending", "true");
    let decoded = false;
    const timeout = setTimeout(() => {
      if (!decoded) {
        finalizeManagedImageReady(target);
      }
    }, 250);
    target.decode()
      .then(() => {
        decoded = true;
        clearTimeout(timeout);
        finalizeManagedImageReady(target);
      })
      .catch(() => {
        decoded = true;
        clearTimeout(timeout);
        finalizeManagedImageReady(target);
      });
    return;
  }
  finalizeManagedImageReady(target);
}

function handleManagedVideoReady(event) {
  const target = event && event.target;
  if (!target || !target.tagName || String(target.tagName).toLowerCase() !== "video") {
    return;
  }

  ensureManagedVideoElementDefaultSpeed(target);

  if ((event.type === "loadedmetadata" || event.type === "canplay") && shouldAutoplayManagedVideo(target)) {
    attemptManagedVideoPlay(target);
  }
  if (event.type !== "loadedmetadata" && event.type !== "loadeddata" && event.type !== "canplay") {
    return;
  }
  if (target.getAttribute("data-rx-lazy-pending") === "true") {
    target.removeAttribute("data-rx-lazy-pending");
    dispatchManagedEvent(target, "lazy-load-complete");
  }
  target.setAttribute("data-resux-loaded", "true");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-resux-video-loading");
  target.removeAttribute("data-rx-video-loading-src");
  target.removeAttribute("data-rx-video-pending-quality");
  target.removeAttribute("data-rx-video-previous-quality");
  logManagedMediaDebug("video-ready", {
    type: event.type,
    src: getCurrentVideoUrl(target)
  });
  clearManagedPlaceholderState(target);
  if (target.getAttribute("data-rx-placeholder-src")) {
    const realPoster = target.getAttribute("data-rx-poster");
    if (realPoster) {
      target.setAttribute("poster", realPoster);
    } else {
      target.removeAttribute("poster");
    }
  }
  target.setAttribute("data-resux-video", resolveManagedVideoState(target));
}

function handleManagedVideoPlaybackState(event) {
  const target = event && event.target;
  if (!target || !target.tagName || String(target.tagName).toLowerCase() !== "video") {
    return;
  }
  target.setAttribute("data-resux-video", resolveManagedVideoState(target));
}

function handleManagedMediaError(event) {
  const target = event && event.target;
  if (!target || !target.tagName) {
    return;
  }
  const delegatedErrorTarget = target.closest
    ? target.closest("[data-rx-on-error]")
    : null;
  if (!delegatedErrorTarget) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    } else if (typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
  }
  const tag = String(target.tagName).toLowerCase();
  try {
    if (tag === "img") {
      handleManagedImageError(target);
      return;
    }

    if (tag === "source") {
      const parentVideo = target.parentElement && String(target.parentElement.tagName || "").toLowerCase() === "video"
        ? target.parentElement
        : null;
      if (parentVideo) {
        markFailedMediaSource(parentVideo, target.getAttribute("src") || target.getAttribute("data-rx-lazy-src") || "");
      }
      return;
    }

    if (tag === "video") {
      handleManagedVideoError(target);
    }
  } catch {
    // Never allow media load failures to cascade into app-level runtime failures.
  }
}

function handleManagedImageError(target) {
  if (!isManagedMediaConnected(target)) {
    return;
  }
  if (target.getAttribute("data-rx-lazy-image") === "true" && target.getAttribute("data-rx-lazy-ready") !== "true") {
    return;
  }

  unobserveLazyImage(target);
  const failedSrc = getCurrentMediaUrl(target) || target.getAttribute("data-rx-lazy-src") || "";
  markFailedMediaSource(target, failedSrc);
  target.setAttribute("data-resux-revealed", "true");
  target.setAttribute("data-resux-error", "true");
  target.setAttribute("data-rx-error", "true");
  target.setAttribute("data-resux-img", "error");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-rx-image-decode-pending");
  disablePictureSources(target);

  const fallbackSrc = target.getAttribute("data-rx-fallback-src");
  if (target.getAttribute("data-resux-error-handled") === "true") {
    if (
      target.getAttribute("data-rx-fallback-active") === "true"
      && fallbackSrc
      && mediaUrlsEqual(failedSrc, fallbackSrc, target)
    ) {
      showManagedImagePlaceholder(target, failedSrc);
    }
    return;
  }

  if (fallbackSrc && shouldAssignMediaSource(target, fallbackSrc)) {
    markMediaErrorHandled(target);
    target.setAttribute("data-rx-fallback-used", "true");
    target.setAttribute("data-rx-fallback-active", "true");
    target.setAttribute("data-resux-fallback-active", "true");
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
    target.removeAttribute("data-rx-lazy-srcset");
    target.removeAttribute("data-rx-lazy-sizes");
    target.setAttribute("src", fallbackSrc);
    return;
  }

  markMediaErrorHandled(target);
  showManagedImagePlaceholder(target, failedSrc);
}

function applyKnownImageFailure(target, failedSrc) {
  markFailedMediaSource(target, failedSrc);
  target.setAttribute("data-resux-revealed", "true");
  target.setAttribute("data-resux-error", "true");
  target.setAttribute("data-rx-error", "true");
  target.setAttribute("data-resux-img", "error");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-rx-image-decode-pending");
  disablePictureSources(target);
  const fallbackSrc = target.getAttribute("data-rx-fallback-src");
  markMediaErrorHandled(target);
  if (fallbackSrc && shouldAssignMediaSource(target, fallbackSrc)) {
    target.setAttribute("data-rx-fallback-used", "true");
    target.setAttribute("data-rx-fallback-active", "true");
    target.setAttribute("data-resux-fallback-active", "true");
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
    target.setAttribute("src", fallbackSrc);
    return;
  }
  showManagedImagePlaceholder(target, failedSrc);
}

function handleManagedVideoError(video) {
  if (!isManagedMediaConnected(video)) {
    return;
  }

  const failedSrc = getCurrentVideoUrl(video);
  const pendingQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-pending-quality"));
  const previousQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-previous-quality"));
  logManagedMediaDebug("video-error", { failedSrc });
  markFailedMediaSource(video, failedSrc);
  if (pendingQuality) {
    video.setAttribute("data-rx-video-failed-quality", pendingQuality);
  }
  if (pendingQuality && previousQuality && pendingQuality !== previousQuality) {
    const shell = video.closest ? video.closest('[data-rx-video-shell="true"]') : null;
    if (shell) {
      const qualitySelect = shell.querySelector ? shell.querySelector("[data-rx-video-quality]") : null;
      const reverted = applyManagedVideoQuality(video, shell, previousQuality, {
        triggerLoad: true,
        preservePlayback: true,
        qualitySelect,
      });
      if (reverted) {
        showManagedVideoFeedback(shell, previousQuality.toUpperCase(), "quality");
        return;
      }
    }
  }
  video.setAttribute("data-resux-revealed", "true");
  video.setAttribute("data-resux-error", "true");
  video.setAttribute("data-rx-error", "true");
  video.setAttribute("data-resux-video", "error");
  video.removeAttribute("data-resux-loading");
  video.removeAttribute("data-resux-video-loading");
  video.removeAttribute("data-rx-video-loading-src");
  video.removeAttribute("data-rx-video-pending-quality");
  video.removeAttribute("data-rx-video-previous-quality");
  video.removeAttribute("data-rx-lazy-video");
  video.setAttribute("data-rx-lazy-ready", "true");

  unobserveLazyVideo(video);
  if (video.getAttribute("data-resux-error-handled") === "true") {
    return;
  }

  markMediaErrorHandled(video);
  clearManagedVideoSources(video);
  applyVideoPosterFallback(video, failedSrc);
}

function applyKnownVideoFailure(video, failedSrc) {
  logManagedMediaDebug("video-known-failure", { failedSrc });
  markFailedMediaSource(video, failedSrc);
  const pendingQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-pending-quality"));
  if (pendingQuality) {
    video.setAttribute("data-rx-video-failed-quality", pendingQuality);
  }
  video.setAttribute("data-resux-revealed", "true");
  video.setAttribute("data-resux-error", "true");
  video.setAttribute("data-rx-error", "true");
  video.setAttribute("data-resux-video", "error");
  video.removeAttribute("data-resux-loading");
  video.removeAttribute("data-resux-video-loading");
  video.removeAttribute("data-rx-video-loading-src");
  video.removeAttribute("data-rx-video-pending-quality");
  video.removeAttribute("data-rx-video-previous-quality");
  video.removeAttribute("data-rx-lazy-video");
  video.setAttribute("data-rx-lazy-ready", "true");
  markMediaErrorHandled(video);
  clearManagedVideoSources(video);
  applyVideoPosterFallback(video, failedSrc);
}

function applyVideoPosterFallback(video, failedSrc) {
  const fallbackPoster = video.getAttribute("data-rx-fallback-poster");
  if (fallbackPoster && !mediaUrlsEqual(video.getAttribute("poster") || "", fallbackPoster, video)) {
    video.setAttribute("poster", fallbackPoster);
    video.setAttribute("data-rx-fallback-active", "true");
    video.setAttribute("data-resux-fallback-active", "true");
    return;
  }

  const placeholder = video.getAttribute("data-rx-placeholder-src");
  if (placeholder && !mediaUrlsEqual(placeholder, failedSrc, video)) {
    video.setAttribute("poster", placeholder);
    video.setAttribute("data-rx-placeholder-active", "true");
    video.setAttribute("data-resux-placeholder-active", "true");
  }
}

function showManagedImagePlaceholder(target, failedSrc) {
  const placeholder = target.getAttribute("data-rx-placeholder-src");
  if (placeholder && shouldAssignMediaSource(target, placeholder) && !mediaUrlsEqual(placeholder, failedSrc, target)) {
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
    target.setAttribute("src", placeholder);
    target.setAttribute("data-rx-placeholder-active", "true");
    target.setAttribute("data-resux-placeholder-active", "true");
    return;
  }
  target.setAttribute("data-rx-placeholder-active", "true");
  target.setAttribute("data-resux-placeholder-active", "true");
}

function disablePictureSources(image) {
  const picture = image.closest ? image.closest("picture") : null;
  if (!picture || !picture.querySelectorAll) {
    return;
  }
  picture.setAttribute("data-resux-error", "true");
  picture.querySelectorAll("source").forEach((source) => {
    const srcset = source.getAttribute("srcset") || source.getAttribute("data-rx-lazy-srcset");
    if (srcset) {
      source.setAttribute("data-rx-failed-srcset", srcset);
    }
    source.removeAttribute("srcset");
    source.removeAttribute("sizes");
    source.removeAttribute("data-rx-lazy-srcset");
    source.removeAttribute("data-rx-lazy-sizes");
    source.removeAttribute("data-srcset");
  });
}

function clearManagedVideoSources(video) {
  if (typeof video.pause === "function") {
    try {
      video.pause();
    } catch {}
  }
  video.removeAttribute("src");
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  if (video.querySelectorAll) {
    video.querySelectorAll("source").forEach((source) => {
      const src = source.getAttribute("src") || source.getAttribute("data-rx-lazy-src");
      if (src) {
        source.setAttribute("data-rx-failed-src", src);
      }
      source.removeAttribute("src");
      source.removeAttribute("data-rx-lazy-src");
      source.removeAttribute("data-src");
    });
  }
}

function clearManagedPlaceholderState(target) {
  clearManagedPlaceholderStyle(target);
  const placeholderClass = target.getAttribute("data-rx-placeholder-class");
  if (placeholderClass && target.classList) {
    for (const token of placeholderClass.split(/\s+/).filter(Boolean)) {
      target.classList.remove(token);
    }
  }
  target.removeAttribute("data-rx-placeholder-active");
  target.removeAttribute("data-resux-placeholder-active");
}

function clearManagedPlaceholderStyle(target) {
  const style = target && target.getAttribute ? target.getAttribute("style") : "";
  if (!style) {
    return;
  }
  const placeholderStyle = target.getAttribute("data-rx-placeholder-style") || "";
  const nextStyle = style
    .replace(/background-image\s*:[^;]+;?/gi, "")
    .replace(/background-size\s*:[^;]+;?/gi, "")
    .replace(/background-position\s*:[^;]+;?/gi, "")
    .replace(/background-repeat\s*:[^;]+;?/gi, "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry && !placeholderStyle.split(";").map((item) => item.trim()).filter(Boolean).includes(entry))
    .join("; ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/;+$/g, "");
  if (!nextStyle) {
    target.removeAttribute("style");
    return;
  }
  target.setAttribute("style", nextStyle);
}

function shouldAssignMediaSource(target, nextSrc) {
  if (!nextSrc || mediaSourceWasFailed(target, nextSrc)) {
    return false;
  }
  const current = getCurrentMediaUrl(target);
  if (current && mediaUrlsEqual(current, nextSrc, target)) {
    return false;
  }
  const attrSrc = target.getAttribute ? target.getAttribute("src") : "";
  if (attrSrc && mediaUrlsEqual(attrSrc, nextSrc, target)) {
    return false;
  }
  return true;
}

function getCurrentMediaUrl(target) {
  return String(target?.currentSrc || target?.getAttribute?.("src") || "");
}

function getCurrentVideoUrl(video) {
  const direct = String(video?.currentSrc || video?.getAttribute?.("src") || "");
  if (direct) {
    return direct;
  }
  const source = video?.querySelector ? video.querySelector("source[src], source[data-rx-lazy-src]") : null;
  return String(source?.getAttribute("src") || source?.getAttribute("data-rx-lazy-src") || "");
}

function markFailedMediaSource(target, src) {
  if (!target || !src) {
    return;
  }
  target.setAttribute("data-rx-failed-src", src);
  target.setAttribute("data-resux-failed-src", src);
  for (const candidate of mediaSourceCandidates(src)) {
    const normalized = normalizeMediaUrl(candidate, target);
    if (normalized) {
      failedMediaSources.add(normalized);
    }
  }
}

function markMediaErrorHandled(target) {
  target.setAttribute("data-rx-error-handled", "true");
  target.setAttribute("data-resux-error-handled", "true");
}

function mediaSourceWasFailed(target, src) {
  const failed = target?.getAttribute?.("data-rx-failed-src") || target?.getAttribute?.("data-resux-failed-src") || "";
  if (failed && src && mediaUrlsEqual(failed, src, target)) {
    return true;
  }
  return mediaSourceCandidates(src).some((candidate) => {
    const normalized = normalizeMediaUrl(candidate, target);
    return Boolean(normalized && failedMediaSources.has(normalized));
  });
}

function mediaSourceCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return [];
  }
  if (!raw.includes(",")) {
    return [raw.split(/\s+/)[0]].filter(Boolean);
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function mediaUrlsEqual(left, right, target) {
  const normalizedLeft = normalizeMediaUrl(left, target);
  const normalizedRight = normalizeMediaUrl(right, target);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function normalizeMediaUrl(value, target) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const view = target?.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
    const base = view?.location?.href || (typeof location !== "undefined" ? location.href : "http://localhost/");
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
}

function isManagedMediaConnected(target) {
  if (!target) {
    return false;
  }
  if (target.isConnected === true) {
    return true;
  }
  const root = target.ownerDocument && target.ownerDocument.documentElement;
  return Boolean(root && root.contains && root.contains(target));
}

function unobserveLazyImage(image) {
  const observer = lazyImageObserverByElement.get(image);
  if (observer) {
    observer.unobserve(image);
  }
  observedLazyImages.delete(image);
  lazyImageObserverByElement.delete(image);
  image.removeAttribute("data-rx-lazy-observed");
  image.removeAttribute("data-resux-observed");
}

function unobserveLazyVideo(video) {
  const observer = lazyVideoObserverByElement.get(video);
  if (observer) {
    observer.unobserve(video);
  }
  observedLazyVideos.delete(video);
  lazyVideoObserverByElement.delete(video);
  video.removeAttribute("data-rx-lazy-observed");
  video.removeAttribute("data-resux-observed");
}

function cleanupDetachedLazyMedia() {
  for (const image of Array.from(observedLazyImages)) {
    if (!isManagedMediaConnected(image)) {
      unobserveLazyImage(image);
    }
  }
  for (const video of Array.from(observedLazyVideos)) {
    if (!isManagedMediaConnected(video)) {
      unobserveLazyVideo(video);
    }
  }
  for (const shell of Array.from(managedVideoControlShells)) {
    if (!shell || !shell.isConnected) {
      const cleanup = managedVideoControlCleanupByShell.get(shell);
      if (typeof cleanup === "function") {
        try {
          cleanup();
        } catch {}
      }
      managedVideoControlCleanupByShell.delete(shell);
      managedVideoControlShells.delete(shell);
      managedVideoControlSyncByShell.delete(shell);
    }
  }
}

function dispatchPageReadyEvent(root) {
  const target = root && typeof root.dispatchEvent === "function" ? root : document;
  dispatchManagedEvent(target, "resux:page-ready", { root });
  dispatchManagedEvent(target, "resux:page:finish", { root });
}

function createAsyncDataResource(value, pending = false, error = null) {
  const data = ref(value);
  let completion = Promise.resolve();
  const resource = {
    data,
    value: data,
    pending: ref(pending),
    error: ref(error),
    then(onfulfilled, onrejected) {
      return completion.then(() => {
        const resolved = {
          data: resource.data,
          value: resource.value,
          pending: resource.pending,
          error: resource.error
        };
        return onfulfilled ? onfulfilled(resolved) : resolved;
      }, onrejected);
    },
    setCompletion(nextCompletion) {
      completion = nextCompletion;
    }
  };

  return resource;
}

async function settleAsyncDataResource(resource, handler, key, signal) {
  try {
    const value = await handler({ signal });
    assertJsonSerializable(value, 'useAsyncData("' + key + '")');
    resource.data.value = value;
    resource.error.value = null;
  } catch (error) {
    resource.data.value = undefined;
    resource.error.value = normalizeAsyncDataError(error);
  } finally {
    resource.pending.value = false;
  }
}

function serializeAsyncData(refs) {
  const output = Object.create(null);
  for (const [key, ref] of Object.entries(refs)) {
    output[key] = {
      value: ref.data.value === undefined ? null : ref.data.value,
      pending: ref.pending.value,
      error: ref.error.value
    };
  }
  return output;
}

function setRouteLoading(active) {
  setRouteTransition(active ? "fetching" : "idle");
}

function setRouteTransition(state, options = {}) {
  const loader = getRouteTransitionIndicator();
  const root = document.getElementById("__resux");
  if (!loader) {
    return;
  }

  if (state === "start") {
    routeTransitionStartedAt = Date.now();
  }

  const config = readRouteTransitionConfig(loader);
  if (routeTransitionHideTimer) {
    clearTimeout(routeTransitionHideTimer);
    routeTransitionHideTimer = 0;
  }

  const progress = transitionProgress(state, options.progress, config.duration);
  const message = options.message ?? transitionMessage(state);
  updateRouteTransitionUi(loader, state, progress, message);

  const activeState = state === "start" || state === "fetching" || state === "swapping";
  if (activeState) {
    showRouteTransition(loader, config.throttle, false);
    startRouteTransitionProgressTimer(loader, config.duration);
  } else {
    stopRouteTransitionProgressTimer();
  }

  if (root) {
    if (state === "idle" || state === "complete" || state === "error") {
      root.removeAttribute("aria-busy");
      root.removeAttribute("data-route-transition");
    } else {
      root.setAttribute("aria-busy", "true");
      root.setAttribute("data-route-transition", "loading");
    }
  }

  dispatchRouteTransition(state, options);

  if (state === "idle" || state === "complete" || state === "error") {
    const hideDelay = state === "complete" ? 160 : state === "error" ? 640 : 0;
    routeTransitionHideTimer = setTimeout(() => {
      hideRouteTransition(loader);
    }, hideDelay);
  }
}

function getRouteTransitionIndicator() {
  if (routeTransitionIndicator && routeTransitionIndicator.isConnected) {
    return routeTransitionIndicator;
  }

  routeTransitionIndicator = document.querySelector("[data-rx-loading-indicator]");
  if (routeTransitionIndicator) {
    return routeTransitionIndicator;
  }

  const fallback = createFallbackRouteTransitionIndicator();
  routeTransitionIndicator = fallback;
  return fallback;
}

function createFallbackRouteTransitionIndicator() {
  if (!document.body) {
    return null;
  }

  const fallback = document.createElement("div");
  fallback.setAttribute("data-rx-loading-indicator", "true");
  fallback.setAttribute("hidden", "");
  fallback.setAttribute("data-state", "idle");
  fallback.setAttribute("aria-live", "polite");
  fallback.setAttribute("aria-busy", "false");
  fallback.setAttribute("data-duration", "2000");
  fallback.setAttribute("data-throttle", "200");
  fallback.setAttribute("style", "--resux-loader-height: 3px; --resux-loader-color: #2563eb; --resux-loader-error-color: #dc2626;");
  fallback.innerHTML = '<div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>';
  document.body.appendChild(fallback);
  return fallback;
}

function readRouteTransitionConfig(loader) {
  return {
    duration: readPositiveInt(loader?.dataset?.duration, 2000, 1),
    throttle: readPositiveInt(loader?.dataset?.throttle, 200, 0)
  };
}

function readPositiveInt(value, fallback, min) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

function showRouteTransition(loader, throttle, force) {
  if (!loader) {
    return;
  }
  if (routeTransitionShowTimer && !force) {
    return;
  }
  if (routeTransitionShowTimer) {
    clearTimeout(routeTransitionShowTimer);
    routeTransitionShowTimer = 0;
  }

  if (force || throttle <= 0 || routeTransitionVisible) {
    loader.hidden = false;
    routeTransitionVisible = true;
    return;
  }

  routeTransitionShowTimer = setTimeout(() => {
    loader.hidden = false;
    routeTransitionVisible = true;
    routeTransitionShowTimer = 0;
  }, throttle);
}

function hideRouteTransition(loader) {
  if (!loader) {
    return;
  }
  stopRouteTransitionProgressTimer();
  if (routeTransitionShowTimer) {
    clearTimeout(routeTransitionShowTimer);
    routeTransitionShowTimer = 0;
  }
  loader.hidden = true;
  routeTransitionVisible = false;
  updateRouteTransitionUi(loader, "idle", 0, "Idle");
}

function startRouteTransitionProgressTimer(loader, duration) {
  if (routeTransitionProgressTimer) {
    clearInterval(routeTransitionProgressTimer);
  }

  routeTransitionProgressTimer = setInterval(() => {
    if (!loader || loader.hidden) {
      return;
    }
    const state = loader.dataset?.state ?? "idle";
    if (state === "idle" || state === "complete" || state === "error") {
      return;
    }
    updateRouteTransitionUi(
      loader,
      state,
      transitionProgress(state, undefined, duration),
      transitionMessage(state),
    );
  }, 120);
}

function stopRouteTransitionProgressTimer() {
  if (!routeTransitionProgressTimer) {
    return;
  }
  clearInterval(routeTransitionProgressTimer);
  routeTransitionProgressTimer = 0;
}

function updateRouteTransitionUi(loader, state, progress, message) {
  if (!loader) {
    return;
  }

  loader.dataset.state = state;
  loader.style.setProperty("--resux-progress", progress + "%");
  loader.setAttribute("aria-busy", state === "idle" || state === "complete" || state === "error" ? "false" : "true");

  const progressbar = loader.querySelector("[role='progressbar']");
  if (progressbar) {
    progressbar.setAttribute("aria-valuenow", String(progress));
    progressbar.setAttribute("aria-valuetext", message);
  }
}

function transitionProgress(state, explicitProgress, duration = 2000) {
  if (typeof explicitProgress === "number") {
    return clampProgress(explicitProgress);
  }

  if (state === "idle") {
    return 0;
  }
  if (state === "complete" || state === "error") {
    return 100;
  }

  const elapsed = Math.max(0, Date.now() - routeTransitionStartedAt);
  const estimated = defaultEstimatedProgress(duration, elapsed);
  if (state === "start") {
    return Math.max(8, Math.min(32, estimated));
  }
  if (state === "fetching") {
    return Math.max(18, Math.min(88, estimated));
  }
  return Math.max(72, Math.min(97, estimated));
}

function defaultEstimatedProgress(duration, elapsed) {
  const safeDuration = Math.max(1, duration);
  const scaled = (elapsed / safeDuration) * 2;
  const estimated = (2 / Math.PI * 100) * Math.atan(scaled);
  return clampProgress(estimated);
}

function clampProgress(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function transitionMessage(state) {
  if (state === "start" || state === "fetching" || state === "swapping") return "Loading";
  if (state === "complete") return "Done";
  if (state === "error") return "Failed";
  return "Ready";
}

function dispatchRouteTransition(state, detail = {}) {
  if (typeof window === "undefined" || typeof window.CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new window.CustomEvent("resux:route-transition", {
    detail: {
      state,
      path: detail.path,
      message: detail.message ?? transitionMessage(state),
      progress: transitionProgress(state, detail.progress)
    }
  }));
}

function isManagedMediaDebugEnabled() {
  if (typeof window === "undefined" || typeof location === "undefined") {
    return false;
  }
  const hostname = String(location.hostname || "").toLowerCase();
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (!isLocalHost) {
    return false;
  }
  const explicitFlag = window.__RESUX_MEDIA_DEBUG__ === true;
  if (explicitFlag) {
    return true;
  }
  try {
    return window.localStorage?.getItem("resux:media-debug") === "1";
  } catch {
    return false;
  }
}

function logManagedMediaDebug(eventName, detail = {}) {
  if (!isManagedMediaDebugEnabled() || typeof console === "undefined" || typeof console.debug !== "function") {
    return;
  }
  console.debug("[resux:media]", eventName, detail);
}

function warnManagedMediaDebug(eventName, detail = {}) {
  if (!isManagedMediaDebugEnabled() || typeof console === "undefined" || typeof console.warn !== "function") {
    return;
  }
  console.warn("[resux:media]", eventName, detail);
}

function handleNavigationClick(event) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const anchor = event.target && event.target.closest
    ? event.target.closest("a[href]")
    : null;
  if (!anchor) {
    return false;
  }

  const actionTarget = event.target && event.target.closest
    ? event.target.closest("[data-rx-on-click]")
    : null;
  if (actionTarget && readEventModifiers(actionTarget, "click").includes("prevent")) {
    return false;
  }

  const resolution = resolveSameOriginAnchorTarget(anchor);
  if (!resolution.url) {
    logManagedMediaDebug("router-ignore", {
      reason: resolution.reason,
      href: anchor.getAttribute("href") || ""
    });
    return false;
  }
  const target = resolution.url;

  if (isManagedMediaAssetPath(target.pathname)) {
    if (shouldBlockManagedMediaLinkNavigation(anchor, event.target)) {
      warnManagedMediaDebug("router-block-media-navigation", { href: target.href });
      event.preventDefault();
      return true;
    }
    logManagedMediaDebug("router-ignore", {
      reason: "media-static-path",
      href: target.href
    });
    return false;
  }

  if (!isRouterManagedPagePath(target.pathname)) {
    logManagedMediaDebug("router-ignore", {
      reason: "non-page-route",
      href: target.href
    });
    return false;
  }

  if (shouldIgnoreNavigationTarget(event.target, anchor)) {
    logManagedMediaDebug("router-ignore", {
      reason: "ignored-event-target",
      href: target.href
    });
    return false;
  }

  const nextPath = target.pathname + target.search;
  const currentPath = location.pathname + location.search;
  if (nextPath === currentPath) {
    if (!target.hash || target.hash === location.hash) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  event.preventDefault();
  logManagedMediaDebug("router-navigation-start", {
    href: target.href,
    nextPath
  });
  void navigateTo(nextPath + target.hash);
  return true;
}

function shouldIgnoreNavigationTarget(eventTarget, anchor) {
  if (!eventTarget || !eventTarget.closest) {
    return false;
  }
  const ignoredTarget = eventTarget.closest(ROUTER_IGNORED_EVENT_TARGET_SELECTOR);
  if (!ignoredTarget) {
    return false;
  }
  return ignoredTarget !== anchor;
}

function shouldBlockManagedMediaLinkNavigation(anchor, eventTarget) {
  if (!anchor || !eventTarget || typeof location === "undefined") {
    return false;
  }
  if (anchor.getAttribute("data-rx-allow-media-navigation") === "true") {
    return false;
  }
  const mediaNode = eventTarget.closest
    ? eventTarget.closest(MEDIA_NAVIGATION_BLOCK_TARGET_SELECTOR)
    : null;
  if (!mediaNode || mediaNode === anchor || !anchor.contains(mediaNode)) {
    return false;
  }
  const target = resolveSameOriginAnchorTarget(anchor);
  return Boolean(target.url && isManagedMediaAssetPath(target.url.pathname));
}

function resolveSameOriginAnchorTarget(anchor) {
  if (!anchor || typeof location === "undefined") {
    return { url: null, reason: "missing-anchor" };
  }
  if (anchor.target || anchor.hasAttribute("target")) {
    return { url: null, reason: "target-attr" };
  }
  if (anchor.hasAttribute("download")) {
    return { url: null, reason: "download-attr" };
  }
  const href = String(anchor.getAttribute("href") || "").trim();
  if (!href) {
    return { url: null, reason: "empty-href" };
  }
  if (href === "#" || href.startsWith("#")) {
    return { url: null, reason: "hash-only" };
  }
  if (MEDIA_URL_SCHEME_RE.test(href)) {
    return { url: null, reason: "scheme" };
  }
  let target;
  try {
    target = new URL(href, location.href);
  } catch {
    return { url: null, reason: "invalid-href" };
  }
  if (target.origin !== location.origin) {
    return { url: null, reason: "external-origin" };
  }
  return { url: target, reason: null };
}

function isManagedMediaAssetPath(pathname) {
  const normalized = String(pathname || "").toLowerCase();
  if (!normalized) {
    return false;
  }
  if (
    normalized.startsWith("/__resux/image")
    || normalized.startsWith("/__resux/video")
    || normalized.startsWith("/_resux/generated/images/")
    || normalized.startsWith("/_resux/generated/videos/")
    || normalized.startsWith("/media-test/videos/")
    || normalized.startsWith("/media-test/images/")
  ) {
    return true;
  }
  return MEDIA_STATIC_EXTENSION_RE.test(normalized);
}

async function navigateTo(target, options = {}) {
  const nextUrl = new URL(target, location.href);
  const routePath = normalizeRoutePayloadKey(nextUrl.pathname + nextUrl.search);
  if (!isRouterManagedPagePath(nextUrl.pathname)) {
    location.assign(nextUrl.href);
    return;
  }
  if (isManagedMediaAssetPath(nextUrl.pathname)) {
    warnManagedMediaDebug("router-navigation-blocked-media-path", {
      routePath,
      href: nextUrl.href
    });
    return;
  }
  const currentUrl = new URL(location.href);
  const currentRoutePath = currentUrl.pathname + currentUrl.search;
  if (!options.force && routePath === currentRoutePath && nextUrl.hash === currentUrl.hash) {
    return;
  }
  logManagedMediaDebug("router-navigation-start", {
    routePath,
    hash: nextUrl.hash,
    replace: options.replace === true
  });
  const transitionToken = ++routeTransitionToken;
  let completed = false;
  abortPendingAsyncData();
  setRouteTransition("start", { path: routePath });

  try {
    setRouteTransition("fetching", { path: routePath });
    const result = await loadRoute(routePath, {
      reason: "navigation",
      force: options.force === true
    });
    if (!ensureRoutePayloadBuildCompatibility(result)) {
      return;
    }
    if (transitionToken !== routeTransitionToken) {
      return;
    }
    if (result.redirect) {
      await navigateTo(result.redirect, { replace: true });
      return;
    }
    const nextPayload = result.payload;
    if (!nextPayload) {
      throw new Error("Route payload response is missing payload data.");
    }
    await ensureClientPlugins(nextPayload);
    if (transitionToken !== routeTransitionToken) {
      return;
    }
    const previousPayload = globalThis.__RESUX__;
    const middlewareResult = await runClientRouteMiddleware(
      nextPayload,
      previousPayload?.route ?? { path: "", params: {}, query: {} }
    );
    if (transitionToken !== routeTransitionToken) {
      return;
    }
    if (middlewareResult?.type === "redirect") {
      await navigateTo(middlewareResult.to, { replace: true });
      return;
    }
    if (middlewareResult?.type === "abort") {
      return;
    }

    const root = document.getElementById("__resux");
    if (!root) {
      throw new Error("Missing Resux root for client navigation.");
    }

    if (transitionToken !== routeTransitionToken) {
      return;
    }

    if (options.replace) {
      history.replaceState({ __resux: true, path: routePath }, "", nextUrl.href);
    } else {
      history.pushState({ __resux: true, path: routePath }, "", nextUrl.href);
    }

    await disposeClientEnhancements();
    setRouteTransition("swapping", { path: routePath });
    const preserved = replaceRouteHtml(root, result.html);
    globalThis.__RESUX__ = mergeClientGlobalState(
      mergePersistentLayoutPayload(previousPayload, nextPayload, preserved.scopeIds)
    );
    getClientResuxApp(globalThis.__RESUX__.route);
    applyHead(result.head);
    clearScopeCacheExcept(preserved.scopeIds);
    void resumePendingAsyncData();
    void mountVueIslands(preserved.root);
    activateDeferredLazyMedia(preserved.root);
    applyManagedVideoDefaultSpeeds(preserved.root);
    applyReducedMotionVideoPreference(preserved.root);
    initializeManagedVideoControls(preserved.root);
    registerDelegatedEventsFromDom(preserved.root);

    if (!options.preserveScroll && nextUrl.hash) {
      document.getElementById(nextUrl.hash.slice(1))?.scrollIntoView();
    } else if (!options.preserveScroll && typeof scrollTo === "function") {
      scrollTo(0, 0);
    }
    if (transitionToken === routeTransitionToken) {
      setRouteTransition("complete", { path: routePath });
      completed = true;
    }
  } catch (error) {
    setRouteTransition("error", { path: routePath });
    dispatchManagedEvent(document, "resux:navigation-error", {
      path: routePath,
      message: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (!completed && transitionToken === routeTransitionToken) {
      setRouteTransition("idle", { path: routePath });
    }
  }
}

function abortPendingAsyncData() {
  for (const controller of [...pendingAsyncDataControllers]) {
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
  }
  pendingAsyncDataControllers.clear();
}

function createClientRouter() {
  return {
    push(to) {
      return navigateTo(to);
    },
    replace(to) {
      return navigateTo(to, { replace: true });
    },
    back() {
      history.back();
    },
    forward() {
      history.forward();
    },
    go(delta) {
      history.go(delta);
    }
  };
}

function replaceRouteHtml(root, html) {
  const currentLayout = root.querySelector("[data-rx-layout]");
  const template = document.createElement("template");
  template.innerHTML = html;
  const nextLayout = template.content.querySelector("[data-rx-layout]");

  if (!currentLayout || !nextLayout || currentLayout.getAttribute("data-rx-layout") !== nextLayout.getAttribute("data-rx-layout")) {
    unmountVueIslands(root);
    root.innerHTML = html;
    return { root, scopeIds: new Set() };
  }

  const currentPage = currentLayout.querySelector("[data-rx-page]");
  const nextPage = nextLayout.querySelector("[data-rx-page]");
  if (!currentPage || !nextPage) {
    unmountVueIslands(root);
    root.innerHTML = html;
    return { root, scopeIds: new Set() };
  }

  const preservedScopeIds = collectScopeIds(currentLayout, currentPage);
  unmountVueIslands(currentPage);
  currentPage.innerHTML = nextPage.innerHTML;
  return { root: currentPage, scopeIds: preservedScopeIds };
}

function mergePersistentLayoutPayload(previousPayload, nextPayload, preservedScopeIds) {
  if (!nextPayload) {
    return nextPayload;
  }

  if (previousPayload && previousPayload.scopes && nextPayload.scopes) {
    for (const scopeId of preservedScopeIds) {
      if (previousPayload.scopes[scopeId]) {
        nextPayload.scopes[scopeId] = previousPayload.scopes[scopeId];
      }
    }
  }

  return nextPayload;
}

function clearScopeCacheExcept(preservedScopeIds) {
  for (const scopeId of scopeCache.keys()) {
    if (!preservedScopeIds.has(scopeId)) {
      scopeCache.delete(scopeId);
    }
  }
}

async function applyDevUpdate(payload = {}) {
  devImportRevision = Number(payload.revision ?? Date.now());
  invalidateAllRoutePayloads();
  await hotUpdateActiveScopes();
}

async function hotUpdateActiveScopes() {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules) {
    return;
  }

  await Promise.all([...scopeCache.entries()].map(async ([scopeId, scopeRecord]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      scopeCache.delete(scopeId);
      return;
    }

    const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision);
    const snapshot = {
      ...serializedScope,
      ...component.serialize(scopeRecord)
    };
    const nextScopeRecord = await component.createScope(snapshot, payload.route);
    scopeCache.set(scopeId, nextScopeRecord);
    const patches = component.render(nextScopeRecord);
    const serialized = component.serialize(nextScopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches);
  }));
}

function collectScopeIds(root, exclude) {
  const ids = new Set();

  for (const element of [root, ...Array.from(root.querySelectorAll ? root.querySelectorAll("*") : [])]) {
    if (exclude && (element === exclude || exclude.contains(element))) {
      continue;
    }
    collectScopeIdFromElement(element, ids);
  }
  return ids;
}

function collectScopeIdFromElement(element, ids) {
  for (const attribute of Array.from(element.attributes ?? [])) {
    const value = attribute.value;
    if (!value || !value.includes(":")) {
      continue;
    }
    const scopeId = value.split(":")[0];
    if (scopeId) {
      ids.add(scopeId);
    }
  }
}

async function mountVueIslands(root = document) {
  const payload = globalThis.__RESUX__;
  const islands = payload && payload.vueIslands ? payload.vueIslands : {};
  const elements = root.querySelectorAll ? root.querySelectorAll("[data-rx-vue-island]") : [];

  for (const el of elements) {
    if (mountedVueIslands.has(el)) {
      continue;
    }

    const name = el.getAttribute("data-rx-vue-island");
    const modulePath = name ? islands[name] : null;
    if (!name || !modulePath) {
      el.setAttribute("data-rx-vue-error", "missing");
      continue;
    }

    try {
      const props = JSON.parse(el.getAttribute("data-rx-vue-props") || "{}");
      const island = await import(/* @vite-ignore */ modulePath);
      const app = island.mount ? island.mount(el, props) : null;
      mountedVueIslands.set(el, app);
    } catch {
      el.setAttribute("data-rx-vue-error", "mount");
    }
  }
}

function unmountVueIslands(root) {
  for (const [el, app] of mountedVueIslands.entries()) {
    if (root && root !== el && !(root.contains && root.contains(el))) {
      continue;
    }
    if (app && typeof app.unmount === "function") {
      app.unmount();
    }
    mountedVueIslands.delete(el);
  }
}

async function prefetchNavigationTarget(event) {
  const anchor = event.target && event.target.closest
    ? event.target.closest("a[href]")
    : null;
  const routePath = getPrefetchPath(anchor, event.target);
  if (!routePath || routePayloadCache.has(routePath) || routePayloadRequests.has(routePath)) {
    return;
  }
  if (isRoutePrefetchCoolingDown(routePath)) {
    return;
  }

  try {
    await loadRoute(routePath, { reason: "prefetch" });
  } catch (error) {
    logManagedMediaDebug("router-prefetch-failed", {
      path: routePath,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function getPrefetchPath(anchor, eventTarget = null) {
  if (!anchor) {
    return null;
  }
  const resolution = resolveSameOriginAnchorTarget(anchor);
  if (!resolution.url) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: resolution.reason,
      href: anchor.getAttribute("href") || ""
    });
    return null;
  }
  const target = resolution.url;
  if (isManagedMediaAssetPath(target.pathname)) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: "media-static-path",
      href: target.href
    });
    return null;
  }
  if (!isRouterManagedPagePath(target.pathname)) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: "non-page-route",
      href: target.href
    });
    return null;
  }

  if (shouldIgnoreNavigationTarget(eventTarget, anchor)) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: "ignored-event-target",
      href: target.href
    });
    return null;
  }

  const routePath = normalizeRoutePayloadKey(target.pathname + target.search);
  if (routePath === normalizeRoutePayloadKey(location.pathname + location.search)) {
    return null;
  }
  return routePath;
}

function isRouterManagedPagePath(pathname) {
  const normalized = String(pathname || "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return !(
    normalized === "/api"
    || normalized.startsWith("/api/")
    || normalized === "/__resux"
    || normalized.startsWith("/__resux/")
    || normalized === "/_resux"
    || normalized.startsWith("/_resux/")
  );
}

function normalizeRoutePayloadKey(routePath) {
  const base = typeof location !== "undefined" && location.href
    ? location.href
    : "http://resux.local/";
  const target = new URL(String(routePath || "/"), base);
  const pathname = target.pathname === "/"
    ? "/"
    : target.pathname.replace(/\/+$/, "") || "/";
  return pathname + target.search;
}

function isRoutePrefetchCoolingDown(routePath, now = Date.now()) {
  const key = normalizeRoutePayloadKey(routePath);
  const failure = routePayloadFailures.get(key);
  if (!failure) {
    return false;
  }
  if ((now - failure.failedAt) >= ROUTE_PREFETCH_FAILURE_COOLDOWN_MS) {
    routePayloadFailures.delete(key);
    return false;
  }
  return true;
}

function invalidateRoutePayload(routePath) {
  const key = normalizeRoutePayloadKey(routePath);
  routePayloadCache.delete(key);
  routePayloadFailures.delete(key);
}

function invalidateAllRoutePayloads() {
  routePayloadGeneration += 1;
  routePayloadCache.clear();
  routePayloadRequests.clear();
  routePayloadFailures.clear();
}

async function loadRoute(routePath, options = {}) {
  const key = normalizeRoutePayloadKey(routePath);
  const reason = options.reason === "prefetch" ? "prefetch" : "navigation";
  const force = options.force === true;

  if (force) {
    invalidateRoutePayload(key);
  } else if (routePayloadCache.has(key)) {
    return routePayloadCache.get(key);
  }

  if (reason === "prefetch" && !force && isRoutePrefetchCoolingDown(key)) {
    const failure = routePayloadFailures.get(key);
    throw failure?.error ?? new Error("Route prefetch is cooling down after a recent failure.");
  }

  const pending = routePayloadRequests.get(key);
  if (pending) {
    try {
      return await pending.promise;
    } catch (error) {
      if (reason === "navigation" && pending.reason === "prefetch") {
        if (routePayloadRequests.get(key) === pending) {
          routePayloadRequests.delete(key);
        }
        routePayloadFailures.delete(key);
        return loadRoute(key, { reason: "navigation", force: true });
      }
      throw error;
    }
  }

  const generation = routePayloadGeneration;
  const promise = fetchRoutePayloadUncached(key);
  const entry = { promise, reason };
  routePayloadRequests.set(key, entry);

  try {
    const result = await promise;
    if (generation !== routePayloadGeneration) {
      if (routePayloadRequests.get(key) === entry) {
        routePayloadRequests.delete(key);
      }
      return loadRoute(key, { reason, force: false });
    }
    routePayloadFailures.delete(key);
    routePayloadCache.set(key, result);
    return result;
  } catch (error) {
    routePayloadFailures.set(key, {
      status: "failed",
      error,
      failedAt: Date.now()
    });
    throw error;
  } finally {
    if (routePayloadRequests.get(key) === entry) {
      routePayloadRequests.delete(key);
    }
  }
}

async function fetchRoutePayload(routePath) {
  return loadRoute(routePath, { reason: "navigation" });
}

async function fetchRoutePayloadUncached(routePath) {
  const isStatic = typeof window !== "undefined" && window["__RESUX_STATIC__"];
  const url = isStatic
    ? "/__resux/route/payloads" + (routePath === "/" ? "/index.json" : routePath.replace(/\/$/, "") + ".json")
    : "/__resux/route?path=" + encodeURIComponent(routePath);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = setTimeout(() => {
    controller?.abort();
  }, ROUTE_PAYLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      },
      ...(controller ? { signal: controller.signal } : {})
    });

    if (!response.ok) {
      throw new Error("Route payload request failed: " + response.status);
    }

    return await response.json();
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error("Route payload request timed out after " + ROUTE_PAYLOAD_TIMEOUT_MS + "ms.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readRoutePayloadBuildId(payload) {
  const value = payload?.config?.public?.__resuxBuildId;
  return typeof value === "string" && value ? value : null;
}

function ensureRoutePayloadBuildCompatibility(result) {
  const currentBuildId = readRoutePayloadBuildId(globalThis.__RESUX__);
  const nextBuildId = readRoutePayloadBuildId(result?.payload);
  if (!currentBuildId || !nextBuildId || currentBuildId === nextBuildId) {
    return true;
  }

  invalidateAllRoutePayloads();
  dispatchManagedEvent(document, "resux:build-mismatch", {
    currentBuildId,
    nextBuildId
  });
  location.reload();
  return false;
}

function applyHtmlAttrs(attrs) {
  const html = document.documentElement;
  if (!html) {
    return;
  }
  const markerName = "data-rx-html-attrs";
  const previousMarker = html.getAttribute(markerName) || "";
  const previousKeys = previousMarker
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const nextAttrs = attrs && typeof attrs === "object" ? attrs : {};
  const nextKeys = [];

  for (const key of previousKeys) {
    if (!Object.prototype.hasOwnProperty.call(nextAttrs, key)) {
      html.removeAttribute(key);
    }
  }

  for (const [key, value] of Object.entries(nextAttrs)) {
    if (value === undefined || value === null || value === false) {
      html.removeAttribute(key);
      continue;
    }
    html.setAttribute(key, String(value));
    nextKeys.push(key);
  }

  if (!nextKeys.includes("lang")) {
    html.setAttribute("lang", "en");
    nextKeys.push("lang");
  }

  html.setAttribute(markerName, nextKeys.join(","));
}

const VALID_CLIENT_PRELOAD_AS_VALUES = new Set([
  "audio",
  "document",
  "embed",
  "fetch",
  "font",
  "image",
  "object",
  "script",
  "style",
  "track",
  "video",
  "worker",
]);

function normalizeClientHeadLinks(links = []) {
  const normalized = [];
  for (const link of links) {
    const next = normalizeClientHeadLink(link);
    if (next) {
      normalized.push(next);
    }
  }
  return normalized;
}

function normalizeClientHeadLink(link) {
  if (!link || typeof link !== "object" || Array.isArray(link)) {
    return null;
  }
  const output = {};
  for (const [key, value] of Object.entries(link)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    output[key] = String(value);
  }
  const rel = String(output.rel || "").trim().toLowerCase();
  if (rel === "modulepreload") {
    delete output.as;
    return output;
  }
  if (rel !== "preload") {
    return output;
  }
  const normalizedAs = normalizeClientPreloadAs(output.as, output);
  if (!normalizedAs) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      const href = String(output.href || "").trim();
      console.warn('[resux] Skipping invalid preload link for "' + (href || "<unknown>") + '". Unsupported as="' + String(output.as || "") + '".');
    }
    return null;
  }
  output.as = normalizedAs;
  return output;
}

function normalizeClientPreloadAs(value, link) {
  const normalized = String(value || "").trim().toLowerCase();
  if (VALID_CLIENT_PRELOAD_AS_VALUES.has(normalized)) {
    return normalized;
  }
  const inferredFromAsValue = inferClientPreloadAsFromHint(normalized);
  if (inferredFromAsValue && VALID_CLIENT_PRELOAD_AS_VALUES.has(inferredFromAsValue)) {
    return inferredFromAsValue;
  }
  const assetType = detectClientPreloadAssetType(link);
  if (assetType && VALID_CLIENT_PRELOAD_AS_VALUES.has(assetType)) {
    return assetType;
  }
  return undefined;
}

function detectClientPreloadAssetType(link) {
  const explicitType = String(link.type || "").trim().toLowerCase();
  const inferredFromType = inferClientPreloadAsFromHint(explicitType);
  if (inferredFromType) {
    return inferredFromType;
  }

  const href = String(link.href || "").trim().toLowerCase().split(/[?#]/)[0];
  const inferredFromHref = inferClientPreloadAsFromHint(href);
  if (inferredFromHref) {
    return inferredFromHref;
  }
  return undefined;
}

function inferClientPreloadAsFromHint(hint) {
  const normalized = String(hint || "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized === "audio"
    || normalized === "document"
    || normalized === "embed"
    || normalized === "fetch"
    || normalized === "font"
    || normalized === "image"
    || normalized === "object"
    || normalized === "script"
    || normalized === "style"
    || normalized === "track"
    || normalized === "video"
    || normalized === "worker"
  ) {
    return normalized;
  }
  if (normalized === "module" || normalized === "runtime") {
    return "script";
  }
  if (
    normalized.startsWith("image/")
    || /(^|[/.])(avif|gif|ico|jpe?g|png|svg|webp)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "image";
  }
  if (
    normalized.startsWith("video/")
    || /(^|[/.])(m4v|mov|mp4|webm|ogg)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "video";
  }
  if (
    normalized.startsWith("audio/")
    || /(^|[/.])(mp3|wav|aac|flac|m4a|oga)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "audio";
  }
  if (
    normalized.startsWith("font/")
    || /(^|[/.])(woff2?|ttf|otf)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "font";
  }
  if (normalized === "text/css" || /(^|[/.])css(?:$|[^a-z0-9])/.test(normalized)) {
    return "style";
  }
  if (
    normalized.includes("javascript")
    || normalized.includes("ecmascript")
    || /(^|[/.])m?js(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "script";
  }
  return undefined;
}

function applyHead(head) {
  if (!head) {
    return;
  }

  if (head.title) {
    document.title = head.title;
  }
  applyHtmlAttrs(head.htmlAttrs);

  const nextEntries = [];

  for (const meta of head.meta ?? []) {
    nextEntries.push({ tag: "meta", attrs: meta });
  }

  for (const link of normalizeClientHeadLinks(head.link ?? [])) {
    nextEntries.push({ tag: "link", attrs: link });
  }

  for (const style of head.style ?? []) {
    nextEntries.push({ tag: "style", attrs: { "data-rx-style": style.id }, text: style.css ?? "" });
  }

  const existing = new Map();
  document.querySelectorAll("[data-rx-head]").forEach((element) => {
    existing.set(headElementKey(element), element);
  });

  const used = new Set();
  for (const entry of nextEntries) {
    const key = headEntryKey(entry.tag, entry.attrs);
    const current = existing.get(key);
    if (current) {
      if (entry.text !== undefined && current.textContent !== entry.text) {
        current.textContent = entry.text;
      }
      used.add(current);
      continue;
    }

    const element = document.createElement(entry.tag);
    element.setAttribute("data-rx-head", "true");
    for (const [key, value] of Object.entries(entry.attrs)) {
      element.setAttribute(key, value);
    }
    if (entry.text !== undefined) {
      element.textContent = entry.text;
    }
    document.head.appendChild(element);
    used.add(element);
  }

  document.querySelectorAll("[data-rx-head]").forEach((element) => {
    if (!used.has(element)) {
      element.remove();
    }
  });
}

function headElementKey(element) {
  const attrs = {};
  for (const attribute of Array.from(element.attributes || [])) {
    if (attribute.name !== "data-rx-head") {
      attrs[attribute.name] = attribute.value;
    }
  }
  return headEntryKey(element.tagName.toLowerCase(), attrs);
}

function headEntryKey(tag, attrs) {
  const normalized = Object.entries(attrs || {})
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => a.localeCompare(b));
  return tag + ":" + JSON.stringify(normalized);
}

async function handleDelegatedEvent(eventName, event) {
  const target = event.target && event.target.closest
    ? event.target.closest("[data-rx-on-" + eventName + "]")
    : null;
  if (!target) {
    return;
  }
  const modifiers = readEventModifiers(target, eventName);
  if (modifiers.includes("self") && event.target !== target) {
    return;
  }
  if (!eventMatchesModifiers(event, modifiers, eventName)) {
    return;
  }
  const onceMarker = "data-rx-once-" + eventName;
  if (modifiers.includes("once")) {
    if (target.hasAttribute(onceMarker)) {
      return;
    }
    target.setAttribute(onceMarker, "true");
  }
  if ((eventName === "submit" || modifiers.includes("prevent")) && !modifiers.includes("passive")) {
    event.preventDefault();
  }
  if (modifiers.includes("stop")) {
    event.stopPropagation();
  }
  const marker = target.getAttribute("data-rx-on-" + eventName);
  if (!marker) {
    return;
  }
  const [scopeId, moduleId, handlerName] = marker.split(":");
  if (!scopeId || !moduleId || !handlerName) {
    return;
  }
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.modules || !payload.scopes || !payload.scopes[scopeId]) {
    return;
  }
  try {
    const component = await importComponent(moduleId, payload.modules, devImportRevision);
    let scopeRecord = scopeCache.get(scopeId);
    if (!scopeRecord) {
      scopeRecord = await component.createScope(payload.scopes[scopeId], payload.route);
      scopeCache.set(scopeId, scopeRecord);
    }
    const patches = await component.run(scopeRecord, handlerName, event, readEventLocals(target, eventName));
    const serialized = component.serialize(scopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches);
  } catch (error) {
    dispatchManagedEvent(document, "resux:handler-error", {
      event: eventName,
      scopeId,
      handler: handlerName,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function readEventLocals(target, eventName) {
  const encoded = target.getAttribute("data-rx-locals-" + eventName);
  if (!encoded) return {};
  try {
    const parsed = JSON.parse(encoded);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readEventModifiers(target, eventName) {
  return (target.getAttribute("data-rx-mod-" + eventName) || "")
    .split(",")
    .map((modifier) => modifier.trim())
    .filter(Boolean);
}

function eventMatchesModifiers(event, modifiers, eventName) {
  if (modifiers.includes("ctrl") && !event.ctrlKey) return false;
  if (modifiers.includes("shift") && !event.shiftKey) return false;
  if (modifiers.includes("alt") && !event.altKey) return false;
  if (modifiers.includes("meta") && !event.metaKey) return false;
  if (modifiers.includes("exact")) {
    const expected = new Set(modifiers.filter((modifier) => ["ctrl", "shift", "alt", "meta"].includes(modifier)));
    if (event.ctrlKey !== expected.has("ctrl")) return false;
    if (event.shiftKey !== expected.has("shift")) return false;
    if (event.altKey !== expected.has("alt")) return false;
    if (event.metaKey !== expected.has("meta")) return false;
  }
  if ((eventName === "click" || eventName === "mousedown" || eventName === "mouseup") && !mouseButtonMatches(event, modifiers)) {
    return false;
  }
  if (eventName.startsWith("key") && !keyMatches(event, modifiers)) {
    return false;
  }
  return true;
}

function mouseButtonMatches(event, modifiers) {
  const buttonModifiers = modifiers.filter((modifier) => ["left", "middle", "right"].includes(modifier));
  if (!buttonModifiers.length) {
    return true;
  }
  return buttonModifiers.some((modifier) => {
    if (modifier === "left") return event.button === 0;
    if (modifier === "middle") return event.button === 1;
    return event.button === 2;
  });
}

function keyMatches(event, modifiers) {
  const aliases = {
    enter: "Enter",
    tab: "Tab",
    delete: ["Delete", "Backspace"],
    esc: "Escape",
    escape: "Escape",
    space: " ",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight"
  };
  const keyModifiers = modifiers.filter((modifier) => Object.prototype.hasOwnProperty.call(aliases, modifier));
  if (!keyModifiers.length) {
    return true;
  }
  return keyModifiers.some((modifier) => {
    const expected = aliases[modifier];
    return Array.isArray(expected) ? expected.includes(event.key) : event.key === expected;
  });
}

async function resumePendingAsyncData() {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules) {
    return;
  }

  await Promise.all(Object.entries(payload.scopes).map(async ([scopeId, serializedScope]) => {
    if (!hasPendingAsyncData(serializedScope)) {
      return;
    }

    const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
    if (!component) {
      return;
    }
    let scopeRecord = scopeCache.get(scopeId);
    if (!scopeRecord) {
      scopeRecord = await component.createScope(serializedScope, payload.route);
      scopeCache.set(scopeId, scopeRecord);
    }

    const completions = scopeRecord.pendingCompletions ?? [];
    if (completions.length === 0) {
      return;
    }

    await Promise.allSettled(completions);
    scopeRecord.pendingCompletions = [];
    const patches = component.render(scopeRecord);
    const serialized = component.serialize(scopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches);
  }));
}

function hasPendingAsyncData(serializedScope) {
  return Object.values(serializedScope.asyncData ?? {}).some((entry) => entry && entry.pending);
}

async function importComponent(moduleId, modules, revision = 0) {
  const modulePath = modules[moduleId];
  if (!modulePath) {
    throw new Error("Missing resumable module " + moduleId + ".");
  }
  const cacheBustedPath = revision ? appendImportRevision(modulePath, revision) : modulePath;
  return (await import(/* @vite-ignore */ cacheBustedPath)).default;
}

function appendImportRevision(modulePath, revision) {
  const separator = modulePath.includes("?") ? "&" : "?";
  return modulePath + separator + "t=" + encodeURIComponent(String(revision));
}

function renderClientPatches(template, scope, styleScopeId) {
  const patches = [];
  collectPatches(template, scope, {}, patches, styleScopeId);
  return patches;
}

function collectPatches(nodes, scope, locals, patches, styleScopeId) {
  for (const node of nodes) {
    if (node.type === "interpolation") {
      patches.push({ type: "text", id: node.bindingId, value: stringifyValue(evaluateExpression(node.expression, scope, locals)) });
      continue;
    }
    if (node.type !== "element") {
      continue;
    }
    if (node.for) {
      patches.push({ type: "block", id: node.for.blockId, value: renderNode(node, scope, locals, styleScopeId).replace(/^<span[^>]*>|<\/span>$/g, "") });
      continue;
    }
    if (node.if) {
      patches.push({ type: "block", id: node.if.blockId, value: renderNode(node, scope, locals, styleScopeId).replace(/^<span[^>]*>|<\/span>$/g, "") });
      continue;
    }
    if (node.html) {
      patches.push({ type: "html", id: node.html.bindingId, value: sanitizeHtml(evaluateExpression(node.html.expression, scope, locals)) });
    }
    if (node.tag !== "ResuxImg" && node.tag !== "ResuxPicture" && node.tag !== "ResuxVideo") {
      for (const attr of node.attrs) {
        if (attr.kind === "dynamic" && attr.bindingId) {
          const attrName = nativeAttributeName(node, attr.name);
          patches.push({ type: "attr", id: attr.bindingId, attr: attrName, value: stringifyAttributeValue(attrName, evaluateExpression(attr.value, scope, locals)) });
        }
      }
    }
    collectPatches(node.children, scope, locals, patches, styleScopeId);
  }
}

function renderNode(node, scope, locals, styleScopeId) {
  if (node.type === "text") {
    return escapeHtml(node.value);
  }
  if (node.type === "interpolation") {
    return '<span data-rx-text=":' + node.bindingId + '">' + escapeHtml(stringifyValue(evaluateExpression(node.expression, scope, locals))) + '</span>';
  }
  if (node.for) {
    const items = evaluateExpression(node.for.source, scope, locals);
    const rendered = Array.isArray(items)
      ? items.map((item, index) => {
          const nextLocals = { ...locals, [node.for.value]: item };
          if (node.for.index) nextLocals[node.for.index] = index;
          return renderElement({ ...node, for: undefined, if: undefined }, scope, nextLocals, styleScopeId);
        }).join("")
      : "";
    return '<span data-rx-block=":' + node.for.blockId + '" style="display: contents;">' + rendered + '</span>';
  }
  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, scope, locals)
      ? renderElement({ ...node, if: undefined }, scope, locals, styleScopeId)
      : "";
    return '<span data-rx-block=":' + node.if.blockId + '" style="display: contents;">' + rendered + '</span>';
  }
  return renderElement(node, scope, locals, styleScopeId);
}

function renderElement(node, scope, locals, styleScopeId) {
  if (node.tag === "ResuxImg") {
    return renderClientResuxImg(node, scope, locals, styleScopeId);
  }
  if (node.tag === "ResuxPicture") {
    return renderClientResuxPicture(node, scope, locals, styleScopeId);
  }
  if (node.tag === "ResuxVideo") {
    return renderClientResuxVideo(node, scope, locals, styleScopeId);
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    return renderClientResuxClientEnhance(node, scope, locals, styleScopeId);
  }
  const tag = nativeElementTag(node);
  const attrs = [];
  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(attrName + '="' + escapeAttribute(attr.value) + '"');
    } else {
      const value = evaluateExpression(attr.value, scope, locals);
      if (value !== false && value !== null && value !== undefined) {
        const marker = attr.bindingId ? ' data-rx-attr-' + attr.bindingId + '=":' + attr.bindingId + '"' : "";
        attrs.push(attrName + '="' + escapeAttribute(stringifyAttributeValue(attrName, value)) + '"' + marker);
      }
    }
  }
  for (const event of node.events) {
    attrs.push('data-rx-on-' + event.name + '=":' + event.handler + '"');
    if (event.locals && event.locals.length) {
      const eventLocals = {};
      for (const name of event.locals) {
        if (Object.prototype.hasOwnProperty.call(locals, name)) eventLocals[name] = locals[name];
      }
      attrs.push('data-rx-locals-' + event.name + '=\"' + escapeAttribute(JSON.stringify(eventLocals)) + '\"');
    }
    if (event.modifiers && event.modifiers.length) {
      attrs.push('data-rx-mod-' + event.name + '="' + escapeAttribute(event.modifiers.join(",")) + '"');
    }
  }
  if (node.html) {
    attrs.push('data-rx-html-' + node.html.bindingId + '=":' + node.html.bindingId + '"');
  }
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, scope, locals))
    : node.children.map((child) => renderNode(child, scope, locals, styleScopeId)).join("");
  return "<" + tag + attrText + ">" + children + "</" + tag + ">";
}

const clientImageReservedProps = new Set([
  "src",
  "alt",
  "provider",
  "cache",
  "modifiers",
  "quality",
  "fit",
  "format",
  "formats",
  "width",
  "height",
  "widths",
  "sizes",
  "densities",
  "priority",
  "preload",
  "lazy",
  "loading",
  "decoding",
  "fetchpriority",
  "fetchPriority",
  "placeholder",
  "placeholderClass",
  "placeholderStyle",
  "fallback",
  "fallbackSrc",
  "sources",
  "rootMargin",
  "threshold"
]);
const RESUX_CLIENT_RESPONSIVE_VIEWPORT_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920, 2560];

function readClientRuntimeVideoConfig() {
  try {
    const runtimeConfig = useRuntimeConfig();
    const publicConfig = runtimeConfig && runtimeConfig.public && typeof runtimeConfig.public === "object"
      ? runtimeConfig.public
      : {};
    const candidate = publicConfig.video || publicConfig.resuxVideo;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return {};
    }
    return candidate;
  } catch {
    return {};
  }
}

function resolveClientVideoControlsMode(value, fallback = "custom") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "custom" || normalized === "native" || normalized === "none") {
    return normalized;
  }
  return fallback;
}

function resolveClientVideoLoadMode(value, fallback = "lazy") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "lazy" || normalized === "eager") {
    return normalized;
  }
  return fallback;
}

function resolveClientVideoTheme(value, fallback = "dark") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "dark" || normalized === "light" || normalized === "auto") {
    return normalized;
  }
  return fallback;
}

function resolveClientVideoThemeDefaults(theme) {
  if (theme === "light") {
    return {
      controlsColor: "#0f172a",
      controlsBackground: "rgba(248, 250, 252, 0.84)"
    };
  }
  if (theme === "auto") {
    return {
      controlsColor: "var(--resux-video-theme-fg, #e2e8f0)",
      controlsBackground: "var(--resux-video-theme-bg, rgba(2, 6, 23, 0.74))"
    };
  }
  return {
    controlsColor: "#e2e8f0",
    controlsBackground: "rgba(2, 6, 23, 0.74)"
  };
}

function resolveClientVideoSkipSeconds(value, fallback) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(120, Math.max(0.25, Math.round(parsed * 100) / 100));
}

function formatClientVideoSkipDuration(seconds) {
  const normalized = resolveClientVideoSkipSeconds(seconds, 10);
  return Number.isInteger(normalized) ? String(Math.trunc(normalized)) + "s" : String(normalized) + "s";
}

function renderClientResuxClientEnhance(node, scope, locals, styleScopeId) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const name = String(props.name || "").trim();
  if (!name) {
    throw new Error("<ClientEnhance> requires a non-empty name property.");
  }
  const trigger = String(props.trigger || "visible").trim();
  const mode = String(props.mode || "progressive").trim();
  const options = props.options;
  
  if (options !== undefined && options !== null) {
    try {
      assertEnhancementOptionsSerializable(options, "$", new WeakSet());
    } catch (error) {
      throw new Error(
        "[resux] <ClientEnhance name=\"" + name + "\"> received non-serializable options. " + getEnhancementErrorMessage(error)
      );
    }
  }
  
  const serializedOptions = (options !== undefined && options !== null) ? JSON.stringify(options) : undefined;
  const reserveHeight = String(props.reserveHeight || "").trim();
  const reserveWidth = String(props.reserveWidth || "").trim();
  const aspectRatio = String(props.aspectRatio || "").trim();
  const noCls = props.noCls === true || props.noCls === "true" || props.noCls === "";
  const demo = String(props.demo || name).trim();
  const tag = String(props.as || "section").trim();

  const styles = [];
  if (reserveHeight) styles.push("min-height: " + reserveHeight + ";");
  if (reserveWidth) styles.push("min-width: " + reserveWidth + ";");
  if (aspectRatio) styles.push("aspect-ratio: " + aspectRatio + ";");
  const styleAttr = styles.length ? " style=\"" + styles.join(" ") + "\"" : "";

  const attrs = [
    "data-resux-enhancement=\"" + escapeAttribute(name) + "\"",
    "data-resux-trigger=\"" + escapeAttribute(trigger) + "\"",
    "use-client-enhancement=\"" + escapeAttribute(name) + "\"",
    "data-trigger=\"" + escapeAttribute(trigger) + "\"",
    "data-resux-mode=\"" + escapeAttribute(mode) + "\"",
    serializedOptions ? "data-resux-options=\"" + escapeAttribute(serializedOptions) + "\"" : "",
    noCls ? "data-resux-no-cls=\"true\"" : "",
    "data-rx-package-demo=\"" + escapeAttribute(demo) + "\"",
    "data-resux-demo=\"" + escapeAttribute(demo) + "\"",
    "data-resux-enhancement-status=\"idle\"",
  ].filter(Boolean);

  if (styleScopeId) {
    attrs.push(styleScopeId + "=\"\"");
  }

  const specialProps = new Set([
    "name", "trigger", "mode", "options", "reserveHeight", "reserveWidth", "aspectRatio", "noCls", "demo", "as"
  ]);
  for (const [propKey, propVal] of Object.entries(props)) {
    if (specialProps.has(propKey)) continue;
    const attrName = propKey.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    if (propVal !== undefined && propVal !== null && propVal !== false) {
      if (propVal === true) {
        attrs.push(attrName);
      } else {
        attrs.push(attrName + "=\"" + escapeAttribute(String(propVal)) + "\"");
      }
    }
  }

  const children = node.children.map(child => renderNode(child, scope, locals, styleScopeId)).join("");
  return "<" + tag + " " + attrs.join(" ") + styleAttr + ">" + children + "</" + tag + ">";
}

function renderClientResuxVideo(node, scope, locals, styleScopeId) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const hero = readClientBooleanProp(props.hero, false);
  const priority = readClientBooleanProp(props.priority, hero);
  const deferUntilPageReady = readClientBooleanProp(props.deferUntilPageReady, false);
  const revealOnPageReady = readClientBooleanProp(props.revealOnPageReady, priority || hero || deferUntilPageReady);
  const chunkLoading = readClientBooleanProp(props.chunkLoading, false) || readClientBooleanProp(props.chunked, false);
  const fetchPriority = readClientStringProp(props.fetchpriority || props.fetchPriority) || ((priority || hero) ? "high" : "");
  const explicitLoading = readClientStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readClientBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : false);
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true || lazy || deferUntilPageReady;
  const src = readClientStringProp(props.src);
  const poster = readClientStringProp(props.poster);
  const fallbackPoster = readClientStringProp(props.fallbackPoster);
  const width = readClientNumberProp(props.width);
  const height = readClientNumberProp(props.height);
  const placeholderSrc = resolveClientPlaceholderSource(props.placeholder);
  const preload = readClientStringProp(props.preload)
    || ((chunkLoading || deferUntilPageReady) ? "metadata" : ((priority || hero) ? "auto" : "metadata"));
  const ariaLabel = readClientStringProp(props.ariaLabel || props["aria-label"]);
  const rootMargin = readClientStringProp(props.rootMargin) || "320px 0px";
  const thresholdRaw = Number(props.threshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : 0;
  const forceAutoplay = readClientBooleanProp(props.forceAutoplay, false);
  const autoplay = readClientBooleanProp(props.autoplay, false);
  const runtimeVideoConfig = readClientRuntimeVideoConfig();
  const controlsRequested = readClientBooleanProp(
    props.controls,
    typeof runtimeVideoConfig.controls === "boolean" ? runtimeVideoConfig.controls : true,
  );
  const configuredControlsMode = resolveClientVideoControlsMode(runtimeVideoConfig.controlsMode, "custom");
  const controlsModeProp = readClientStringProp(props.controlsMode);
  let controlsMode = resolveClientVideoControlsMode(controlsModeProp, configuredControlsMode);
  const explicitNativeControls = props.nativeControls === undefined
    ? undefined
    : readClientBooleanProp(props.nativeControls, true);
  const explicitCustomControls = props.customControls === undefined
    ? undefined
    : readClientBooleanProp(props.customControls, false);
  if (explicitNativeControls === true) {
    controlsMode = "native";
  } else if (explicitCustomControls === true) {
    controlsMode = "custom";
  } else if (!controlsRequested) {
    controlsMode = "none";
  }
  const nativeControls = controlsRequested && controlsMode === "native";
  const customControls = controlsRequested && controlsMode === "custom";
  const controlsLoad = resolveClientVideoLoadMode(
    readClientStringProp(props.controlsLoad),
    resolveClientVideoLoadMode(runtimeVideoConfig.controlsLoad, "lazy"),
  );
  const iconsLoad = resolveClientVideoLoadMode(
    readClientStringProp(props.iconsLoad),
    resolveClientVideoLoadMode(runtimeVideoConfig.iconsLoad, "lazy"),
  );
  const showSpeed = readClientBooleanProp(
    props.showSpeed,
    typeof runtimeVideoConfig.showSpeed === "boolean" ? runtimeVideoConfig.showSpeed : true,
  );
  const speedControl = controlsRequested && (
    props.speedControl === undefined
      ? showSpeed
      : readClientBooleanProp(props.speedControl, showSpeed)
  );
  const speeds = resolveClientVideoPlaybackSpeeds(props.speeds);
  const defaultSpeed = resolveClientVideoDefaultSpeed(props.defaultSpeed, speeds);
  const showSpeedIcon = readClientBooleanProp(props.showSpeedIcon, true);
  const speedLabel = readClientStringProp(props.speedLabel) || "Speed";
  const showQuality = readClientBooleanProp(
    props.showQuality,
    typeof runtimeVideoConfig.showQuality === "boolean" ? runtimeVideoConfig.showQuality : true,
  );
  const qualityControl = controlsRequested && (
    props.qualityControl === undefined
      ? showQuality
      : readClientBooleanProp(props.qualityControl, showQuality)
  );
  const showQualityIcon = readClientBooleanProp(props.showQualityIcon, true);
  const qualityLabel = readClientStringProp(props.qualityLabel) || "Quality";
  const showFullscreen = readClientBooleanProp(
    props.showFullscreen,
    typeof runtimeVideoConfig.showFullscreen === "boolean" ? runtimeVideoConfig.showFullscreen : true,
  );
  const showVolume = readClientBooleanProp(
    props.showVolume,
    typeof runtimeVideoConfig.showVolume === "boolean" ? runtimeVideoConfig.showVolume : true,
  );
  const showProgress = readClientBooleanProp(
    props.showProgress,
    typeof runtimeVideoConfig.showProgress === "boolean" ? runtimeVideoConfig.showProgress : true,
  );
  const showTime = readClientBooleanProp(
    props.showTime,
    typeof runtimeVideoConfig.showTime === "boolean" ? runtimeVideoConfig.showTime : true,
  );
  const sideClickSkip = readClientBooleanProp(
    props.sideClickSkip,
    typeof runtimeVideoConfig.sideClickSkip === "boolean" ? runtimeVideoConfig.sideClickSkip : true,
  );
  const skipControls = props.skipControls === undefined
    ? sideClickSkip
    : readClientBooleanProp(props.skipControls, sideClickSkip);
  const clickToPlay = readClientBooleanProp(
    props.clickToPlay,
    typeof runtimeVideoConfig.clickToPlay === "boolean" ? runtimeVideoConfig.clickToPlay : true,
  );
  const doubleClickFullscreen = readClientBooleanProp(
    props.doubleClickFullscreen,
    typeof runtimeVideoConfig.doubleClickFullscreen === "boolean" ? runtimeVideoConfig.doubleClickFullscreen : true,
  );
  const configuredSkipSeconds = typeof runtimeVideoConfig.skipSeconds === "number"
    ? runtimeVideoConfig.skipSeconds
    : 10;
  const skipSeconds = resolveClientVideoSkipSeconds(props.skipSeconds, configuredSkipSeconds);
  const skipBackwardSeconds = resolveClientVideoSkipSeconds(props.skipBackwardSeconds, skipSeconds);
  const skipForwardSeconds = resolveClientVideoSkipSeconds(props.skipForwardSeconds, skipSeconds);
  const showSkipOverlay = readClientBooleanProp(props.showSkipOverlay, true);
  const sideSkipEnabled = (skipControls || sideClickSkip) && showSkipOverlay;
  const interactionZonesEnabled = clickToPlay || doubleClickFullscreen || sideSkipEnabled;
  const skipLabel = readClientStringProp(props.skipLabel) || "Skip";
  const disableSkipOnControls = readClientBooleanProp(props.disableSkipOnControls, true);
  const theme = resolveClientVideoTheme(
    readClientStringProp(props.theme),
    resolveClientVideoTheme(runtimeVideoConfig.theme, "dark"),
  );
  const themeDefaults = resolveClientVideoThemeDefaults(theme);
  const controlsColor = readClientStringProp(props.controlsColor)
    || readClientStringProp(runtimeVideoConfig.controlsColor)
    || themeDefaults.controlsColor;
  const controlsBackground = readClientStringProp(props.controlsBackground)
    || readClientStringProp(runtimeVideoConfig.controlsBackground)
    || themeDefaults.controlsBackground;
  const controlsAccent = readClientStringProp(props.accentColor || props.controlsAccent)
    || readClientStringProp(runtimeVideoConfig.accentColor)
    || "#38bdf8";
  const controlsClass = readClientStringProp(props.controlsClass);
  const controlsStyle = readClientStringProp(props.controlsStyle);
  const rounded = props.rounded === undefined
    ? true
    : readClientBooleanProp(props.rounded, true);
  const shadow = props.shadow === undefined
    ? true
    : readClientBooleanProp(props.shadow, true);
  const iconPlay = readClientStringProp(props.controlsIconPlay || props.iconPlay) || "\u25b6";
  const iconPause = readClientStringProp(props.controlsIconPause || props.iconPause) || "\u275a\u275a";
  const iconMute = readClientStringProp(props.controlsIconMute || props.iconMute) || "\ud83d\udd07";
  const iconUnmute = readClientStringProp(props.controlsIconUnmute || props.iconUnmute) || "\ud83d\udd0a";
  const iconFullscreen = readClientStringProp(props.controlsIconFullscreen || props.iconFullscreen) || "\u26f6";
  const iconExitFullscreen = readClientStringProp(props.controlsIconExitFullscreen || props.iconExitFullscreen) || "\ud83d\uddd7";
  const iconPlayFallback = readClientStringProp(props.iconPlayFallback) || "Play";
  const iconPauseFallback = readClientStringProp(props.iconPauseFallback) || "Pause";
  const iconMuteFallback = readClientStringProp(props.iconMuteFallback) || "Mute";
  const iconUnmuteFallback = readClientStringProp(props.iconUnmuteFallback) || "Sound";
  const iconFullscreenFallback = readClientStringProp(props.iconFullscreenFallback) || "Full";
  const iconExitFullscreenFallback = readClientStringProp(props.iconExitFullscreenFallback) || "Exit";
  const resolvedSources = resolveClientVideoSources(props.sources);
  const resolvedQualities = resolveClientVideoQualityOptions(props.qualities, resolvedSources, src);
  const defaultQuality = resolveClientVideoDefaultQuality(props.defaultQuality, resolvedQualities);
  const qualityControlEnabled = qualityControl && resolvedQualities.length > 1;
  const activeQuality = qualityControlEnabled
    ? resolvedQualities.find((entry) => entry.id === defaultQuality) || resolvedQualities[0]
    : undefined;
  const activeSources = (activeQuality && Array.isArray(activeQuality.sources) && activeQuality.sources.length)
    ? activeQuality.sources
    : resolvedSources;
  const activePrimarySrc = (activeSources[0] && activeSources[0].src) || src;
  const hasSourceChildren = activeSources.length > 0;
  const styleParts = [];
  if (typeof props.style === "string" && props.style.trim()) {
    styleParts.push(props.style.trim().replace(/;+\s*$/, ""));
  }
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== false) {
    const aspectValue = String(props.aspectRatio).trim();
    if (aspectValue) {
      styleParts.push("aspect-ratio: " + aspectValue);
    }
  } else {
    const ratioStyle = resolveClientAspectRatioStyle(width, height, props.style);
    if (ratioStyle) {
      styleParts.push(ratioStyle);
    }
  }
  styleParts.push("display: block");
  styleParts.push("width: 100%");
  styleParts.push("max-width: 100%");
  if (!styleParts.some((entry) => /(^|;)\s*height\s*:/.test(entry))) {
    styleParts.push("height: auto");
  }
  const attrs = [];
  for (const [name, rawValue] of Object.entries(props)) {
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue;
    }
    if (
      name === "aspectRatio"
      || name === "style"
      || name === "lazy"
      || name === "loading"
      || name === "placeholder"
      || name === "fallbackPoster"
      || name === "rootMargin"
      || name === "threshold"
      || name === "sources"
      || name === "format"
      || name === "formats"
      || name === "quality"
      || name === "forceAutoplay"
      || name === "ariaLabel"
      || name === "autoplay"
      || name === "src"
      || name === "poster"
      || name === "preload"
      || name === "fallbackText"
      || name === "controls"
      || name === "controlsMode"
      || name === "controlsLoad"
      || name === "iconsLoad"
      || name === "nativeControls"
      || name === "customControls"
      || name === "theme"
      || name === "accentColor"
      || name === "controlsColor"
      || name === "controlsBackground"
      || name === "controlsAccent"
      || name === "controlsClass"
      || name === "controlsStyle"
      || name === "rounded"
      || name === "shadow"
      || name === "controlsIconPlay"
      || name === "controlsIconPause"
      || name === "controlsIconMute"
      || name === "controlsIconUnmute"
      || name === "controlsIconFullscreen"
      || name === "controlsIconExitFullscreen"
      || name === "iconPlay"
      || name === "iconPause"
      || name === "iconMute"
      || name === "iconUnmute"
      || name === "iconFullscreen"
      || name === "iconExitFullscreen"
      || name === "iconPlayFallback"
      || name === "iconPauseFallback"
      || name === "iconMuteFallback"
      || name === "iconUnmuteFallback"
      || name === "iconFullscreenFallback"
      || name === "iconExitFullscreenFallback"
      || name === "speedControl"
      || name === "showSpeed"
      || name === "speeds"
      || name === "defaultSpeed"
      || name === "showSpeedIcon"
      || name === "speedLabel"
      || name === "qualityControl"
      || name === "showQuality"
      || name === "qualities"
      || name === "defaultQuality"
      || name === "showQualityIcon"
      || name === "qualityLabel"
      || name === "showFullscreen"
      || name === "showVolume"
      || name === "showProgress"
      || name === "showTime"
      || name === "skipControls"
      || name === "skipSeconds"
      || name === "skipBackwardSeconds"
      || name === "skipForwardSeconds"
      || name === "showSkipOverlay"
      || name === "skipLabel"
      || name === "disableSkipOnControls"
      || name === "sideClickSkip"
      || name === "clickToPlay"
      || name === "doubleClickFullscreen"
      || name === "hero"
      || name === "priority"
      || name === "preloadLink"
      || name === "chunkLoading"
      || name === "chunked"
      || name === "deferUntilPageReady"
      || name === "revealOnPageReady"
      || name === "fetchpriority"
      || name === "fetchPriority"
    ) {
      continue;
    }
    const attrName = name === "className"
      ? "class"
      : name === "playsInline"
        ? "playsinline"
        : name === "crossOrigin"
          ? "crossorigin"
          : name === "referrerPolicy"
            ? "referrerpolicy"
            : name;
    attrs.push(attrName + '="' + escapeAttribute(stringifyAttributeValue(attrName, rawValue)) + '"');
  }
  if (!hasSourceChildren && !deferLazy && activePrimarySrc) {
    attrs.push('src="' + escapeAttribute(activePrimarySrc) + '"');
  }
  attrs.push('data-resux-media="video"');
  attrs.push('data-resux-video="' + (deferLazy ? "idle" : "loading") + '"');
  if (!deferLazy) {
    attrs.push('data-resux-loading="true"');
    attrs.push('data-resux-video-loading="true"');
  }
  if (fetchPriority) {
    attrs.push('fetchpriority="' + escapeAttribute(fetchPriority) + '"');
  }
  if (hero || priority) {
    attrs.push('data-rx-video-hero="true"');
  }
  if (chunkLoading) {
    attrs.push('data-rx-video-chunked="true"');
  }
  if (deferLazy && activePrimarySrc) {
    attrs.push('data-rx-lazy-src="' + escapeAttribute(activePrimarySrc) + '"');
    attrs.push('data-src="' + escapeAttribute(activePrimarySrc) + '"');
  }
  if (deferLazy) {
    attrs.push('data-rx-lazy-video="true"');
    attrs.push('data-resux-lazy="true"');
    attrs.push('data-rx-lazy-root-margin="' + escapeAttribute(rootMargin) + '"');
    attrs.push('data-rx-lazy-threshold="' + escapeAttribute(String(threshold)) + '"');
    attrs.push('data-rx-lazy-preload="' + escapeAttribute(preload) + '"');
    if (deferUntilPageReady) {
      attrs.push('data-rx-video-defer-ready="true"');
      if (revealOnPageReady) {
        attrs.push('data-rx-video-ready-reveal="true"');
      }
    }
    attrs.push('preload="none"');
  } else if (preload) {
    attrs.push('preload="' + escapeAttribute(preload) + '"');
  }
  if (poster) {
    attrs.push('data-rx-poster="' + escapeAttribute(poster) + '"');
  }
  if (fallbackPoster) {
    attrs.push('data-rx-fallback-poster="' + escapeAttribute(fallbackPoster) + '"');
  }
  if (placeholderSrc) {
    attrs.push('data-rx-placeholder-src="' + escapeAttribute(placeholderSrc) + '"');
    attrs.push('data-placeholder="' + escapeAttribute(placeholderSrc) + '"');
    attrs.push('data-rx-placeholder-active="true"');
    attrs.push('data-resux-placeholder-active="true"');
  }
  const initialPoster = deferLazy
    ? undefined
    : (placeholderSrc || poster);
  if (initialPoster) {
    attrs.push('poster="' + escapeAttribute(initialPoster) + '"');
  }
  if (autoplay) {
    attrs.push('autoplay="autoplay"');
    attrs.push('data-rx-autoplay-requested="true"');
    if (!forceAutoplay) {
      attrs.push('data-rx-respect-reduced-motion="true"');
    } else {
      attrs.push('data-rx-force-autoplay="true"');
    }
  }
  if (controlsRequested && nativeControls) {
    attrs.push('controls="controls"');
  }
  if (customControls) {
    attrs.push('data-rx-custom-controls="true"');
  }
  attrs.push('data-rx-video-default-speed="' + escapeAttribute(String(defaultSpeed)) + '"');
  if (ariaLabel) {
    attrs.push('aria-label="' + escapeAttribute(ariaLabel) + '"');
  }
  if (styleParts.length > 0) {
    attrs.push('style="' + escapeAttribute(styleParts.join("; ")) + '"');
  }
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  const sourceTags = hasSourceChildren
    ? activeSources
      .map((source) => {
        const sourceAttrs = deferLazy
          ? ['data-rx-lazy-src="' + escapeAttribute(source.src) + '"', 'data-src="' + escapeAttribute(source.src) + '"']
          : ['src="' + escapeAttribute(source.src) + '"'];
        if (source.type) {
          sourceAttrs.push('type="' + escapeAttribute(source.type) + '"');
        }
        return "<source " + sourceAttrs.join(" ") + ">";
      })
      .join("")
    : "";
  const children = node.children.map((child) => renderNode(child, scope, locals, styleScopeId)).join("");
  const fallbackText = escapeHtml(readClientStringProp(props.fallbackText) || "Your browser does not support the video tag.");
  const videoMarkup = "<video" + attrText + ">" + sourceTags + children + fallbackText + "</video>";
  const renderShell = customControls
    || speedControl
    || qualityControlEnabled
    || interactionZonesEnabled;
  if (!renderShell) {
    return videoMarkup;
  }
  const controlsInset = controlsRequested ? "4.25rem" : "0px";
  const shellClass = mergeClientClassNames(
    "rx-video-shell resux-video",
    "resux-video--theme-" + theme,
    rounded ? "resux-video--rounded" : "",
    shadow ? "resux-video--shadow" : "",
    controlsClass
  );
  const shellStyle = mergeClientInlineStyles(
    "position: relative",
    "display: block",
    "isolation: isolate",
    "--rx-video-controls-hit-area: " + controlsInset,
    "--resux-video-accent: " + controlsAccent,
    "--resux-video-controls-color: " + controlsColor,
    "--resux-video-controls-bg: " + controlsBackground,
    "--resux-video-radius: " + (rounded ? "0.9rem" : "0px"),
    "--rx-video-controls-fg: " + controlsColor,
    "--rx-video-controls-bg: " + controlsBackground,
    "--rx-video-controls-accent: " + controlsAccent,
    controlsStyle
  );
  const controlsActivated = controlsLoad === "eager";
  const iconsReady = iconsLoad === "eager";
  const controlsReady = controlsActivated && !deferLazy;
  const shellAttrs = [
    'data-rx-video-shell="true"',
    'data-rx-video-controls-ready="' + (controlsReady ? "true" : "false") + '"',
    'data-resux-video-controls-ready="' + (controlsReady ? "true" : "false") + '"',
    'data-rx-video-controls-load="' + controlsLoad + '"',
    'data-rx-video-controls-activated="' + (controlsActivated ? "true" : "false") + '"',
    'data-rx-video-icons-load="' + iconsLoad + '"',
    'data-rx-video-icons-ready="' + (iconsReady ? "true" : "false") + '"',
    'data-rx-video-theme="' + theme + '"',
    'data-rx-video-state="' + (deferLazy ? "idle" : "loading") + '"',
    'data-resux-video="' + (deferLazy ? "idle" : "loading") + '"',
    'data-rx-video-icon-play="' + escapeAttribute(iconPlay) + '"',
    'data-rx-video-icon-pause="' + escapeAttribute(iconPause) + '"',
    'data-rx-video-icon-mute="' + escapeAttribute(iconMute) + '"',
    'data-rx-video-icon-unmute="' + escapeAttribute(iconUnmute) + '"',
    'data-rx-video-icon-fullscreen="' + escapeAttribute(iconFullscreen) + '"',
    'data-rx-video-icon-exit-fullscreen="' + escapeAttribute(iconExitFullscreen) + '"',
    'data-rx-video-icon-play-fallback="' + escapeAttribute(iconPlayFallback) + '"',
    'data-rx-video-icon-pause-fallback="' + escapeAttribute(iconPauseFallback) + '"',
    'data-rx-video-icon-mute-fallback="' + escapeAttribute(iconMuteFallback) + '"',
    'data-rx-video-icon-unmute-fallback="' + escapeAttribute(iconUnmuteFallback) + '"',
    'data-rx-video-icon-fullscreen-fallback="' + escapeAttribute(iconFullscreenFallback) + '"',
    'data-rx-video-icon-exit-fullscreen-fallback="' + escapeAttribute(iconExitFullscreenFallback) + '"',
    'data-rx-video-speed-control="' + (speedControl ? "true" : "false") + '"',
    'data-rx-video-speeds="' + escapeAttribute(serializeClientVideoPlaybackSpeeds(speeds)) + '"',
    'data-rx-video-default-speed="' + escapeAttribute(String(defaultSpeed)) + '"',
    'data-rx-video-show-speed-icon="' + (showSpeedIcon ? "true" : "false") + '"',
    'data-rx-video-speed-label="' + escapeAttribute(speedLabel) + '"',
    'data-rx-video-quality-control="' + (qualityControlEnabled ? "true" : "false") + '"',
    'data-rx-video-qualities="' + escapeAttribute(serializeClientVideoQualityOptions(resolvedQualities)) + '"',
    'data-rx-video-default-quality="' + escapeAttribute(defaultQuality || "") + '"',
    'data-rx-video-show-quality-icon="' + (showQualityIcon ? "true" : "false") + '"',
    'data-rx-video-quality-label="' + escapeAttribute(qualityLabel) + '"',
    'data-rx-video-custom-controls="' + (customControls ? "true" : "false") + '"',
    'data-rx-video-native-controls="' + (nativeControls ? "true" : "false") + '"',
    'data-rx-video-show-fullscreen="' + (showFullscreen ? "true" : "false") + '"',
    'data-rx-video-show-volume="' + (showVolume ? "true" : "false") + '"',
    'data-rx-video-show-progress="' + (showProgress ? "true" : "false") + '"',
    'data-rx-video-show-time="' + (showTime ? "true" : "false") + '"',
    'data-rx-video-skip-controls="' + (sideSkipEnabled ? "true" : "false") + '"',
    'data-rx-video-skip-backward="' + escapeAttribute(String(skipBackwardSeconds)) + '"',
    'data-rx-video-skip-forward="' + escapeAttribute(String(skipForwardSeconds)) + '"',
    'data-rx-video-skip-label="' + escapeAttribute(skipLabel) + '"',
    'data-rx-video-show-skip-overlay="' + (sideSkipEnabled ? "true" : "false") + '"',
    'data-rx-video-disable-skip-on-controls="' + (disableSkipOnControls ? "true" : "false") + '"',
    'data-rx-video-side-click-skip="' + (sideSkipEnabled ? "true" : "false") + '"',
    'data-rx-video-click-to-play="' + (clickToPlay ? "true" : "false") + '"',
    'data-rx-video-double-click-fullscreen="' + (doubleClickFullscreen ? "true" : "false") + '"',
    'data-rx-video-has-interaction-zones="' + (interactionZonesEnabled ? "true" : "false") + '"'
  ];
  if (shellClass) {
    shellAttrs.push('class="' + escapeAttribute(shellClass) + '"');
  }
  if (shellStyle) {
    shellAttrs.push('style="' + escapeAttribute(shellStyle) + '"');
  }
  if (styleScopeId) {
    shellAttrs.push(styleScopeId + '=""');
  }
  const speedButtonLabel = formatClientVideoPlaybackRateLabel(defaultSpeed);
  const speedButtonText = ((showSpeedIcon && iconsLoad === "eager") ? ">> " : "") + speedButtonLabel;
  const skipBackwardLabel = skipLabel + " backward " + formatClientVideoSkipDuration(skipBackwardSeconds);
  const skipForwardLabel = skipLabel + " forward " + formatClientVideoSkipDuration(skipForwardSeconds);
  const qualityOptionsMarkup = qualityControlEnabled
    ? resolvedQualities
      .map((entry) => {
        const selected = entry.id === defaultQuality ? " selected" : "";
        return '<option value="' + escapeAttribute(entry.id) + '"' + selected + '>' + escapeHtml(entry.label) + '</option>';
      })
      .join("")
    : "";
  const qualityControlMarkup = qualityControlEnabled
    ? '<label class="rx-video-quality-wrap resux-video__control" data-rx-video-quality-wrap data-resux-video-control="true">'
      + '<span class="rx-video-quality-prefix" aria-hidden="true">' + escapeHtml(showQualityIcon ? "HD" : qualityLabel) + '</span>'
      + '<select class="rx-video-quality-select resux-video__quality-select" data-rx-video-quality data-resux-video-control="true" aria-label="' + escapeAttribute(qualityLabel) + '">' + qualityOptionsMarkup + '</select>'
      + '</label>'
    : "";
  const speedControlsMarkup = speedControl
    ? '<button type="button" class="rx-video-btn rx-video-speed resux-video__speed-button" data-rx-video-speed data-resux-video-control="true" aria-label="' + escapeAttribute(speedLabel) + '">' + escapeHtml(speedButtonText) + '</button>'
    : "";
  const hasOverlayQuickControls = !customControls && (speedControl || qualityControlEnabled);
  const initialPlayIcon = iconsLoad === "lazy" ? iconPlayFallback : iconPlay;
  const initialUnmuteIcon = iconsLoad === "lazy" ? iconUnmuteFallback : iconUnmute;
  const initialFullscreenIcon = iconsLoad === "lazy" ? iconFullscreenFallback : iconFullscreen;
  const timeHiddenAttr = showTime ? "" : " hidden";
  const progressHiddenAttr = showProgress ? "" : " hidden";
  const volumeHiddenAttr = showVolume ? "" : " hidden";
  const fullscreenHiddenAttr = showFullscreen ? "" : " hidden";
  const interactionZonesMarkup = interactionZonesEnabled
    ? '<div class="rx-video-click-zones" data-rx-video-click-zones data-rx-video-skip-overlay-zone aria-hidden="false">'
      + '<button type="button" class="rx-video-zone rx-video-zone-left" data-rx-video-zone="left" data-resux-video-zone="left" data-rx-video-side-action="-' + escapeAttribute(String(skipBackwardSeconds)) + '" data-rx-skip-indicator="' + (sideSkipEnabled ? '-' + escapeAttribute(formatClientVideoSkipDuration(skipBackwardSeconds)) : "") + '" aria-label="' + escapeAttribute(skipBackwardLabel) + '"></button>'
      + '<button type="button" class="rx-video-zone rx-video-zone-center" data-rx-video-zone="center" data-resux-video-zone="center" data-rx-skip-indicator="" aria-label="Toggle play or pause video"></button>'
      + '<button type="button" class="rx-video-zone rx-video-zone-right" data-rx-video-zone="right" data-resux-video-zone="right" data-rx-video-side-action="' + escapeAttribute(String(skipForwardSeconds)) + '" data-rx-skip-indicator="' + (sideSkipEnabled ? '+' + escapeAttribute(formatClientVideoSkipDuration(skipForwardSeconds)) : "") + '" aria-label="' + escapeAttribute(skipForwardLabel) + '"></button>'
      + "</div>"
    : "";
  const controlsMarkup = customControls
    ? '<div class="rx-video-controls resux-video__controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">'
      + '<button type="button" class="rx-video-btn rx-video-toggle resux-video__control" data-rx-video-toggle data-resux-video-control="true" aria-label="Play video">' + escapeHtml(initialPlayIcon) + '</button>'
      + '<span class="rx-video-time" data-rx-video-current' + timeHiddenAttr + '>0:00</span>'
      + '<input class="rx-video-seek" data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek video"' + progressHiddenAttr + '>'
      + '<span class="rx-video-time" data-rx-video-duration' + timeHiddenAttr + '>0:00</span>'
      + '<button type="button" class="rx-video-btn rx-video-mute resux-video__control" data-rx-video-mute data-resux-video-control="true" aria-label="Toggle mute"' + volumeHiddenAttr + '>' + escapeHtml(initialUnmuteIcon) + '</button>'
      + '<input class="rx-video-volume" data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"' + volumeHiddenAttr + '>'
      + speedControlsMarkup
      + qualityControlMarkup
      + '<button type="button" class="rx-video-btn rx-video-fullscreen resux-video__control" data-rx-video-fullscreen data-resux-video-control="true" aria-label="Toggle fullscreen"' + fullscreenHiddenAttr + '>' + escapeHtml(initialFullscreenIcon) + '</button>'
      + "</div>"
    : hasOverlayQuickControls
      ? '<div class="rx-video-controls rx-video-controls-compact resux-video__overlay-controls" data-rx-video-controls data-resux-video-control="true" data-rx-video-controls-compact="true" role="group" aria-label="Video quick controls">'
        + speedControlsMarkup
        + qualityControlMarkup
        + "</div>"
      : "";
  return "<div " + shellAttrs.join(" ") + "><div class=\"resux-video__stage\" data-rx-video-stage data-rx-video-custom-controls=\"" + (customControls ? "true" : "false") + "\">" + videoMarkup + interactionZonesMarkup + controlsMarkup + "</div></div>";
}

function renderClientResuxImg(node, scope, locals, styleScopeId) {
  const input = resolveClientImageRenderInput(node, scope, locals);
  if (!input.src) {
    return "";
  }

  const app = getClientResuxApp();
  const builder = createClientImageBuilder(app.route, app.$config);
  const src = builder(input.src, {
    provider: input.provider,
    cache: input.cache,
    width: input.width,
    height: input.height,
    quality: input.quality,
    fit: input.fit,
    format: input.format,
    modifiers: input.modifiers
  });
  const srcset = buildClientImageSrcset(builder, input);
  return renderClientResuxImgTag(input, src, srcset, styleScopeId);
}

function renderClientResuxPicture(node, scope, locals, styleScopeId) {
  const input = resolveClientImageRenderInput(node, scope, locals);
  if (!input.src) {
    return "";
  }
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }

  const app = getClientResuxApp();
  const builder = createClientImageBuilder(app.route, app.$config);
  const fallbackSource = input.fallbackSrc || input.src;
  const fallbackSrc = builder(fallbackSource, {
    provider: input.provider,
    cache: input.cache,
    width: input.width,
    height: input.height,
    quality: input.quality,
    fit: input.fit,
    modifiers: input.modifiers
  });
  const fallbackSrcset = buildClientImageSrcset(builder, {
    ...input,
    src: fallbackSource,
    format: undefined
  });
  const manualChildren = node.children.map((child) => renderNode(child, scope, locals, styleScopeId)).join("");
  const explicitSources = resolveClientPictureSourceInputs(props.sources, input);
  const sourceInputs = explicitSources.length
    ? explicitSources
    : input.formats.map((format) => ({
      src: input.src,
      widths: input.widths,
      width: input.width,
      height: input.height,
      quality: input.quality,
      format,
      fit: input.fit,
      sizes: input.sizes,
      modifiers: input.modifiers,
      type: clientImageMimeType(format)
    }));
  const generatedSources = sourceInputs
    .map((entry) => {
      const sourceInput = entry;
      const sourceRenderInput = {
        ...input,
        src: sourceInput.src,
        width: sourceInput.width,
        height: sourceInput.height,
        widths: sourceInput.widths,
        sizes: sourceInput.sizes,
        quality: sourceInput.quality,
        format: sourceInput.format,
        fit: sourceInput.fit,
        modifiers: sourceInput.modifiers,
        placeholderSrc: undefined,
        placeholderClass: undefined,
        placeholderStyle: undefined,
        fallbackSrc: undefined,
        attrs: {},
        preload: false,
        deferLazy: input.deferLazy
      };
      const sourceSrcset = sourceInput.srcset || buildClientImageSrcset(builder, sourceRenderInput);
      const sourceUrl = builder(sourceInput.src, {
        provider: input.provider,
        cache: input.cache,
        width: sourceInput.width,
        height: sourceInput.height,
        quality: sourceInput.quality,
        fit: sourceInput.fit,
        format: sourceInput.format,
        modifiers: sourceInput.modifiers
      });
      const resolvedSrcset = sourceSrcset || sourceUrl;
      if (!resolvedSrcset) {
        return "";
      }
      const sourceAttrs = [];
      const sourceType = sourceInput.type
        || (sourceInput.format ? clientImageMimeType(sourceInput.format) : inferClientImageMimeTypeFromSource(sourceInput.src));
      if (sourceType) {
        sourceAttrs.push('type="' + escapeAttribute(sourceType) + '"');
      }
      if (sourceInput.media) {
        sourceAttrs.push('media="' + escapeAttribute(sourceInput.media) + '"');
      }
      if (input.deferLazy) {
        sourceAttrs.push('data-rx-lazy-srcset="' + escapeAttribute(resolvedSrcset) + '"');
        sourceAttrs.push('data-srcset="' + escapeAttribute(resolvedSrcset) + '"');
        if (sourceInput.sizes) {
          sourceAttrs.push('data-rx-lazy-sizes="' + escapeAttribute(sourceInput.sizes) + '"');
        }
      } else {
        sourceAttrs.push('srcset="' + escapeAttribute(resolvedSrcset) + '"');
        if (sourceInput.sizes) {
          sourceAttrs.push('sizes="' + escapeAttribute(sourceInput.sizes) + '"');
        }
      }
      return "<source " + sourceAttrs.join(" ") + ">";
    })
    .filter(Boolean)
    .join("");
  const img = renderClientResuxImgTag(input, fallbackSrc, fallbackSrcset, undefined);
  const attrs = ['data-resux-media="picture"'];
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  return "<picture" + attrText + ">" + manualChildren + generatedSources + img + "</picture>";
}

function resolveClientImageRenderInput(node, scope, locals) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const imageConfig = readClientImageConfig(getClientResuxApp().$config);
  const explicitFormat = readClientStringProp(props.format);
  const explicitFormats = parseClientImageFormats(
    props.formats || (explicitFormat && explicitFormat.includes(",") ? explicitFormat : undefined)
  );
  const hasExplicitQuality = Object.prototype.hasOwnProperty.call(props, "quality");
  const hasExplicitFormat = Object.prototype.hasOwnProperty.call(props, "format");
  const explicitQuality = readClientNumberProp(props.quality);
  const modifiers = normalizeClientImageModifiers({
    ...normalizeClientImageModifiers(props.modifiers),
    ...(hasExplicitFormat && !explicitFormat ? { format: false } : {}),
    ...(hasExplicitQuality && !explicitQuality ? { quality: false } : {})
  });
  const priority = readClientBooleanProp(props.priority, false);
  const preload = readClientBooleanProp(props.preload, priority);
  const explicitLoading = readClientStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readClientBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : !priority);
  const loading = explicitLoading || (lazy ? "lazy" : "eager");
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true;
  const lazyRootMargin = readClientStringProp(props.rootMargin) || "0px 0px";
  const lazyThresholdRaw = Number(props.threshold);
  const lazyThreshold = Number.isFinite(lazyThresholdRaw)
    ? Math.min(1, Math.max(0, lazyThresholdRaw))
    : 0;
  const quality = hasExplicitQuality
    ? explicitQuality
    : (explicitQuality ?? imageConfig.quality);
  const cache = normalizeClientImageCacheValue(props.cache ?? imageConfig.cache);
  const densities = parseClientImageNumberList(props.densities)
    || imageConfig.densities
    || [1, 2];
  const src = readClientStringProp(props.src)
    || readClientStringProp(props.fallbackSrc ?? props.fallback)
    || "";
  return {
    src,
    alt: readClientStringProp(props.alt) || "",
    width: readClientNumberProp(props.width),
    height: readClientNumberProp(props.height),
    sizes: readClientStringProp(props.sizes),
    widths: parseClientImageNumberList(props.widths) || [],
    densities,
    loading,
    decoding: readClientStringProp(props.decoding) || "async",
    fetchPriority: readClientStringProp(props.fetchpriority || props.fetchPriority) || (priority ? "high" : undefined),
    provider: readClientStringProp(props.provider),
    cache,
    quality,
    fit: readClientStringProp(props.fit),
    format: explicitFormats.length
      ? undefined
      : (hasExplicitFormat ? explicitFormat : (explicitFormat || imageConfig.format)),
    formats: explicitFormats,
    placeholderSrc: resolveClientPlaceholderSource(props.placeholder),
    placeholderClass: readClientStringProp(props.placeholderClass),
    placeholderStyle: readClientStringProp(props.placeholderStyle),
    fallbackSrc: readClientStringProp(props.fallbackSrc ?? props.fallback),
    modifiers,
    attrs: collectClientImageAttrs(props),
    preload,
    deferLazy,
    lazyRootMargin,
    lazyThreshold
  };
}

function collectClientImageAttrs(props) {
  const attrs = {};
  for (const [name, rawValue] of Object.entries(props)) {
    if (clientImageReservedProps.has(name)) {
      continue;
    }
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue;
    }
    const attrName = name === "className"
      ? "class"
      : name === "referrerPolicy"
        ? "referrerpolicy"
        : name === "crossOrigin"
          ? "crossorigin"
          : name;
    attrs[attrName] = stringifyAttributeValue(attrName, rawValue);
  }
  return attrs;
}

function normalizeClientImageModifiers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const modifiers = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === false) {
      if (key === "format" || key === "quality") {
        modifiers[key] = false;
      }
      continue;
    }
    if (entry === undefined || entry === null) {
      continue;
    }
    if (key === "cache") {
      continue;
    }
    if (key === "width" || key === "height" || key === "quality") {
      const numeric = Number(entry);
      if (Number.isFinite(numeric) && numeric > 0) {
        modifiers[key] = Math.round(numeric);
      }
      continue;
    }
    modifiers[key] = entry;
  }
  return modifiers;
}

function buildClientImageSrcset(builder, input) {
  const widthCandidates = resolveClientImageWidthCandidates(input);
  if (widthCandidates.length) {
    return widthCandidates
      .map((width) => builder(input.src, {
        provider: input.provider,
        cache: input.cache,
        width,
        height: resolveClientImageCandidateHeight(input, width),
        quality: input.quality,
        fit: input.fit,
        format: input.format,
        modifiers: input.modifiers
      }) + " " + width + "w")
      .join(", ");
  }
  if (!input.width || !input.densities.length) {
    return undefined;
  }
  return [...new Set(input.densities)]
    .sort((left, right) => left - right)
    .map((density) => {
      const width = Math.max(1, Math.round(input.width * density));
      const height = input.height ? Math.max(1, Math.round(input.height * density)) : undefined;
      return builder(input.src, {
        provider: input.provider,
        cache: input.cache,
        width,
        height,
        quality: input.quality,
        fit: input.fit,
        format: input.format,
        modifiers: input.modifiers
      }) + " " + density + "x";
    })
    .join(", ");
}

function resolveClientImageWidthCandidates(input) {
  const explicitWidths = input.widths.length
    ? normalizeClientImageWidthCandidates(input.widths, input.width)
    : [];
  if (explicitWidths.length) {
    return explicitWidths;
  }
  if (!input.sizes) {
    return [];
  }
  return resolveClientImageWidthsFromSizes(input.sizes, input.densities, input.width);
}

function resolveClientImageWidthsFromSizes(sizes, densities, maxWidth) {
  const descriptors = String(sizes)
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const baseWidths = [];
  for (const descriptor of descriptors) {
    const matches = [...descriptor.matchAll(/([0-9]*\.?[0-9]+)\s*(px|vw)\b/g)];
    const match = matches[matches.length - 1];
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (match[2] === "px") {
      baseWidths.push(Math.round(value));
      continue;
    }
    for (const viewportWidth of RESUX_CLIENT_RESPONSIVE_VIEWPORT_WIDTHS) {
      baseWidths.push(Math.round((viewportWidth * value) / 100));
    }
  }

  const safeDensities = densities.length
    ? [...new Set(densities)]
      .filter((entry) => Number.isFinite(entry) && entry > 0)
      .sort((left, right) => left - right)
    : [1];
  const expandedWidths = baseWidths.flatMap((width) =>
    safeDensities.map((density) => Math.round(width * density))
  );

  if (!expandedWidths.length && Number.isFinite(maxWidth) && maxWidth > 0) {
    return [Math.max(1, Math.round(maxWidth))];
  }
  return normalizeClientImageWidthCandidates(expandedWidths, maxWidth);
}

function normalizeClientImageWidthCandidates(candidates, maxWidth) {
  const resolvedMaxWidth = Number.isFinite(maxWidth) && maxWidth > 0
    ? Math.round(maxWidth)
    : Number.POSITIVE_INFINITY;
  const normalized = [...new Set(candidates
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.min(8192, Math.max(1, Math.round(entry)), resolvedMaxWidth)))]
    .sort((left, right) => left - right);
  const compacted = [];
  for (const width of normalized) {
    const previous = compacted[compacted.length - 1];
    const shouldKeep = previous === undefined
      || width - previous >= 24
      || (Number.isFinite(resolvedMaxWidth) && width === resolvedMaxWidth);
    if (shouldKeep) {
      compacted.push(width);
    }
  }
  return compacted;
}

function resolveClientImageCandidateHeight(input, width) {
  if (!input.height) {
    return undefined;
  }
  if (!input.width) {
    return input.height;
  }
  const scaledHeight = Math.round((input.height / input.width) * width);
  return Math.max(1, scaledHeight);
}

function renderClientResuxImgTag(input, src, srcset, styleScopeId) {
  const attrs = [];
  const isDeferredLazy = input.deferLazy && String(input.loading || "").toLowerCase() === "lazy";
  const placeholderSrc = input.placeholderSrc;
  const placeholderClass = input.placeholderClass;
  const placeholderStyle = input.placeholderStyle;
  const aspectRatioStyle = resolveClientAspectRatioStyle(input.width, input.height, input.attrs.style, placeholderStyle);
  const placeholderBackground = placeholderSrc
    ? "background-image: url('" + placeholderSrc + "'); background-size: cover; background-position: center; background-repeat: no-repeat"
    : undefined;
  const mergedClass = mergeClientClassNames(input.attrs.class, placeholderClass);
  const mergedStyle = mergeClientInlineStyles(
    input.attrs.style,
    aspectRatioStyle,
    placeholderBackground,
    placeholderStyle
  );
  const initialSrc = isDeferredLazy
    ? RESUX_LAZY_PLACEHOLDER_SRC
    : src;
  const mergedAttrs = {
    ...input.attrs,
    ...(mergedClass ? { class: mergedClass } : {}),
    ...(mergedStyle ? { style: mergedStyle } : {}),
    src: initialSrc,
    alt: input.alt,
    loading: input.loading,
    decoding: input.decoding,
    "data-resux-media": "img",
    "data-resux-img": isDeferredLazy ? "idle" : "loading",
    ...(!isDeferredLazy ? { "data-resux-loading": "true" } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-image": "true" } : {}),
    ...(isDeferredLazy ? { "data-resux-lazy": "true" } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-src": src, "data-src": src } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-root-margin": input.lazyRootMargin } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-threshold": String(input.lazyThreshold) } : {}),
    ...(isDeferredLazy && srcset ? { "data-rx-lazy-srcset": srcset, "data-srcset": srcset } : {}),
    ...(isDeferredLazy && input.sizes ? { "data-rx-lazy-sizes": input.sizes } : {}),
    ...(placeholderSrc ? { "data-rx-placeholder-src": placeholderSrc, "data-placeholder": placeholderSrc } : {}),
    ...(placeholderClass ? { "data-rx-placeholder-class": placeholderClass } : {}),
    ...(placeholderStyle ? { "data-rx-placeholder-style": placeholderStyle } : {}),
    ...(placeholderSrc ? { "data-rx-placeholder-active": "true", "data-resux-placeholder-active": "true" } : {}),
    ...(input.fallbackSrc ? { "data-rx-fallback-src": input.fallbackSrc } : {}),
    ...(input.fetchPriority ? { fetchpriority: input.fetchPriority } : {}),
    ...(input.width ? { width: String(input.width) } : {}),
    ...(input.height ? { height: String(input.height) } : {}),
    ...(!isDeferredLazy && srcset ? { srcset } : {}),
    ...(!isDeferredLazy && input.sizes ? { sizes: input.sizes } : {})
  };
  for (const [name, value] of Object.entries(mergedAttrs)) {
    if (value === undefined || value === null) {
      continue;
    }
    attrs.push(name + '="' + escapeAttribute(String(value)) + '"');
  }
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  return "<img" + attrText + ">";
}

function parseClientImageFormats(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  return value.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

function parseClientImageNumberList(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!values) {
    return undefined;
  }
  const numbers = values
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.round(entry));
  return numbers.length ? numbers : undefined;
}

function readClientStringProp(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function readClientNumberProp(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed);
}

function readClientBooleanProp(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "") {
      return true;
    }
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
}

function resolveClientPlaceholderSource(value) {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }
  if (value === true) {
    return RESUX_DEFAULT_PLACEHOLDER_SRC;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return RESUX_DEFAULT_PLACEHOLDER_SRC;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return undefined;
  }
  if (normalized === "empty") {
    return undefined;
  }
  const modeSource = createClientModePlaceholderDataUri(normalized);
  if (modeSource) {
    return modeSource;
  }
  if (looksLikeClientMediaSource(trimmed)) {
    return trimmed;
  }
  return createClientTextPlaceholderDataUri(trimmed);
}

function createClientModePlaceholderDataUri(mode) {
  if (mode === "blur") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Blur placeholder">'
      + '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0b1220"/></linearGradient></defs>'
      + '<rect width="800" height="450" fill="url(#g)"/>'
      + '<rect x="32" y="32" width="736" height="386" rx="28" fill="rgba(255,255,255,0.06)"/>'
      + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  if (mode === "skeleton") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Skeleton placeholder">'
      + '<rect width="800" height="450" fill="#0f172a"/>'
      + '<rect x="32" y="32" width="736" height="386" rx="28" fill="#1e293b"/>'
      + '<rect x="72" y="290" width="420" height="24" rx="12" fill="#334155"/>'
      + '<rect x="72" y="330" width="300" height="20" rx="10" fill="#475569"/>'
      + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  if (mode === "spinner") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Spinner placeholder">'
      + '<rect width="800" height="450" fill="#0f172a"/>'
      + '<circle cx="400" cy="225" r="62" fill="none" stroke="#334155" stroke-width="14"/>'
      + '<path d="M400 163a62 62 0 0 1 54 31" fill="none" stroke="#38bdf8" stroke-width="14" stroke-linecap="round"/>'
      + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  return undefined;
}

function looksLikeClientMediaSource(value) {
  return value.startsWith("/")
    || value.startsWith("./")
    || value.startsWith("../")
    || value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("data:image/")
    || value.startsWith("blob:");
}

function createClientTextPlaceholderDataUri(value) {
  const safeLabel = escapeClientSvgText(value);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="' + safeLabel + '">'
    + '<rect width="640" height="360" fill="#0f172a"/>'
    + '<rect x="24" y="24" width="592" height="312" rx="20" fill="#111827" stroke="#334155" stroke-width="2"/>'
    + '<text x="320" y="192" fill="#cbd5e1" font-size="30" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">' + safeLabel + '</text>'
    + '</svg>';
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function escapeClientSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mergeClientClassNames() {
  const values = Array.from(arguments);
  const tokens = values
    .flatMap((value) => String(value || "").split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.length ? [...new Set(tokens)].join(" ") : undefined;
}

function mergeClientInlineStyles() {
  const values = Array.from(arguments);
  const parts = values
    .flatMap((value) => String(value || "").split(";"))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
}

function hasClientInlineStyleProperty(styleValue, propertyName) {
  if (typeof styleValue !== "string") {
    return false;
  }
  const normalized = String(propertyName).replace(/[.*+?^{}$()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("(^|;)\\s*" + normalized + "\\s*:", "i");
  return pattern.test(styleValue);
}

function resolveClientAspectRatioStyle(width, height) {
  const styleValues = Array.from(arguments).slice(2);
  if (!width || !height) {
    return undefined;
  }
  if (styleValues.some((entry) => hasClientInlineStyleProperty(entry, "aspect-ratio"))) {
    return undefined;
  }
  return "aspect-ratio: " + width + " / " + height;
}

function inferClientImageMimeTypeFromSource(src) {
  const clean = String(src || "").split(/[?#]/)[0].toLowerCase();
  if (!clean) {
    return undefined;
  }
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex < 0) {
    return undefined;
  }
  const extension = clean.slice(dotIndex + 1);
  if (!extension) {
    return undefined;
  }
  return clientImageMimeType(extension);
}

function resolveClientPictureSourceInputs(value, fallbackInput) {
  if (!Array.isArray(value)) {
    return [];
  }
  const resolved = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry;
    const src = readClientStringProp(record.src) || fallbackInput.src;
    if (!src) {
      continue;
    }
    const hasQuality = Object.prototype.hasOwnProperty.call(record, "quality");
    const hasFormat = Object.prototype.hasOwnProperty.call(record, "format");
    const explicitFormat = readClientStringProp(record.format);
    const explicitQuality = readClientNumberProp(record.quality);
    const widths = parseClientImageNumberList(record.widths) || fallbackInput.widths;
    const baseModifiers = normalizeClientImageModifiers(record.modifiers);
    const modifiers = normalizeClientImageModifiers({
      ...fallbackInput.modifiers,
      ...baseModifiers,
      ...(hasFormat && !explicitFormat ? { format: false } : {}),
      ...(hasQuality && !explicitQuality ? { quality: false } : {}),
      ...(readClientStringProp(record.fit) ? { fit: readClientStringProp(record.fit) } : {}),
      ...(readClientNumberProp(record.width) ? { width: readClientNumberProp(record.width) } : {}),
      ...(readClientNumberProp(record.height) ? { height: readClientNumberProp(record.height) } : {}),
      ...(explicitQuality ? { quality: explicitQuality } : {}),
      ...(explicitFormat ? { format: explicitFormat } : {})
    });
    resolved.push({
      src,
      srcset: readClientStringProp(record.srcset),
      type: readClientStringProp(record.type),
      media: readClientStringProp(record.media),
      sizes: readClientStringProp(record.sizes) || fallbackInput.sizes,
      width: readClientNumberProp(record.width) || fallbackInput.width,
      height: readClientNumberProp(record.height) || fallbackInput.height,
      widths,
      quality: hasQuality ? explicitQuality : fallbackInput.quality,
      format: hasFormat ? explicitFormat : fallbackInput.format,
      fit: readClientStringProp(record.fit) || fallbackInput.fit,
      modifiers
    });
  }
  return resolved;
}

function resolveClientVideoSources(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const sources = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const src = readClientStringProp(entry.src);
    if (!src) {
      continue;
    }
    const quality = normalizeClientVideoQualityLabel(entry.quality)
      || normalizeClientVideoQualityLabel(entry.label);
    sources.push({
      src,
      type: readClientStringProp(entry.type),
      ...(quality ? { quality } : {})
    });
  }
  return sources;
}

function normalizeClientVideoQualityId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return undefined;
  }
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || undefined;
}

function normalizeClientVideoTransformQuality(value) {
  if (value === null || value === undefined || value === false) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return Math.max(144, Math.min(4320, Math.round(value)));
  }
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (!raw) {
      return undefined;
    }
    const numeric = raw.endsWith("p") ? raw.slice(0, -1) : raw;
    const parsed = Number(numeric);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.max(144, Math.min(4320, Math.round(parsed)));
  }
  return undefined;
}

function normalizeClientVideoQualityLabel(value) {
  const numeric = normalizeClientVideoTransformQuality(value);
  return numeric ? String(numeric) + "p" : undefined;
}

function resolveClientVideoQualityOptions(value, fallbackSources, fallbackSrc) {
  if (!Array.isArray(value)) {
    return deriveClientVideoQualityOptionsFromSources(fallbackSources);
  }
  const resolved = [];
  const usedIds = new Set();
  let autoIndex = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const explicitSources = resolveClientVideoSources(entry.sources);
    const directSrc = readClientStringProp(entry.src);
    const directType = readClientStringProp(entry.type);
    const sources = explicitSources.length
      ? explicitSources
      : directSrc
        ? [{ src: directSrc, type: directType }]
        : [];
    if (!sources.length) {
      continue;
    }
    const rawLabel = readClientStringProp(entry.label);
    const rawId = normalizeClientVideoQualityId(entry.id)
      || normalizeClientVideoQualityId(rawLabel)
      || ("q" + String(autoIndex + 1));
    let candidateId = rawId;
    while (usedIds.has(candidateId)) {
      autoIndex += 1;
      candidateId = rawId + "-" + String(autoIndex + 1);
    }
    usedIds.add(candidateId);
    autoIndex += 1;
    const label = rawLabel || candidateId.toUpperCase();
    resolved.push({
      id: candidateId,
      label,
      sources
    });
  }
  if (resolved.length > 0) {
    return resolved;
  }
  const fromSources = deriveClientVideoQualityOptionsFromSources(fallbackSources);
  if (fromSources.length > 0) {
    return fromSources;
  }
  if (fallbackSrc) {
    return [];
  }
  return [];
}

function deriveClientVideoQualityOptionsFromSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }
  const grouped = new Map();
  for (const source of sources) {
    const qualityLabel = normalizeClientVideoQualityLabel(source.quality);
    if (!qualityLabel) {
      continue;
    }
    const id = normalizeClientVideoQualityId(qualityLabel);
    if (!id) {
      continue;
    }
    let entry = grouped.get(id);
    if (!entry) {
      entry = { id, label: qualityLabel, sources: [] };
      grouped.set(id, entry);
    }
    entry.sources.push({
      src: source.src,
      ...(source.type ? { type: source.type } : {}),
      quality: qualityLabel
    });
  }
  const resolved = Array.from(grouped.values())
    .filter((entry) => Array.isArray(entry.sources) && entry.sources.length > 0)
    .sort((left, right) => {
      const leftHeight = normalizeClientVideoTransformQuality(left.label) ?? Number.POSITIVE_INFINITY;
      const rightHeight = normalizeClientVideoTransformQuality(right.label) ?? Number.POSITIVE_INFINITY;
      return leftHeight - rightHeight;
    });
  return resolved.length > 1 ? resolved : [];
}

function resolveClientVideoDefaultQuality(value, qualities) {
  if (!Array.isArray(qualities) || qualities.length === 0) {
    return undefined;
  }
  const explicit = normalizeClientVideoQualityId(value);
  if (explicit && qualities.some((entry) => entry.id === explicit)) {
    return explicit;
  }
  return qualities[0].id;
}

function serializeClientVideoQualityOptions(options) {
  return JSON.stringify((Array.isArray(options) ? options : []).map((entry) => ({
    id: entry.id,
    label: entry.label,
    sources: (Array.isArray(entry.sources) ? entry.sources : []).map((source) => ({
      src: source.src,
      ...(source.type ? { type: source.type } : {})
    }))
  })));
}

function normalizeClientVideoPlaybackSpeed(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 100) / 100;
}

function resolveClientVideoPlaybackSpeeds(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!rawValues) {
    return [0.5, 0.75, 1, 1.25, 1.5, 2];
  }
  const normalized = rawValues
    .map((entry) => normalizeClientVideoPlaybackSpeed(entry))
    .filter((entry) => Number.isFinite(entry));
  const uniqueSorted = [...new Set(normalized)].sort((left, right) => left - right);
  return uniqueSorted.length ? uniqueSorted : [0.5, 0.75, 1, 1.25, 1.5, 2];
}

function resolveClientVideoDefaultSpeed(value, speeds) {
  const fallback = speeds.includes(1) ? 1 : (speeds[0] || 1);
  const explicit = normalizeClientVideoPlaybackSpeed(value);
  if (!explicit) {
    return fallback;
  }
  if (speeds.includes(explicit)) {
    return explicit;
  }
  let nearest = speeds[0] || explicit;
  let nearestDelta = Math.abs(nearest - explicit);
  for (const speed of speeds) {
    const delta = Math.abs(speed - explicit);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function serializeClientVideoPlaybackSpeeds(speeds) {
  return speeds.map((entry) => String(entry)).join(",");
}

function formatClientVideoPlaybackRateLabel(value) {
  const normalized = Number.isFinite(value) && value > 0 ? value : 1;
  const rounded = Math.round(normalized * 100) / 100;
  const text = Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
  return text + "x";
}

function clientImageMimeType(format) {
  const normalized = String(format || "").trim().toLowerCase();
  if (!normalized) {
    return "image/*";
  }
  if (normalized === "jpg") {
    return "image/jpeg";
  }
  return normalized.startsWith("image/") ? normalized : "image/" + normalized;
}

function nativeElementTag(node) {
  if (node.tag === "ResuxLink") {
    return "a";
  }
  if (node.tag === "ResuxImg") {
    return "img";
  }
  if (node.tag === "ResuxPicture") {
    return "picture";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    const asAttr = node.attrs.find(a => a.name === "as");
    return (asAttr && asAttr.kind === "static" ? asAttr.value : "section");
  }
  return node.tag;
}

function nativeAttributeName(node, name) {
  if (node.tag === "ResuxLink" && name === "to") {
    return "href";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    if (name === "options") return "data-resux-options";
    if (name === "name") return "data-resux-enhancement";
    if (name === "trigger") return "data-resux-trigger";
    if (name === "mode") return "data-resux-mode";
    if (name === "noCls") return "data-resux-no-cls";
    if (name === "demo") return "data-resux-demo";
  }
  return name;
}

function applyPatches(scopeId, patches) {
  let needsLazyImageActivation = false;
  let needsDelegatedEventRegistration = false;
  for (const patch of patches) {
    if (patch.type === "text") {
      document.querySelectorAll('[data-rx-text="' + scopeId + ':' + patch.id + '"]').forEach((element) => {
        element.textContent = patch.value;
      });
      continue;
    }
    if (patch.type === "attr") {
      document.querySelectorAll('[data-rx-attr-' + patch.id + '="' + scopeId + ':' + patch.id + '"]').forEach((element) => {
        if (patch.value === "" || patch.value === "false" || patch.value == null) {
          element.removeAttribute(patch.attr);
          if (patch.attr === "checked" && "checked" in element) {
            element.checked = false;
          }
        } else {
          element.setAttribute(patch.attr, patch.value);
          if (patch.attr === "value" && "value" in element) {
            element.value = patch.value;
          }
          if (patch.attr === "checked" && "checked" in element) {
            element.checked = true;
          }
        }
      });
      continue;
    }
    if (patch.type === "html") {
      document.querySelectorAll('[data-rx-html-' + patch.id + '="' + scopeId + ':' + patch.id + '"]').forEach((element) => {
        unmountVueIslands(element);
        element.innerHTML = patch.value;
        void mountVueIslands(element);
        needsLazyImageActivation = true;
        needsDelegatedEventRegistration = true;
      });
      continue;
    }
    document.querySelectorAll('[data-rx-block="' + scopeId + ':' + patch.id + '"]').forEach((element) => {
      unmountVueIslands(element);
      element.innerHTML = patch.value;
      void mountVueIslands(element);
      needsLazyImageActivation = true;
      needsDelegatedEventRegistration = true;
    });
  }
  if (needsLazyImageActivation) {
    activateDeferredLazyMedia();
    applyReducedMotionVideoPreference();
    initializeManagedVideoControls();
  }
  if (needsDelegatedEventRegistration) {
    registerDelegatedEventsFromDom(document);
  }
}

function evaluateExpression(expression, scope, locals) {
  if (scope && scope.__rx_expressions && scope.__rx_expressions[expression]) {
    return scope.__rx_expressions[expression](scope, locals);
  }
  return Function("scope", "locals", "with (scope) { with (locals) { return (" + expression + "); } }")(scope, locals);
}

function serializeRefs(refs) {
  const output = Object.create(null);
  for (const [key, ref] of Object.entries(refs)) {
    output[key] = ref.value;
  }
  return output;
}

function serializeProps(props) {
  const output = {};
  for (const [key, value] of Object.entries(props)) {
    output[key] = value;
  }
  return output;
}

function stringifyValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) || isPlainDisplayObject(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isPlainDisplayObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stringifyAttributeValue(name, value) {
  if (name === "class") {
    return stringifyClassValue(value);
  }

  if (name === "style") {
    return stringifyStyleValue(value);
  }

  return stringifyValue(value);
}

function stringifyClassValue(value) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(stringifyClassValue).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, active]) => Boolean(active))
      .map(([className]) => className)
      .join(" ");
  }

  return String(value);
}

function stringifyStyleValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .filter(([, styleValue]) => styleValue !== null && styleValue !== undefined && styleValue !== false)
      .map(([name, styleValue]) => kebabCaseStyleName(name) + ":" + String(styleValue))
      .join(";");
  }

  return String(value);
}

function kebabCaseStyleName(value) {
  return value.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());
}

const allowedHtmlTags = new Set([
  "a", "abbr", "b", "blockquote", "br", "code", "dd", "del", "div", "dl", "dt", "em",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "ins", "li", "ol", "p",
  "pre", "s", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead",
  "tr", "u", "ul"
]);
const htmlTagsWithRemovedContent = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);
const allowedGlobalHtmlAttrs = new Set(["class", "id", "title", "role"]);
const allowedHtmlAttrsByTag = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"])
};

function sanitizeHtml(value) {
  let html = stringifyValue(value);
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of htmlTagsWithRemovedContent) {
    html = html.replace(new RegExp("<" + tag + "\\b[^>]*>[\\s\\S]*?<\\/" + tag + ">", "gi"), "");
    html = html.replace(new RegExp("<\\/?" + tag + "\\b[^>]*>", "gi"), "");
  }
  return html.replace(/<\/?([A-Za-z][A-Za-z0-9:-]*)\b([^>]*)>/g, (full, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!allowedHtmlTags.has(tag)) {
      return "";
    }
    if (full.startsWith("</")) {
      return "</" + tag + ">";
    }
    const attrs = sanitizeHtmlAttributes(tag, rawAttrs);
    const attrText = attrs.length ? " " + attrs.join(" ") : "";
    return "<" + tag + attrText + ">";
  });
}

function sanitizeHtmlAttributes(tag, rawAttrs) {
  const attrs = [];
  const allowedForTag = allowedHtmlAttrsByTag[tag] ?? new Set();
  const attrPattern = /([^\s"'=<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  let match;
  let hasRel = false;
  let opensBlankTarget = false;
  while ((match = attrPattern.exec(rawAttrs))) {
    const name = match[1].toLowerCase();
    if (name.startsWith("on") || name === "style" || name === "srcdoc") {
      continue;
    }
    if (!allowedGlobalHtmlAttrs.has(name) && !allowedForTag.has(name) && !name.startsWith("aria-")) {
      continue;
    }
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if ((name === "href" || name === "src") && !isSafeHtmlUrl(value)) {
      continue;
    }
    if (name === "target" && value === "_blank") {
      opensBlankTarget = true;
    }
    if (name === "rel") {
      hasRel = true;
    }
    attrs.push(name + '="' + escapeAttribute(value) + '"');
  }
  if (tag === "a" && opensBlankTarget && !hasRel) {
    attrs.push('rel="noopener noreferrer"');
  }
  return attrs;
}

function isSafeHtmlUrl(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return true;
  }
  try {
    const url = new URL(trimmed, "https://resux.local");
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeAsyncDataError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }
  return {
    name: "Error",
    message: String(error)
  };
}

function assertJsonSerializable(value, label) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(label + " must be JSON serializable.");
  }
  try {
    JSON.stringify(value);
  } catch {
    throw new Error(label + " must be JSON serializable.");
  }
}

function cloneJsonSerializable(value, label) {
  assertJsonSerializable(value, label);
  return JSON.parse(JSON.stringify(value));
}

function setSerializableRecordValue(record, key, value) {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

installResux();
`;
}

function serializeRefs(refs: Record<string, Ref<unknown>>): Record<string, JsonValue> {
  const output: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;

  for (const [key, ref] of Object.entries(refs)) {
    assertJsonSerializable(ref.value, key);
    output[key] = ref.value as JsonValue;
  }

  return output;
}

function serializeProps(props: ComponentProps): Record<string, JsonValue> {
  const output: Record<string, JsonValue> = {};

  for (const [key, value] of Object.entries(props)) {
    assertJsonSerializable(value, `prop "${key}"`);
    output[key] = value as JsonValue;
  }

  return output;
}

function serializeAsyncData(refs: Record<string, AsyncDataResource<unknown>>): Record<string, SerializedAsyncData> {
  const output: Record<string, SerializedAsyncData> = Object.create(null);

  for (const [key, resource] of Object.entries(refs)) {
    const value = resource.data.value;
    if (!resource.pending.value && !resource.error.value) {
      assertJsonSerializable(value, `useAsyncData("${key}")`);
    }
    output[key] = {
      value: value === undefined ? null : value as JsonValue,
      pending: resource.pending.value,
      error: resource.error.value
    };
  }

  return output;
}

function normalizeAsyncDataError(error: unknown): AsyncDataError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    name: "Error",
    message: String(error)
  };
}

function assertJsonSerializable(value: unknown, label: string): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(`${label} must be JSON serializable.`);
  }

  try {
    JSON.stringify(value);
  } catch {
    throw new Error(`${label} must be JSON serializable.`);
  }
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) || isPlainDisplayObject(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isPlainDisplayObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stringifyAttributeValue(name: string, value: unknown): string {
  if (name === "class") {
    return stringifyClassValue(value);
  }

  if (name === "style") {
    return stringifyStyleValue(value);
  }

  return stringifyValue(value);
}

function stringifyClassValue(value: unknown): string {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(stringifyClassValue).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, active]) => Boolean(active))
      .map(([className]) => className)
      .join(" ");
  }

  return String(value);
}

function stringifyStyleValue(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, styleValue]) => styleValue !== null && styleValue !== undefined && styleValue !== false)
      .map(([name, styleValue]) => `${kebabCaseStyleName(name)}:${String(styleValue)}`)
      .join(";");
  }

  return String(value);
}

function kebabCaseStyleName(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

const allowedHtmlTags = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "del",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul"
]);

const htmlTagsWithRemovedContent = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template"
]);

const allowedGlobalHtmlAttrs = new Set(["class", "id", "title", "role"]);

const allowedHtmlAttrsByTag: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"])
};

function sanitizeHtml(value: unknown): string {
  let html = stringifyValue(value);

  html = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of htmlTagsWithRemovedContent) {
    html = html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }

  return html.replace(/<\/?([A-Za-z][A-Za-z0-9:-]*)\b([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!allowedHtmlTags.has(tag)) {
      return "";
    }

    if (full.startsWith("</")) {
      return `</${tag}>`;
    }

    const attrs = sanitizeHtmlAttributes(tag, rawAttrs);
    const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    return `<${tag}${attrText}>`;
  });
}

function sanitizeHtmlAttributes(tag: string, rawAttrs: string): string[] {
  const attrs: string[] = [];
  const allowedForTag = allowedHtmlAttrsByTag[tag] ?? new Set<string>();
  const attrPattern = /([^\s"'=<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  let match: RegExpExecArray | null;
  let hasRel = false;
  let opensBlankTarget = false;

  while ((match = attrPattern.exec(rawAttrs))) {
    const name = match[1].toLowerCase();
    if (name.startsWith("on") || name === "style" || name === "srcdoc") {
      continue;
    }
    if (!allowedGlobalHtmlAttrs.has(name) && !allowedForTag.has(name) && !name.startsWith("aria-")) {
      continue;
    }

    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if ((name === "href" || name === "src") && !isSafeHtmlUrl(value)) {
      continue;
    }
    if (name === "target" && value === "_blank") {
      opensBlankTarget = true;
    }
    if (name === "rel") {
      hasRel = true;
    }

    attrs.push(`${name}="${escapeAttribute(value)}"`);
  }

  if (tag === "a" && opensBlankTarget && !hasRel) {
    attrs.push('rel="noopener noreferrer"');
  }

  return attrs;
}

function isSafeHtmlUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return true;
  }

  try {
    const url = new URL(trimmed, "https://resux.local");
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isComponentTag(tag: string): boolean {
  return /^[A-Z]/.test(tag);
}

function escapeJsonForHtml(value: string): string {
  return value.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = typeof value === "string" ? value : String(value);
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return escapeHtml(value).replaceAll('"', "&quot;");
}
