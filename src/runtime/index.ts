import { getQuery as h3GetQuery, readBody as h3ReadBody, setHeader as h3SetHeader } from "h3";
import { iconRegistry, type IconData } from "../icons/registry.js";
import { cspDirectiveSources, dedupeHeadScripts } from "../head/utils.js";
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
import type { ComputedRef, MaybeRefOrGetter, Ref, WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from "../reactivity/index.js";
import {
  getResumeBootstrapSource,
  RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH,
  RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES,
} from "./resume.js";
import {
  useViewTransition,
  type ResuxViewTransition,
} from "./view-transitions/index.js";

import { clientRuntimePart01 } from "./client-source/part-01.js";
import { clientRuntimePart02 } from "./client-source/part-02.js";
import { clientRuntimePart03 } from "./client-source/part-03.js";
import { clientRuntimePart04 } from "./client-source/part-04.js";
import { clientRuntimePart05 } from "./client-source/part-05.js";
import { clientRuntimePart06 } from "./client-source/part-06.js";
import { clientRuntimePart07 } from "./client-source/part-07.js";
import { clientRuntimePart08 } from "./client-source/part-08.js";
import { clientRuntimePart09 } from "./client-source/part-09.js";

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
export { useViewTransition } from "./view-transitions/index.js";
export type { ResuxViewTransition, ResuxViewTransitionOptions } from "./view-transitions/index.js";

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
  viewTransition?: boolean;
  [key: string]: unknown;
}

export type HeadAttributePrimitive = string | number | boolean | null | undefined;
export type HeadAttributeStyle = Record<string, HeadAttributePrimitive>;
export type HeadAttributeValue =
  | HeadAttributePrimitive
  | HeadAttributeStyle
  | Array<HeadAttributePrimitive | HeadAttributeStyle>;
export type HeadAttributes = Record<string, HeadAttributeValue>;

export interface HeadEntry {
  title?: string;
  meta?: Array<Record<string, string>>;
  link?: Array<Record<string, string>>;
  style?: Array<ComponentStyle | HeadTextContentStyle>;
  script?: Array<Record<string, unknown>>;
  noscript?: Array<Record<string, unknown> | string>;
  htmlAttrs?: HeadAttributes;
  bodyAttrs?: HeadAttributes;
}

type ReactiveHeadValue<T> =
  T extends Array<infer Item>
    ? MaybeRefOrGetter<Array<ReactiveHeadValue<Item>>>
    : T extends object
      ? MaybeRefOrGetter<{ [Key in keyof T]: ReactiveHeadValue<T[Key]> }>
      : MaybeRefOrGetter<T>;

export type HeadInput = {
  [Key in keyof HeadEntry]?: ReactiveHeadValue<NonNullable<HeadEntry[Key]>>;
};

export interface ComponentStyle {
  id: string;
  css: string;
  scoped?: boolean;
}

export interface HeadTextContentStyle {
  id: string;
  textContent: string;
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
  locals?: string[];
  /** On a component tag: a DOM event that falls through to the child's root element. */
  native?: boolean;
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
  ref?: string;
  /** On a `<template #name>` child: which slot it provides and how its props are bound. */
  slot?: SlotProvider;
  /** On a component element: the named slots it provides (default slot included when it has content). */
  slots?: Record<string, SlotDefinition>;
  /** Identifies the slots of this component element so a resumed child can ask the parent to render them. */
  slotsId?: string;
  /** Parent template locals the slot content reads (captured by value for resume). */
  slotLocals?: string[];
}

export type SlotParam =
  | { kind: "ident"; name: string }
  | { kind: "pairs"; pairs: { key: string; local: string }[] };

export interface SlotProvider {
  name: string;
  param?: SlotParam;
}

export interface SlotDefinition {
  param?: SlotParam;
  children: TemplateNode[];
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
  useViewTransition(): ResuxViewTransition;
  useHead(input: HeadInput): void;
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
  templateRefs?: string[];
  templateForRefs?: string[];
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
  emits?: Record<string, ComponentEmitBinding>;
  slots?: Record<string, ComponentSlotBinding>;
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
  /** Component tag -> module id for components that client-rendered blocks (v-if/v-for) may need to create. */
  componentIds?: Record<string, string>;
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
  teleports?: Record<string, string>;
}

export interface RenderHtmlContext {
  htmlAttrs: string[];
  head: string[];
  bodyPrepend: string[];
  body: string[];
  bodyAppend: string[];
  bodyAttrs: string[];
}

export interface RenderDocumentOptions {
  devReload?: boolean;
  isStatic?: boolean;
  nonce?: string;
  csp?: string;
  fallbackViewport?: boolean;
  hooks?: {
    callHook(name: string, ...args: any[]): Promise<void> | void;
  };
}

// A slot written on a component tag (<Child><template #header>...</template></Child>) is re-rendered on the
// client from the parent's scope. ref names the parent scope, module and slots id; locals carry v-for values.
export interface ComponentSlotBinding {
  ref: string;
  locals?: Record<string, JsonValue>;
}

export interface ComponentEmitBinding {
  handler: string;
  locals?: Record<string, JsonValue>;
}

interface ScopeRecord {
  emits?: Record<string, ComponentEmitBinding>;
  slots?: Record<string, ComponentSlotBinding>;
  id: string;
  moduleId: string;
  props: Record<string, unknown>;
  stateRefs: Record<string, Ref<unknown>>;
  globalStateKeys: Set<string>;
  asyncDataRefs: Record<string, AsyncDataResource<unknown>>;
}

type ComponentProps = Record<string, unknown>;
type AsyncRenderSlot = (suppressTeleportReservations?: boolean) => Promise<string>;
// name and props select a named or scoped slot of a component. A result of undefined means the slot was not
// provided, so the <slot> renders its fallback content.
type AsyncRenderNamedSlot = (
  suppressTeleportReservations?: boolean,
  name?: string,
  props?: Record<string, unknown>,
) => Promise<string | undefined>;
type AsyncRenderComponent = (
  component: ComponentDefinition,
  props?: ComponentProps,
  renderSlot?: AsyncRenderNamedSlot,
  suppressTeleportReservations?: boolean,
  emits?: Record<string, ComponentEmitBinding>,
  slots?: Record<string, ComponentSlotBinding>,
  rootAttrs?: string[],
) => Promise<string>;

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
  suppressTeleportReservations?: boolean;
  renderPage?: AsyncRenderSlot;
  renderSlot?: AsyncRenderNamedSlot;
  renderLayout?: (
    name: string | false | undefined,
    slot: AsyncRenderSlot,
    suppressTeleportReservations?: boolean,
  ) => Promise<string>;
  reserveTeleport?: (target: string) => number | undefined;
  commitTeleport?: (reservation: number, html: string) => void;
}
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
    }
  }

  const disposers = [...resuxActiveEnhancementDisposers];
  resuxActiveEnhancementDisposers.clear();
  for (const dispose of disposers) {
    try {
      await dispose();
    } catch {
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

const EAGER_CLIENT_RUNTIME_HTML_ATTRIBUTES = [
  "data-rx-lazy-image",
  "data-rx-lazy-video",
  "data-resux-img",
  "data-rx-teleport-source",
] as const;

const EAGER_CLIENT_RUNTIME_HTML_ATTRIBUTE_PREFIXES = [
  "data-rx-video-",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function htmlAttributePattern(attribute: string, matchPrefix = false): string {
  const escaped = escapeRegExp(attribute);
  const suffix = matchPrefix ? "[\\w:-]*" : "";
  return `${escaped}${suffix}(?:\\s*=|\\s|/?>)`;
}

function htmlHasAttribute(html: string, attribute: string): boolean {
  return new RegExp(`<[A-Za-z][^>]*\\s${htmlAttributePattern(attribute)}`, "i").test(html);
}

function htmlHasAttributePrefix(html: string, prefix: string): boolean {
  return new RegExp(`<[A-Za-z][^>]*\\s${htmlAttributePattern(prefix, true)}`, "i").test(html);
}

function collectHtmlTagsWithAttribute(html: string, attribute: string): string[] {
  return html.match(
    new RegExp(`<[A-Za-z][^>]*\\s${htmlAttributePattern(attribute)}[^>]*>`, "gi"),
  ) ?? [];
}

function readHtmlAttribute(tag: string, attribute: string): string | undefined {
  const escaped = escapeRegExp(attribute);
  const match = new RegExp(
    `\\s${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  ).exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function collectEnhancementTriggers(html: string): ClientEnhancementTrigger[] {
  const tags = new Set([
    ...collectHtmlTagsWithAttribute(html, "data-resux-enhancement"),
    ...collectHtmlTagsWithAttribute(html, "use-client-enhancement"),
  ]);
  return [...tags].map((tag) => normalizeEnhancementTrigger(
    readHtmlAttribute(tag, "data-resux-trigger")
      ?? readHtmlAttribute(tag, "data-trigger")
      ?? readHtmlAttribute(tag, "trigger"),
    "visible",
  ));
}

function collectVueIslandTriggers(html: string): ClientEnhancementTrigger[] {
  return collectHtmlTagsWithAttribute(html, "data-rx-vue-island").map((tag) =>
    normalizeEnhancementTrigger(readHtmlAttribute(tag, "data-rx-vue-trigger"), "immediate")
  );
}

export type ResuxClientBootMode = "none" | "interaction" | "eager";

export interface ResuxClientBootPlan {
  mode: ResuxClientBootMode;
  eventNames: string[];
  deferEnhancements: boolean;
  deferVueIslands: boolean;
}

function collectResumableEventNames(html: string): string[] {
  const names = new Set<string>();
  const tagPattern = /<[A-Za-z][^>]*>/g;
  const eventPattern = /\sdata-rx-on-([\w:-]+)\s*=/g;
  for (const tagMatch of html.matchAll(tagPattern)) {
    const tag = tagMatch[0];
    for (const eventMatch of tag.matchAll(eventPattern)) {
      if (eventMatch[1]) names.add(eventMatch[1]);
    }
  }
  return [...names];
}

function canUseResumeBootstrapForEvents(eventNames: string[]): boolean {
  return (
    eventNames.length <= RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES
    && eventNames.every((name) => name.length <= RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH)
  );
}

function selectedClientMiddlewareNeedsRuntime(payload: ResuxPayload): boolean {
  const configured = payload.pageMeta?.middleware;
  const selectedNames = new Set(
    (Array.isArray(configured) ? configured : configured ? [configured] : [])
      .map((name) => String(name)),
  );

  return Boolean(payload.middleware?.some((middleware) =>
    middleware.mode === "client"
    && (middleware.global || selectedNames.has(middleware.name))
  ));
}

function htmlHasEagerManagedTeleport(html: string): boolean {
  const pattern = /<!--resux-teleport-source:([^>]*)-->/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const metadata = JSON.parse(decodeURIComponent(match[1] ?? "")) as {
        disabled?: boolean;
        bindings?: Record<string, unknown>;
      };
      if (!metadata.disabled || Object.keys(metadata.bindings ?? {}).length > 0) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return false;
}

function hasEagerClientRuntimeWork(
  result: RenderResult,
  enhancementTriggers: ClientEnhancementTrigger[],
  vueIslandTriggers: ClientEnhancementTrigger[],
): boolean {
  if (
    EAGER_CLIENT_RUNTIME_HTML_ATTRIBUTES.some((attribute) => htmlHasAttribute(result.html, attribute))
    || htmlHasEagerManagedTeleport(result.html)
  ) {
    return true;
  }

  if (EAGER_CLIENT_RUNTIME_HTML_ATTRIBUTE_PREFIXES.some((prefix) => htmlHasAttributePrefix(result.html, prefix))) {
    return true;
  }

  if (enhancementTriggers.includes("immediate") || vueIslandTriggers.includes("immediate")) {
    return true;
  }

  if (Object.values(result.payload.scopes ?? {}).some((scope) =>
    Object.values(scope.asyncData ?? {}).some((entry) => Boolean(entry?.pending))
  )) {
    return true;
  }

  if (result.payload.plugins?.some((plugin) => plugin.mode !== "server")) {
    return true;
  }

  if (selectedClientMiddlewareNeedsRuntime(result.payload)) {
    return true;
  }

  return false;
}

export function getClientRuntimeBootPlan(result: RenderResult): ResuxClientBootPlan {
  const eventNames = collectResumableEventNames(result.html);
  const enhancementTriggers = collectEnhancementTriggers(result.html);
  const vueIslandTriggers = collectVueIslandTriggers(result.html);
  const deferEnhancements = enhancementTriggers.some((trigger) => trigger !== "immediate");
  const deferVueIslands = vueIslandTriggers.some((trigger) => trigger !== "immediate");

  if (
    hasEagerClientRuntimeWork(result, enhancementTriggers, vueIslandTriggers)
    || !canUseResumeBootstrapForEvents(eventNames)
  ) {
    return { mode: "eager", eventNames, deferEnhancements: false, deferVueIslands: false };
  }
  if (eventNames.length > 0 || deferEnhancements || deferVueIslands) {
    return { mode: "interaction", eventNames, deferEnhancements, deferVueIslands };
  }
  return { mode: "none", eventNames: [], deferEnhancements: false, deferVueIslands: false };
}

export function shouldLoadClientRuntime(result: RenderResult): boolean {
  return getClientRuntimeBootPlan(result).mode !== "none";
}

function getBuiltinFrameworkStyles(nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${escapeAttribute(nonce)}"` : "";
  return `<style${nonceAttr}>
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
  width: 100%;
  height: 100%;
  transform: scaleX(var(--resux-progress-scale, 0.08));
  transform-origin: left center;
  will-change: transform;
  background: var(--resux-loader-color, #2563eb);
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.45);
  transition: transform 160ms ease, background 160ms ease;
}
html[dir="rtl"] [data-rx-loading-indicator] .rx-loading-progress {
  transform-origin: right center;
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
@media (prefers-reduced-motion: reduce) {
  [data-rx-loading-indicator] .rx-loading-progress {
    transition: none;
  }
}
</style>`;
}

function createDefaultHtmlContext(
  result: RenderResult,
  title = "Resux App",
  options: RenderDocumentOptions = {},
): RenderHtmlContext {
  const bootPlan = getClientRuntimeBootPlan(result);
  const needsClientRuntime = bootPlan.mode !== "none";
  const payload = needsClientRuntime
    ? escapeJsonForHtml(JSON.stringify(result.payload))
    : "";
  const resumeBootstrap = bootPlan.mode === "interaction"
    ? getResumeBootstrapSource({
      eventNames: bootPlan.eventNames,
      deferEnhancements: bootPlan.deferEnhancements,
      deferVueIslands: bootPlan.deferVueIslands,
    })
    : "";
  const mergedHead = mergeHead([{ title }, result.head]);
  const hasExplicitCharset = (mergedHead.meta ?? []).some((meta) => meta.charset !== undefined);
  const hasExplicitViewport = (mergedHead.meta ?? []).some(
    (meta) => typeof meta.name === "string" && meta.name.toLowerCase() === "viewport"
  );
  const csp = options.csp ?? extractCspFromHead(mergedHead);
  const nonce = options.nonce ?? (result.payload?.config as any)?.resuxSecurity?.nonce;
  const htmlAttrs = {
    lang: "en",
    ...(mergedHead.htmlAttrs ?? {})
  };
  const renderedHtmlAttrs = renderAttributes(htmlAttrs);
  const renderedBodyAttrs = renderAttributes(mergedHead.bodyAttrs ?? {});
  const defaultTeleportHtml = result.teleports?.["#teleports"] ?? "";
  const renderedAppHtml = result.html;
  const defaultTeleportTarget =
    `<div id="teleports" data-rx-teleport-fallback="true">${defaultTeleportHtml}</div>`;

  const headElements: string[] = [
    ...(hasExplicitCharset ? [] : ['<meta charset="utf-8">']),
    ...(hasExplicitViewport ? [] : ['<meta name="viewport" content="width=device-width, initial-scale=1">']),
    renderHead(mergedHead, { nonce, csp }),
    getBuiltinFrameworkStyles(nonce),
  ];

  const bodyElements: string[] = [
    '<div id="__resux">',
    renderedAppHtml,
    "</div>",
    defaultTeleportTarget,
    needsClientRuntime
      ? ((options.isStatic || (typeof process !== "undefined" && process.env?.RESUX_STATIC))
        ? `<script>window.__RESUX__=${payload};window.__RESUX_STATIC__=true;</script>`
        : `<script>window.__RESUX__=${payload}</script>`)
      : "",
    options.devReload ? getDevReloadScript() : "",
    bootPlan.mode === "eager"
      ? '<script type="module" src="/__resux/runtime-client.mjs"></script>'
      : (bootPlan.mode === "interaction"
        ? `<script type="module">${resumeBootstrap}</script>`
        : ""),
  ];

  return {
    htmlAttrs: renderedHtmlAttrs ? [renderedHtmlAttrs] : [],
    head: headElements,
    bodyPrepend: [],
    body: bodyElements,
    bodyAppend: [],
    bodyAttrs: renderedBodyAttrs ? [renderedBodyAttrs] : [],
  };
}

function assembleHtmlDocument(htmlContext: RenderHtmlContext): string {
  const htmlOpen = htmlContext.htmlAttrs.length ? `<html ${htmlContext.htmlAttrs.join(" ")}>` : "<html>";
  const bodyOpen = htmlContext.bodyAttrs.length ? `<body ${htmlContext.bodyAttrs.join(" ")}>` : "<body>";

  return [
    "<!doctype html>",
    htmlOpen,
    "<head>",
    ...htmlContext.head,
    "</head>",
    bodyOpen,
    ...htmlContext.bodyPrepend,
    ...htmlContext.body,
    ...htmlContext.bodyAppend,
    "</body>",
    "</html>",
  ].join("");
}

export function renderDocument(
  result: RenderResult,
  title = "Resux App",
  options: RenderDocumentOptions = {},
): string {
  const htmlContext = createDefaultHtmlContext(result, title, options);

  if (options.hooks) {
    const hookResult = options.hooks.callHook("render:html", htmlContext);
    if (hookResult && typeof (hookResult as any).catch === "function") {
      (hookResult as Promise<void>).catch((err) => {
        console.error("[resux] Error in render:html hook:", err);
      });
    }
  }

  return assembleHtmlDocument(htmlContext);
}

export async function renderDocumentAsync(
  result: RenderResult,
  title = "Resux App",
  options: RenderDocumentOptions = {},
): Promise<string> {
  const htmlContext = createDefaultHtmlContext(result, title, options);

  if (options.hooks) {
    await options.hooks.callHook("render:html", htmlContext);
  }

  return assembleHtmlDocument(htmlContext);
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
if (typeof window !== "undefined") {
  const checkStylesheets = () => {
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      link.addEventListener("error", () => {
        console.warn(\`[resux] Warning: Stylesheet "\${href}" failed to load.\`);
      });
      if ((!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("//")) || href.startsWith(window.location.origin)) {
        fetch(href, { method: "HEAD" }).then((res) => {
          if (!res.ok) {
            console.warn(\`[resux] Warning: Stylesheet "\${href}" failed with HTTP \${res.status}.\`);
            return;
          }
          const ct = res.headers.get("content-type") || "";
          if (ct && !ct.includes("text/css")) {
            console.warn(\`[resux] Warning: Stylesheet "\${href}" returned non-CSS Content-Type: "\${ct}". Expected "text/css".\`);
          }
        }).catch(() => {});
      }
    });
  };
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", checkStylesheets);
  } else {
    checkStylesheets();
  }
}
</script>`;
}

class ResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly globalStateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;
  private readonly headEntries: HeadEntry[] = [];
  private readonly styleIds = new Set<string>();
  private readonly renderedDefinitions = new Map<string, ComponentDefinition>();
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
    this.renderedDefinitions.set(definition.id, definition);
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
      ...withClientComponentIds(collectClientBlockComponentIds(this.renderedDefinitions.values(), [this.components])),
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

function unwrapHeadValue(value: unknown): unknown {
  if (isRef(value)) {
    return unref(value);
  }
  return typeof value === "function" ? (value as () => unknown)() : value;
}

function resolveHeadReactiveValue(value: unknown): unknown {
  const unwrapped = unwrapHeadValue(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((entry) => resolveHeadReactiveValue(entry));
  }
  if (!unwrapped || typeof unwrapped !== "object") {
    return unwrapped;
  }
  return Object.fromEntries(
    Object.entries(unwrapped as Record<string, unknown>)
      .map(([key, entry]) => [key, resolveHeadReactiveValue(entry)]),
  );
}

function resolveHeadEntry(input: HeadInput): HeadEntry {
  return resolveHeadReactiveValue(input) as HeadEntry;
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

    useViewTransition(): ResuxViewTransition {
      return useViewTransition();
    },

    useHead(input: HeadInput): void {
      headEntries.push(resolveHeadEntry(input));
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
    },

    definePageMeta(): void {
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

/**
 * Maps component tags used inside v-if/v-for blocks (transitively) to their module ids, so the browser
 * can create those components lazily when a block re-renders. Pages without such components get nothing.
 */
function withClientComponentIds(ids: Record<string, string> | undefined): { componentIds?: Record<string, string> } {
  return ids ? { componentIds: ids } : {};
}

// <component :is="Name">: the name must resolve to a registered or auto-discovered component. The node is
// rewritten to the plain component tag so the normal component path renders it (props, slot, scope).
function resolveDynamicComponentNode(
  node: ElementTemplateNode,
  scope: Record<string, unknown>,
  locals: Record<string, unknown>,
  components: Record<string, ComponentDefinition>,
): ElementTemplateNode {
  const isAttr = node.attrs.find((attr) => attr.name === "is");
  if (!isAttr) {
    throw new Error("<component> needs an `is` attribute with a registered component name.");
  }
  const value = isAttr.kind === "static" ? isAttr.value : evaluateExpression(isAttr.value, scope, locals);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("<component :is> needs the name of a registered component as a string. Component objects are not supported.");
  }
  if (!resolveComponentDefinition(value, components)) {
    throw new Error(`Unknown component <${value}> in <component :is>. Use the name of a registered or auto-discovered component.`);
  }
  return { ...node, tag: value, attrs: node.attrs.filter((attr) => attr !== isAttr) };
}

function collectClientBlockComponentIds(
  rendered: Iterable<ComponentDefinition>,
  registries: Array<Record<string, ComponentDefinition>>,
): Record<string, string> | undefined {
  const registry: Record<string, ComponentDefinition> = {};
  for (const entries of registries) {
    for (const [name, definition] of Object.entries(entries ?? {})) {
      if (!(name in registry)) registry[name] = definition;
    }
  }
  const result: Record<string, string> = {};
  const scanned = new Set<string>();
  const scan = (nodes: TemplateNode[], inBlock: boolean) => {
    for (const node of nodes) {
      if (node.type !== "element") continue;
      const blockHere = inBlock || Boolean(node.for || node.if);
      if (blockHere && node.tag === "component") {
        const isAttr = node.attrs.find((attr) => attr.name === "is");
        const names = isAttr?.kind === "static" ? [isAttr.value] : Object.keys(registry);
        for (const name of names) {
          if (typeof name !== "string" || Object.hasOwn(result, name)) continue;
          const target = resolveComponentDefinition(name, registry);
          if (!target?.id) continue;
          result[name] = target.id;
          if (!scanned.has(target.id)) {
            scanned.add(target.id);
            scan(target.template ?? [], true);
          }
        }
      }
      if (blockHere && isComponentTag(node.tag) && !Object.hasOwn(result, node.tag)) {
        const target = resolveComponentDefinition(node.tag, registry);
        if (target?.id) {
          result[node.tag] = target.id;
          if (!scanned.has(target.id)) {
            scanned.add(target.id);
            scan(target.template ?? [], true);
          }
        }
      }
      scan(node.children, blockHere);
    }
  };
  for (const definition of rendered) {
    scan(definition.template ?? [], false);
  }
  return Object.keys(result).length > 0 ? result : undefined;
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

function normalizeTransitionBoundaryTagName(tag: string): string {
  return String(tag || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function isTransitionBoundaryTag(tag: string): boolean {
  const normalized = normalizeTransitionBoundaryTagName(tag);
  return normalized === "transition" || normalized === "transition-group";
}

const unsafeTransitionContainerTags = new Set([
  "area", "base", "body", "br", "col", "embed", "head", "hr", "html", "iframe",
  "img", "input", "link", "meta", "object", "param", "script", "source", "style",
  "template", "textarea", "title", "track", "wbr",
]);

function normalizeTransitionName(value: unknown): string {
  const candidate = String(value || "v").trim();
  return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : "v";
}

function transitionBoundaryName(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  return normalizeTransitionName(collectComponentProps(node, context.scope, locals).name);
}

function transitionBoundaryTag(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  if (normalizeTransitionBoundaryTagName(node.tag) !== "transition-group") return "span";
  const candidate = String(collectComponentProps(node, context.scope, locals).tag || "").trim().toLowerCase();
  if (!candidate || !/^[a-z][a-z0-9-]*$/.test(candidate) || unsafeTransitionContainerTags.has(candidate)) {
    return "span";
  }
  return candidate;
}

function directTransitionBlock(node: ElementTemplateNode): ElementTemplateNode | null {
  if (node.children.length !== 1) return null;
  const child = node.children[0];
  return child.type === "element" && (child.for || child.if) ? child : null;
}

function renderTransitionBoundary(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
  children: string,
): string {
  const name = transitionBoundaryName(node, context, locals);
  const group = normalizeTransitionBoundaryTagName(node.tag) === "transition-group";
  const tag = transitionBoundaryTag(node, context, locals);
  const attrs = [`data-rx-transition="${escapeAttribute(name)}"`];
  if (group) attrs.push('data-rx-transition-group="true"');

  const nameAttr = node.attrs.find((attr) => attr.name === "name");
  if (nameAttr?.kind === "dynamic" && nameAttr.bindingId) {
    attrs.push(`data-rx-attr-${nameAttr.bindingId}="${context.scopeId}:${nameAttr.bindingId}"`);
  }

  const blockChild = directTransitionBlock(node);
  if (blockChild) {
    const blockId = blockChild.for?.blockId || blockChild.if?.blockId;
    if (blockId) {
      attrs.push(`data-rx-block="${context.scopeId}:${blockId}"`);
      children = children.replace(/^<span[^>]*>|<\/span>$/g, "");
    }
  }

  if (tag === "span") attrs.push('style="display: contents;"');
  return `<${tag} ${attrs.join(" ")}>${children}</${tag}>`;
}

function isTeleportBoundaryTag(tag: string): boolean {
  return String(tag || "").toLowerCase() === "teleport";
}

function normalizeTeleportTarget(value: unknown): string {
  const candidate = String(value || "#teleports").trim();
  return candidate && candidate.length <= 512 ? candidate : "#teleports";
}

function isTeleportBooleanEnabled(value: unknown): boolean {
  return value === "" || Boolean(value);
}

function encodeTeleportSourceMetadata(value: Record<string, unknown>): string {
  return encodeURIComponent(JSON.stringify(value)).replaceAll("-", "%2D");
}

function teleportReservationKey(reservation: number): string {
  return "t" + reservation.toString(36);
}

interface TeleportBoundaryRenderState {
  target: string;
  disabled: boolean;
  defer: boolean;
  bindings: Record<string, string>;
  toBinding: string;
}

function resolveTeleportBoundaryRenderState(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): TeleportBoundaryRenderState {
  const props = collectComponentProps(node, context.scope, locals);
  const target = normalizeTeleportTarget(props.to);
  const disabled = isTeleportBooleanEnabled(props.disabled);
  const defer = isTeleportBooleanEnabled(props.defer);
  const bindings: Record<string, string> = {};
  const toAttr = node.attrs.find((attr) => attr.name === "to");
  const toBinding = toAttr?.kind === "dynamic" && toAttr.bindingId
    ? `${context.scopeId}:${toAttr.bindingId}`
    : "";

  for (const attr of node.attrs) {
    if (attr.kind !== "dynamic" || !attr.bindingId) continue;
    if (attr.name === "to" || attr.name === "disabled" || attr.name === "defer") {
      bindings[attr.bindingId] = `${context.scopeId}:${attr.bindingId}`;
    }
  }

  return { target, disabled, defer, bindings, toBinding };
}

function inheritTeleportReservationSuppression(
  context: RenderTemplateContext,
  suppressTeleportReservations: boolean | undefined,
): RenderTemplateContext {
  if (!suppressTeleportReservations || context.suppressTeleportReservations) {
    return context;
  }

  return {
    ...context,
    suppressTeleportReservations: true,
    reserveTeleport: undefined,
    commitTeleport: undefined,
  };
}

function teleportChildRenderContext(
  state: TeleportBoundaryRenderState,
  context: RenderTemplateContext,
): RenderTemplateContext {
  if (state.disabled || state.target === "#teleports") {
    return context;
  }
  return inheritTeleportReservationSuppression(context, true);
}

function renderTeleportBoundary(
  state: TeleportBoundaryRenderState,
  children: string,
  reservation?: number,
): string {
  const metadata = encodeTeleportSourceMetadata({
    to: state.target,
    toBinding: state.toBinding,
    disabled: state.disabled,
    defer: state.defer,
    bindings: state.bindings,
    html: children,
    ssrKey: reservation === undefined ? undefined : teleportReservationKey(reservation),
  });
  const source = `<!--resux-teleport-source:${metadata}-->`;
  const end = "<!--resux-teleport-end-->";
  return state.disabled ? `${source}${children}${end}` : `${source}${end}`;
}

function renderElement(node: ElementTemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  if (node.tag === "component") {
    return renderElement(resolveDynamicComponentNode(node, context.scope, locals, context.components), context, locals);
  }

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

  if (isTeleportBoundaryTag(node.tag)) {
    const state = resolveTeleportBoundaryRenderState(node, context, locals);
    const reservation = state.disabled ? undefined : context.reserveTeleport?.(state.target);
    const childContext = teleportChildRenderContext(state, context);
    const children = renderTemplateNodes(node.children, childContext, locals);
    if (reservation !== undefined) {
      context.commitTeleport?.(reservation, children);
    }
    return renderTeleportBoundary(state, children, reservation);
  }

  if (isTransitionBoundaryTag(node.tag)) {
    return renderTransitionBoundary(
      node,
      context,
      locals,
      renderTemplateNodes(node.children, context, locals),
    );
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
  let resolvedRef: string | undefined;

  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(`${attrName}="${escapeAttribute(attr.value)}"`);
      continue;
    }

    const value = evaluateExpression(attr.value, context.scope, locals);
    if (attr.bindingId) {
      attrs.push(`data-rx-attr-${attr.bindingId}="${context.scopeId}:${attr.bindingId}"`);
    }
    if (attrName === "ref" && typeof value === "string" && value.trim()) {
      resolvedRef = value.trim();
    }
    const isViewTransitionAttr = attrName === "data-view-transition" || attrName === "view-transition";
    if (!isViewTransitionAttr && (value === false || value === null || value === undefined)) continue;
    if (isViewTransitionAttr && (value === null || value === undefined)) continue;

    attrs.push(`${attrName}="${escapeAttribute(stringifyAttributeValue(attrName, value))}"`);
  }

  const effectiveRef = resolvedRef ?? node.ref;
  if (effectiveRef) {
    attrs.push(`data-rx-ref="${escapeAttribute(`${context.scopeId}:${effectiveRef}`)}"`);
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
  renderComponent: AsyncRenderComponent,
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
  renderComponent: AsyncRenderComponent,
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
  renderComponent: AsyncRenderComponent,
  locals: Record<string, unknown>
): Promise<string> {
  if (node.tag === "component") {
    return renderElementAsync(resolveDynamicComponentNode(node, context.scope, locals, context.components), context, renderComponent, locals);
  }

  if (node.tag === "ResuxPage") {
    return context.renderPage
      ? `<span data-rx-page="">${await context.renderPage(context.suppressTeleportReservations)}</span>`
      : "";
  }

  if (node.tag === "ResuxLayout") {
    const layoutName = resolveLayoutName(node, context, locals);
    const renderChildren = (
      suppressTeleportReservations = context.suppressTeleportReservations,
    ) => renderTemplateNodesAsync(
      node.children,
      inheritTeleportReservationSuppression(context, suppressTeleportReservations),
      renderComponent,
      locals,
    );
    if (layoutName === false) {
      return renderChildren();
    }
    if (!context.renderLayout) {
      return renderChildren();
    }
    const rendered = await context.renderLayout(
      layoutName,
      renderChildren,
      context.suppressTeleportReservations,
    );
    const selectedLayoutSource = layoutName ?? (context.pageMeta.layout === false ? "default" : context.pageMeta.layout) ?? "default";
    const selectedLayout = normalizeLayoutName(selectedLayoutSource);
    return `<span data-rx-layout="${escapeAttribute(selectedLayout)}">${rendered}</span>`;
  }

  if (node.tag === "slot") {
    if (!context.renderSlot) {
      return "";
    }
    const slotName = resolveSlotElementName(node, context, locals);
    const slotProps = collectSlotElementProps(node, context, locals);
    const provided = await context.renderSlot(context.suppressTeleportReservations, slotName, slotProps);
    return provided ?? await renderTemplateNodesAsync(node.children, context, renderComponent, locals);
  }

  if (isTeleportBoundaryTag(node.tag)) {
    const state = resolveTeleportBoundaryRenderState(node, context, locals);
    const reservation = state.disabled ? undefined : context.reserveTeleport?.(state.target);
    const childContext = teleportChildRenderContext(state, context);
    const children = await renderTemplateNodesAsync(node.children, childContext, renderComponent, locals);
    if (reservation !== undefined) {
      context.commitTeleport?.(reservation, children);
    }
    return renderTeleportBoundary(state, children, reservation);
  }

  if (isTransitionBoundaryTag(node.tag)) {
    return renderTransitionBoundary(
      node,
      context,
      locals,
      await renderTemplateNodesAsync(node.children, context, renderComponent, locals),
    );
  }

  const renderResolvedComponent = (component: ComponentDefinition) => {
    const props = collectComponentProps(node, context.scope, locals);
    const renderSlot: AsyncRenderNamedSlot = async (
      suppressTeleportReservations = context.suppressTeleportReservations,
      slotName = "default",
      slotProps = {},
    ) => {
      const definition = node.slots
        ? (Object.hasOwn(node.slots, slotName) ? node.slots[slotName] : undefined)
        : (slotName === "default" && hasSlotContent(node.children) ? { children: node.children } : undefined);
      if (!definition) {
        return undefined;
      }
      return renderTemplateNodesAsync(
        definition.children,
        inheritTeleportReservationSuppression(context, suppressTeleportReservations),
        renderComponent,
        bindSlotLocals(definition.param, slotProps, locals),
      );
    };
    return renderComponent(
      component,
      props,
      renderSlot,
      context.suppressTeleportReservations,
      collectComponentEmitBindings(node, context, locals),
      collectComponentSlotBindings(node, context, locals),
      collectFallthroughEventAttributes(node, context, locals),
    );
  };

  if (node.tag === "ResuxLink" || node.tag === "NuxtLink" || node.tag === "RouterLink") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      return renderResolvedComponent(component);
    }
    return renderNativeElementAsync(node, context, renderComponent, locals);
  }

  if (node.tag === "ResuxImg" || node.tag === "NuxtImg" || node.tag === "NuxtImage") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      return renderResolvedComponent(component);
    }
    return renderResuxImg(node, context, locals);
  }

  if (node.tag === "ResuxPicture" || node.tag === "NuxtPicture") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      return renderResolvedComponent(component);
    }
    return renderResuxPicture(node, context, locals);
  }
  if (node.tag === "ResuxVideo") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      return renderResolvedComponent(component);
    }
    return renderResuxVideo(node, context, locals);
  }
  if (node.tag === "ResuxIcon" || node.tag === "Icon" || node.tag === "NuxtIcon") {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (component) {
      return renderResolvedComponent(component);
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
    return renderVueIslandAsync(node, context, renderComponent, locals);
  }

  if (isComponentTag(node.tag)) {
    const component = resolveComponentDefinition(node.tag, context.components);
    if (!component) {
      throw new Error(`Unknown component <${node.tag}>.`);
    }
    return renderResolvedComponent(component);
  }

  return renderNativeElementAsync(node, context, renderComponent, locals);
}

async function renderNativeElementAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  renderComponent: AsyncRenderComponent,
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

function normalizeClientEnhanceTag(value: unknown): string {
  const candidate = String(value || "section").trim().toLowerCase();
  if (!candidate || !/^[a-z][a-z0-9-]*$/.test(candidate) || unsafeTransitionContainerTags.has(candidate)) {
    return "section";
  }
  return candidate;
}

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
  const tag = normalizeClientEnhanceTag(props.as);

  const styles: string[] = [];
  if (reserveHeight) styles.push(`min-height: ${reserveHeight};`);
  if (reserveWidth) styles.push(`min-width: ${reserveWidth};`);
  if (aspectRatio) styles.push(`aspect-ratio: ${aspectRatio};`);
  const styleAttr = styles.length ? ` style="${escapeAttribute(styles.join(" "))}"` : "";

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
  renderComponent: AsyncRenderComponent,
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
  const tag = normalizeClientEnhanceTag(props.as);

  const styles: string[] = [];
  if (reserveHeight) styles.push(`min-height: ${reserveHeight};`);
  if (reserveWidth) styles.push(`min-width: ${reserveWidth};`);
  if (aspectRatio) styles.push(`aspect-ratio: ${aspectRatio};`);
  const styleAttr = styles.length ? ` style="${escapeAttribute(styles.join(" "))}"` : "";

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

function appendServerDeferredVideoPoster(
  attrs: string[],
  placeholderSrc: string | undefined,
  poster: string | undefined,
  deferLazy: boolean,
  deferUntilPageReady: boolean,
): void {
  if (!deferLazy) return;
  const deferredPoster = placeholderSrc ?? (deferUntilPageReady ? poster : undefined);
  if (deferredPoster) attrs.push(`poster="${escapeAttribute(deferredPoster)}"`);
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

  appendServerDeferredVideoPoster(attrs, placeholderSrc, poster, deferLazy, deferUntilPageReady);
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
  const videoRef = readStringProp(props.ref) ?? node.ref;
  if (videoRef) {
    attrs.push(`data-rx-ref="${escapeAttribute(`${context.scopeId}:${videoRef}`)}"`);
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
  const props = collectComponentProps(node, context.scope, locals);
  const iconName = String(props.name ?? props.icon ?? "").trim().toLowerCase();
  const iconSize = String(props.size ?? "").trim();
  const className = stringifyAttributeValue("class", props.class ?? "").trim();
  const customStyle = stringifyAttributeValue("style", props.style ?? "").trim();
  const registryData = iconRegistry[iconName];
  const data: IconData = registryData ?? {
    path: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16z",
    opacity: ".35",
    viewBox: "0 0 24 24"
  };
  const sizeStyle = iconSize
    ? `font-size: ${iconSize}; width: ${iconSize}; height: ${iconSize};`
    : "";
  const mergedStyle = [sizeStyle, customStyle].filter(Boolean).join(" ");

  const attrs: string[] = [
    `class="${escapeAttribute(["resux-icon", className].filter(Boolean).join(" "))}"`,
    `data-icon-name="${escapeAttribute(iconName)}"`
  ];
  if (!registryData) {
    attrs.push('data-icon-fallback="true"');
  }
  if (mergedStyle) {
    attrs.push(`style="${escapeAttribute(mergedStyle)}"`);
  }
  if (props.title) {
    attrs.push(`title="${escapeAttribute(String(props.title))}"`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);

  const paths = (data.paths?.length ? data.paths : [{ d: data.path || "", opacity: data.opacity }])
    .map((entry) => {
      const pathAttrs = [
        `d="${escapeAttribute(entry.d)}"`,
        `fill-rule="${escapeAttribute(entry.fillRule || data.fillRule || "nonzero")}"`,
        `clip-rule="${escapeAttribute(entry.clipRule || data.clipRule || "nonzero")}"`,
      ];
      if (entry.opacity) pathAttrs.push(`opacity="${escapeAttribute(entry.opacity)}"`);
      if (entry.fill) pathAttrs.push(`fill="${escapeAttribute(entry.fill)}"`);
      if (entry.stroke) pathAttrs.push(`stroke="${escapeAttribute(entry.stroke)}"`);
      if (entry.strokeWidth) pathAttrs.push(`stroke-width="${escapeAttribute(entry.strokeWidth)}"`);
      if (entry.strokeLinecap) pathAttrs.push(`stroke-linecap="${escapeAttribute(entry.strokeLinecap)}"`);
      if (entry.strokeLinejoin) pathAttrs.push(`stroke-linejoin="${escapeAttribute(entry.strokeLinejoin)}"`);
      return `<path ${pathAttrs.join(" ")}></path>`;
    })
    .join("");
  const svgAttrs = [
    `data-icon-name="${escapeAttribute(iconName)}"`,
    `viewBox="${escapeAttribute(data.viewBox || "0 0 24 24")}"`,
    'width="1em"',
    'height="1em"',
    `fill="${escapeAttribute(data.fill || "currentColor")}"`,
    'aria-hidden="true"',
  ];
  if (data.stroke) svgAttrs.push(`stroke="${escapeAttribute(data.stroke)}"`);
  if (data.strokeWidth) svgAttrs.push(`stroke-width="${escapeAttribute(data.strokeWidth)}"`);
  if (data.strokeLinecap) svgAttrs.push(`stroke-linecap="${escapeAttribute(data.strokeLinecap)}"`);
  if (data.strokeLinejoin) svgAttrs.push(`stroke-linejoin="${escapeAttribute(data.strokeLinejoin)}"`);
  if (data.fillRule) svgAttrs.push(`fill-rule="${escapeAttribute(data.fillRule)}"`);
  if (data.clipRule) svgAttrs.push(`clip-rule="${escapeAttribute(data.clipRule)}"`);
  if (data.opacity && data.paths?.length) svgAttrs.push(`opacity="${escapeAttribute(data.opacity)}"`);

  const svgInside = `<svg ${svgAttrs.join(" ")}>${paths}</svg>`;
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
  const imageRef = readStringProp(props.ref) ?? node.ref;
  if (imageRef) {
    passthrough["data-rx-ref"] = `${context.scopeId}:${imageRef}`;
  }
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

function renderVueIslandMarkup(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
  fallbackHtml: string,
): string {
  const name = resolveVueIslandName(node, context, locals);
  const props = resolveVueIslandProps(node, context, locals);
  const trigger = resolveVueIslandTrigger(node, context, locals);
  if (trigger === "interaction" && fallbackHtml.trim().length === 0) {
    throw new Error(
      '<VueIsland trigger="interaction"> requires server-rendered fallback children so the first interaction has a reachable target.',
    );
  }
  const scopeAttr = context.styleScopeId ? ` ${context.styleScopeId}=""` : "";
  return `<div${scopeAttr} data-rx-vue-island="${escapeAttribute(name)}" data-rx-vue-trigger="${escapeAttribute(trigger)}" data-rx-vue-props="${escapeAttribute(JSON.stringify(props))}">${fallbackHtml}</div>`;
}

function renderVueIsland(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string {
  return renderVueIslandMarkup(
    node,
    context,
    locals,
    renderTemplateNodes(node.children, context, locals),
  );
}

async function renderVueIslandAsync(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  renderComponent: AsyncRenderComponent,
  locals: Record<string, unknown>,
): Promise<string> {
  const fallbackHtml = await renderTemplateNodesAsync(
    node.children,
    context,
    renderComponent,
    locals,
  );
  return renderVueIslandMarkup(node, context, locals, fallbackHtml);
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

function resolveVueIslandAttributeValue(
  node: ElementTemplateNode,
  attributeName: string,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string | undefined {
  const attr = node.attrs.find((candidate) => candidate.name === attributeName);
  if (!attr) return undefined;
  return attr.kind === "static"
    ? attr.value
    : stringifyValue(evaluateExpression(attr.value, context.scope, locals));
}

function resolveVueIslandName(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string {
  const nameAttr = node.attrs.find((attr) => attr.name === "name");
  if (!nameAttr || (nameAttr.kind === "static" && !nameAttr.value)) {
    throw new Error("<VueIsland> needs a name attribute.");
  }
  return resolveVueIslandAttributeValue(node, "name", context, locals) ?? "";
}

function resolveVueIslandTrigger(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): ClientEnhancementTrigger {
  return normalizeEnhancementTrigger(
    resolveVueIslandAttributeValue(node, "trigger", context, locals),
    "immediate",
  );
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
  private readonly renderedDefinitions = new Map<string, ComponentDefinition>();
  private readonly teleportEntries: Array<{ target: string; html: string | null }> = [];
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
    renderPage?: AsyncRenderSlot,
    renderSlot?: AsyncRenderNamedSlot,
    props: ComponentProps = {},
    suppressTeleportReservations = false,
    emits?: Record<string, ComponentEmitBinding>,
    slots?: Record<string, ComponentSlotBinding>,
    rootAttrs?: string[],
  ): Promise<string> {
    this.collectComponentStyles(definition);
    this.renderedDefinitions.set(definition.id, definition);
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
      asyncDataRefs,
      ...(emits ? { emits } : {}),
      ...(slots ? { slots } : {})
    };

    const rendered = await withActiveResuxApp(this.resuxApp, () => renderTemplateNodesAsync(
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
        suppressTeleportReservations,
        renderPage,
        renderSlot,
        renderLayout: (name, slot, suppress) => this.renderLayout(name, slot, suppress),
        reserveTeleport: suppressTeleportReservations
          ? undefined
          : (target) => this.reserveTeleport(target),
        commitTeleport: suppressTeleportReservations
          ? undefined
          : (reservation, html) => this.commitTeleport(reservation, html)
      },
      (component, props, slot, suppress, emits, slots, nativeAttrs) =>
        this.renderComponent(component, undefined, slot, props, suppress, emits, slots, nativeAttrs)
    ));
    return rootAttrs && rootAttrs.length > 0 ? injectRootEventAttributes(definition.template, rendered, rootAttrs) : rendered;
  }

  private reserveTeleport(target: string): number | undefined {
    if (target !== "#teleports") {
      return undefined;
    }
    const reservation = this.teleportEntries.length;
    this.teleportEntries.push({ target, html: null });
    return reservation;
  }

  private commitTeleport(reservation: number, html: string): void {
    const entry = this.teleportEntries[reservation];
    if (entry) {
      entry.html = html;
    }
  }

  createTeleports(): Record<string, string> {
    const teleports: Record<string, string> = {};
    for (let reservation = 0; reservation < this.teleportEntries.length; reservation += 1) {
      const entry = this.teleportEntries[reservation];
      if (!entry || entry.html === null) continue;
      const key = teleportReservationKey(reservation);
      const content = `<!--resux-teleport-start:${key}-->${entry.html}<!--resux-teleport-end:${key}-->`;
      teleports[entry.target] = (teleports[entry.target] ?? "") + content;
    }
    return teleports;
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

  async renderLayout(
    name: string | false | undefined,
    renderSlot: AsyncRenderSlot,
    suppressTeleportReservations = false,
  ): Promise<string> {
    if (name === false) {
      return renderSlot(suppressTeleportReservations);
    }

    const selectedLayout = name ?? this.pageMeta.layout ?? "default";
    if (selectedLayout === false) {
      return renderSlot(suppressTeleportReservations);
    }
    const layoutName = normalizeLayoutName(selectedLayout);
    const layout = this.layouts[layoutName];
    if (!layout) {
      return renderSlot(suppressTeleportReservations);
    }

    return this.renderComponent(
      layout,
      undefined,
      renderSlot,
      {},
      suppressTeleportReservations,
    );
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
        ...(scope.emits ? { emits: scope.emits } : {}),
        ...(scope.slots ? { slots: scope.slots } : {}),
        asyncData: serializeAsyncData(scope.asyncDataRefs)
      };
    }

    return {
      route: this.route,
      scopes,
      globalState: serializeRefs(this.globalStateRefs),
      modules: this.modules,
      ...withClientComponentIds(collectClientBlockComponentIds(this.renderedDefinitions.values(), [this.components, this.layouts])),
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
  const pageRenderer: AsyncRenderSlot = (suppressTeleportReservations = false) =>
    renderer.renderComponent(
      options.page,
      undefined,
      undefined,
      options.pageProps ?? {},
      suppressTeleportReservations,
    );
  const html = options.app
    ? await renderer.renderComponent(options.app, pageRenderer)
    : await pageRenderer();

  const teleports = renderer.createTeleports();
  return {
    html,
    payload: renderer.createPayload(),
    head: mergeHead(renderer.headEntries),
    ...(Object.keys(teleports).length > 0 ? { teleports } : {})
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
    script: [],
    noscript: [],
    htmlAttrs: {},
    bodyAttrs: {}
  };

  const metaSources: Array<Array<Record<string, string>>> = [];

  for (const entry of entries) {
    if (entry.title) {
      merged.title = entry.title;
    }
    if (entry.meta) {
      metaSources.push(entry.meta);
    }
    if (entry.link) {
      merged.link!.push(...entry.link);
    }
    if (entry.style) {
      merged.style!.push(...entry.style);
    }
    if (entry.script) {
      merged.script!.push(...entry.script);
    }
    if (entry.noscript) {
      merged.noscript!.push(...entry.noscript);
    }
    if (entry.htmlAttrs) {
      merged.htmlAttrs = {
        ...(merged.htmlAttrs ?? {}),
        ...entry.htmlAttrs
      };
    }
    if (entry.bodyAttrs) {
      merged.bodyAttrs = {
        ...(merged.bodyAttrs ?? {}),
        ...entry.bodyAttrs
      };
    }
  }

  merged.meta = dedupeHeadMeta(metaSources);
  merged.link = sortHeadLinksForPriority(merged.link ?? []);
  merged.script = dedupeHeadScripts((merged.script ?? []) as Array<Record<string, unknown>>);

  return merged;
}

// Meta tags with a unique key (charset, or a name / property / http-equiv
// value) can be overridden across head entries, so a page can replace meta
// inherited from a layout: the LAST head entry that carries a given key owns
// it, and earlier entries' tags with that key are dropped. Repeated tags
// inside a single entry stay untouched because they are intentional (for
// example an og:image array from one useSeoMeta call). Tags without a unique
// key are kept as-is, and relative order is preserved.
function headMetaDedupKey(meta: Record<string, string>): string | undefined {
  if (meta.charset !== undefined) {
    return "charset";
  }
  const keyedAttributes = ["name", "property", "http-equiv", "httpEquiv"] as const;
  for (const attribute of keyedAttributes) {
    const value = meta[attribute];
    if (typeof value === "string" && value.trim() !== "") {
      const prefix = attribute === "httpEquiv" ? "http-equiv" : attribute;
      return `${prefix}:${value.trim().toLowerCase()}`;
    }
  }
  return undefined;
}

function dedupeHeadMeta(sources: Array<Array<Record<string, string>>>): Array<Record<string, string>> {
  const lastOwnerByKey = new Map<string, number>();
  sources.forEach((source, sourceIndex) => {
    for (const meta of source) {
      const key = headMetaDedupKey(meta);
      if (key !== undefined) {
        lastOwnerByKey.set(key, sourceIndex);
      }
    }
  });

  const output: Array<Record<string, string>> = [];
  sources.forEach((source, sourceIndex) => {
    for (const meta of source) {
      const key = headMetaDedupKey(meta);
      if (key === undefined || lastOwnerByKey.get(key) === sourceIndex) {
        output.push(meta);
      }
    }
  });
  return output;
}

function getCriticalMetaOrder(meta: Record<string, unknown>): number {
  if (meta.charset !== undefined) {
    return 0;
  }
  const rawHttpEquiv = meta["http-equiv"] ?? meta.httpEquiv;
  if (rawHttpEquiv) {
    return 1;
  }
  const rawName = meta.name;
  const name = typeof rawName === "string" ? rawName.toLowerCase() : "";
  if (name === "viewport") {
    return 2;
  }
  return 3;
}

function isCriticalHeadMeta(meta: Record<string, unknown>): boolean {
  if (meta.charset !== undefined) {
    return true;
  }
  const rawName = meta.name;
  const name = typeof rawName === "string" ? rawName.toLowerCase() : "";
  const rawHttpEquiv = meta["http-equiv"] ?? meta.httpEquiv;
  const httpEquiv = typeof rawHttpEquiv === "string" ? rawHttpEquiv.toLowerCase() : "";
  return name === "viewport" || Boolean(httpEquiv);
}

function extractCspFromHead(head: HeadEntry): string {
  for (const meta of head.meta ?? []) {
    if (!meta || typeof meta !== "object") continue;
    const httpEquiv = String((meta as any)["http-equiv"] ?? (meta as any).httpEquiv ?? "").trim().toLowerCase();
    if (httpEquiv === "content-security-policy") {
      return String((meta as any).content ?? "");
    }
  }
  return "";
}

function allowsInlineScriptElementForCsp(csp: string): boolean {
  const sources = cspDirectiveSources(csp, ["script-src-elem", "script-src", "default-src"]);
  return sources === null || sources.includes("'unsafe-inline'");
}

const SCRIPT_BOOLEAN_ATTRIBUTES = new Set(["async", "defer", "nomodule"]);

function renderScriptAttributes(attributes: Record<string, unknown>): string {
  return Object.entries(attributes)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === false) {
        return "";
      }
      if (SCRIPT_BOOLEAN_ATTRIBUTES.has(key)) {
        if (value === true || value === key || value === "") {
          return key;
        }
      }
      const normalized = normalizeHeadAttributeValue(key, value);
      return normalized === null ? "" : `${key}="${escapeAttribute(normalized)}"`;
    })
    .filter(Boolean)
    .join(" ");
}

function renderHead(head: HeadEntry, options: { nonce?: string; csp?: string } = {}): string {
  const tags: string[] = [];

  const metaList = [...(head.meta ?? [])];

  const criticalMetas = metaList.filter((meta) => isCriticalHeadMeta(meta as Record<string, unknown>));
  criticalMetas.sort((a, b) => getCriticalMetaOrder(a as Record<string, unknown>) - getCriticalMetaOrder(b as Record<string, unknown>));
  const remainingMetas = metaList.filter((meta) => !isCriticalHeadMeta(meta as Record<string, unknown>));

  for (const meta of criticalMetas) {
    tags.push(`<meta data-rx-head="true" ${renderAttributes(meta)}>`);
  }

  tags.push(`<title>${escapeHtml(head.title ?? "Resux App")}</title>`);

  const links = sortHeadLinksForPriority(normalizeHeadLinks(head.link ?? []));
  const highPriorityPreloads = links.filter((link) =>
    isPriorityImagePreloadLink(link) || isPriorityStylePreloadLink(link)
  );
  const remainingLinks = links.filter((link) =>
    !isPriorityImagePreloadLink(link) && !isPriorityStylePreloadLink(link)
  );

  const linkNonceAttr = options.nonce ? ` nonce="${escapeAttribute(options.nonce)}"` : "";
  for (const link of highPriorityPreloads) {
    const nonceStr = (options.nonce && link.rel === "stylesheet" && !link.nonce) ? linkNonceAttr : "";
    tags.push(`<link data-rx-head="true"${nonceStr} ${renderAttributes(link)}>`);
  }

  for (const meta of remainingMetas) {
    tags.push(`<meta data-rx-head="true" ${renderAttributes(meta)}>`);
  }

  for (const link of remainingLinks) {
    const nonceStr = (options.nonce && link.rel === "stylesheet" && !link.nonce) ? linkNonceAttr : "";
    tags.push(`<link data-rx-head="true"${nonceStr} ${renderAttributes(link)}>`);
  }

  const styles: any[] = [];
  const styleMap = new Map<string, any>();
  for (const style of head.style ?? []) {
    if (!style) {
      continue;
    }
    const styleId = typeof style === "object" && (style as any).id ? String((style as any).id) : "";
    if (styleId) {
      if (styleMap.has(styleId)) {
        const existing = styleMap.get(styleId);
        const idx = styles.indexOf(existing);
        if (idx !== -1) {
          styles[idx] = style;
        }
        styleMap.set(styleId, style);
      } else {
        styleMap.set(styleId, style);
        styles.push(style);
      }
    } else {
      styles.push(style);
    }
  }

  const styleNonceAttr = options.nonce ? ` nonce="${escapeAttribute(options.nonce)}"` : "";
  for (const style of styles) {
    const styleId = typeof style === "object" && (style as any).id ? String((style as any).id) : "";
    const styleIdAttr = styleId ? ` data-rx-style="${escapeAttribute(styleId)}"` : "";
    const cssContent = escapeStyleContent(style);
    tags.push(`<style data-rx-head="true"${styleNonceAttr}${styleIdAttr}>${cssContent}</style>`);
  }

  for (const noscript of head.noscript ?? []) {
    const rendered = renderHeadNoscript(noscript);
    if (rendered) tags.push(rendered);
  }

  const csp = options.csp ?? extractCspFromHead(head);
  for (const script of head.script ?? []) {
    const rendered = renderHeadScript(script, { nonce: options.nonce, csp });
    if (rendered) tags.push(rendered);
  }

  return tags.join("");
}

function renderHeadScript(
  entry: Record<string, unknown>,
  options: { nonce?: string; csp?: string } = {},
): string {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return "";
  }
  const attributes = { ...entry };
  const content = String(attributes.textContent ?? attributes.innerHTML ?? attributes.children ?? "");
  delete attributes.innerHTML;
  delete attributes.textContent;
  delete attributes.children;
  delete attributes.key;

  if (!attributes.nonce && options.nonce) {
    attributes.nonce = options.nonce;
  }

  const isInline = !attributes.src && content.length > 0;
  if (isInline && options.csp) {
    const hasNonce = Boolean(attributes.nonce);
    const inlineAllowed = allowsInlineScriptElementForCsp(options.csp);
    if (!hasNonce && !inlineAllowed) {
      return "";
    }
  }

  const renderedAttributes = renderScriptAttributes(attributes);
  const attrText = renderedAttributes ? ` ${renderedAttributes}` : "";
  const scriptBody = content ? escapeScriptContent(content) : "";
  return `<script data-rx-head="true"${attrText}>${scriptBody}</script>`;
}

function renderHeadNoscript(entry: Record<string, unknown> | string): string {
  if (typeof entry === "string") {
    return `<noscript data-rx-head="true">${escapeHtml(entry)}</noscript>`;
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return "";
  }

  const links = Array.isArray(entry.link)
    ? entry.link
      .filter((link): link is Record<string, unknown> => Boolean(link) && typeof link === "object" && !Array.isArray(link))
      .map((link) => `<link ${renderAttributes(link)}>`)
      .join("")
    : "";
  const raw = entry.innerHTML === undefined
    ? ""
    : escapeNoscriptContent(String(entry.innerHTML));
  return `<noscript data-rx-head="true">${links}${raw}</noscript>`;
}

function escapeScriptContent(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

function escapeNoscriptContent(source: string): string {
  return source.replace(/<\/noscript/gi, "<\\/noscript");
}

function getHeadLinkPriority(link: Record<string, string>): number {
  const rel = normalizeHeadLinkRel(link);
  const isPreload = rel === "preload";
  const as = String(link.as ?? "").trim().toLowerCase();
  if ((isPreload && as === "style") || isPriorityImagePreloadLink(link)) {
    return 0;
  }
  return isPreload ? 1 : 2;
}

function sortHeadLinksForPriority(links: Record<string, string>[]): Record<string, string>[] {
  return links
    .map((link, index) => ({
      link,
      index,
      priority: getHeadLinkPriority(link),
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

function isPriorityStylePreloadLink(link: Record<string, string>): boolean {
  return normalizeHeadLinkRel(link) === "preload"
    && String(link.as ?? "").trim().toLowerCase() === "style";
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
    } else if ("textContent" in (css as any)) {
      str = (css as any).textContent ?? "";
    } else {
      str = String(css);
    }
  } else {
    str = String(css);
  }
  return str.replace(/<\/style/gi, "<\\/style");
}

function renderHeadStyleValue(value: unknown): string {
  if (value === null || value === undefined || value === false) {
    return "";
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => renderHeadStyleValue(entry))
      .filter(Boolean)
      .join(";");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([property, entry]) => {
        if (entry === null || entry === undefined || entry === false) {
          return "";
        }
        const cssProperty = property.startsWith("--")
          ? property
          : property
            .replace(/^ms([A-Z])/, (_match, letter: string) => `-ms-${letter.toLowerCase()}`)
            .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        return `${cssProperty}:${String(entry)}`;
      })
      .filter(Boolean)
      .join(";");
  }
  return String(value);
}

function renderHeadClassValue(value: unknown): string {
  if (value === null || value === undefined || value === false) {
    return "";
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => renderHeadClassValue(entry))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className)
      .join(" ");
  }
  return String(value);
}

function normalizeHeadAttributeValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === false) {
    return null;
  }
  if (key === "style") {
    const style = renderHeadStyleValue(value);
    return style || null;
  }
  if (key === "class") {
    const className = renderHeadClassValue(value);
    return className || null;
  }
  return String(value);
}

function renderAttributes(attributes: Record<string, unknown>): string {
  return Object.entries(attributes)
    .map(([key, value]) => {
      const normalized = normalizeHeadAttributeValue(key, value);
      return normalized === null ? "" : `${key}="${escapeAttribute(normalized)}"`;
    })
    .filter(Boolean)
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

    if (isTeleportBoundaryTag(node.tag)) {
      for (const attr of node.attrs) {
        if (attr.kind !== "dynamic" || !attr.bindingId) continue;
        if (attr.name === "to") {
          patches.push({
            type: "attr",
            id: attr.bindingId,
            attr: "data-rx-teleport-to",
            value: normalizeTeleportTarget(evaluateExpression(attr.value, scope, locals))
          });
        } else if (attr.name === "disabled" || attr.name === "defer") {
          const enabled = isTeleportBooleanEnabled(evaluateExpression(attr.value, scope, locals));
          patches.push({
            type: "attr",
            id: attr.bindingId,
            attr: attr.name === "disabled" ? "data-rx-teleport-disabled" : "data-rx-teleport-defer",
            value: enabled ? "true" : ""
          });
        }
      }
    } else if (isTransitionBoundaryTag(node.tag)) {
      for (const attr of node.attrs) {
        if (attr.name === "name" && attr.kind === "dynamic" && attr.bindingId) {
          patches.push({
            type: "attr",
            id: attr.bindingId,
            attr: "data-rx-transition",
            value: normalizeTransitionName(evaluateExpression(attr.value, scope, locals))
          });
        }
      }
    } else if (node.tag !== "ResuxImg" && node.tag !== "ResuxPicture" && node.tag !== "ResuxVideo") {
      for (const attr of node.attrs) {
        if (attr.kind === "dynamic" && attr.bindingId) {
          const attrName = nativeAttributeName(node, attr.name);
          const attrValue = evaluateExpression(attr.value, scope, locals);
          patches.push({
            type: "attr",
            id: attr.bindingId,
            attr: attrName,
            value: stringifyAttributeValue(attrName, attrValue)
          });
          if (attrName === "ref") {
            const refText = typeof attrValue === "string" ? attrValue.trim() : "";
            patches.push({
              type: "attr",
              id: attr.bindingId,
              attr: "data-rx-ref",
              value: refText ? `${scopeId}:${refText}` : ""
            });
          }
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

const CLIENT_ENHANCE_ATTR_MAP: Record<string, string> = {
  options: "data-resux-options",
  name: "data-resux-enhancement",
  trigger: "data-resux-trigger",
  mode: "data-resux-mode",
  noCls: "data-resux-no-cls",
  demo: "data-resux-demo",
};

function nativeAttributeName(node: ElementTemplateNode, name: string): string {
  if (node.tag === "ResuxLink") {
    if (name === "to") return "href";
    if (name === "viewTransition" || name === "view-transition") return "data-view-transition";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    return CLIENT_ENHANCE_ATTR_MAP[name] ?? name;
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

// Events written on a component tag (<Child @save="onSave" />) are delivered when the child emits them.
// The mapping names the parent's handler (parent scope, module and handler) and carries any v-for locals
// by value, so a resumed child can reach the parent without the server renderer running again.
function collectComponentEmitBindings(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): Record<string, ComponentEmitBinding> | undefined {
  if (node.events.length === 0) {
    return undefined;
  }
  const bindings: Record<string, ComponentEmitBinding> = {};
  for (const event of node.events) {
    const binding: ComponentEmitBinding = { handler: `${context.scopeId}:${context.moduleId}:${event.handler}` };
    if (event.locals?.length) {
      const eventLocals: Record<string, JsonValue> = {};
      for (const name of event.locals) {
        if (!Object.hasOwn(locals, name)) continue;
        const value = locals[name];
        if (value === undefined) continue;
        assertJsonSerializable(value, `event local "${name}"`);
        eventLocals[name] = value as JsonValue;
      }
      binding.locals = eventLocals;
    }
    bindings[normalizePropName(event.name)] = binding;
  }
  return bindings;
}

// DOM events written on a component tag (<Child @click="go" />) are added to the child's root element as
// ordinary resumable listeners that name the PARENT's handler, so no extra runtime code is needed.
function collectFallthroughEventAttributes(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string[] | undefined {
  const native = node.events.filter((event) => event.native);
  if (native.length === 0) {
    return undefined;
  }
  const attrs: string[] = [];
  for (const event of native) {
    appendNativeEventAttributes(attrs, event, context, locals);
  }
  return attrs;
}

// A component can take fallthrough listeners when its template is one plain element. Fragments, text roots,
// conditional roots and roots that are themselves components or slots are skipped, as Vue skips non-element roots.
export function hasFallthroughRoot(template: TemplateNode[]): boolean {
  const roots = template.filter((node) => node.type !== "text" || node.value.trim().length > 0);
  if (roots.length !== 1) return false;
  const root = roots[0];
  if (root.type !== "element" || root.if || root.for) return false;
  return !/^[A-Z]/.test(root.tag) && root.tag !== "slot" && root.tag !== "component" && root.tag !== "template" && root.tag.toLowerCase() !== "teleport";
}

// attrs hold data-rx-on-<event> (plus locals and modifiers) for the parent's handlers. An event the root already
// listens to itself is left alone: one element carries one handler per event.
export function injectRootEventAttributes(template: TemplateNode[], html: string, attrs: string[]): string {
  if (!hasFallthroughRoot(template)) return html;
  const start = html.search(/<[A-Za-z]/);
  if (start < 0 || html.slice(0, start).trim().length > 0) return html;
  const end = html.indexOf(">", start);
  if (end < 0) return html;
  const openTag = html.slice(start, end);
  const own = new Set([...openTag.matchAll(/\sdata-rx-on-([\w:-]+)=/g)].map((match) => match[1]));
  const kept: string[] = [];
  let skip = "";
  for (const attr of attrs) {
    const match = /^data-rx-(?:on|locals|mod)-([\w:-]+)=/.exec(attr);
    if (match && own.has(match[1])) {
      skip = match[1];
      continue;
    }
    if (match && skip === match[1]) {
      continue;
    }
    kept.push(attr);
    skip = "";
  }
  if (kept.length === 0) return html;
  const selfClosing = html[end - 1] === "/" ? end - 1 : end;
  return `${html.slice(0, selfClosing)} ${kept.join(" ")}${html.slice(selfClosing)}`;
}

// Slot content is rendered by the parent, so the child's payload names the parent's slots id and carries the
// locals that content reads (v-for values) by value. Only slots with content are listed.
function collectComponentSlotBindings(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): Record<string, ComponentSlotBinding> | undefined {
  if (!node.slotsId) {
    return undefined;
  }
  const names = node.slots
    ? Object.keys(node.slots)
    : (hasSlotContent(node.children) ? ["default"] : []);
  if (names.length === 0) {
    return undefined;
  }
  const slotLocals: Record<string, JsonValue> = {};
  for (const name of node.slotLocals ?? []) {
    if (!Object.hasOwn(locals, name)) continue;
    const value = locals[name];
    if (value === undefined) continue;
    assertJsonSerializable(value, `slot local "${name}"`);
    slotLocals[name] = value as JsonValue;
  }
  const bindings: Record<string, ComponentSlotBinding> = {};
  for (const name of names) {
    bindings[name] = {
      ref: `${context.scopeId}:${context.moduleId}:${node.slotsId}`,
      ...(Object.keys(slotLocals).length > 0 ? { locals: slotLocals } : {})
    };
  }
  return bindings;
}

function hasSlotContent(nodes: TemplateNode[]): boolean {
  return nodes.some((child) => child.type !== "text" || child.value.trim().length > 0);
}

// Slot params become template locals for the provider's content: `v-slot="props"` binds the whole props
// object, `v-slot="{ a, b: c }"` binds each key.
export function bindSlotLocals(
  param: SlotParam | undefined,
  slotProps: Record<string, unknown>,
  locals: Record<string, unknown>,
): Record<string, unknown> {
  if (!param) {
    return locals;
  }
  const next = { ...locals };
  if (param.kind === "ident") {
    next[param.name] = slotProps;
    return next;
  }
  for (const pair of param.pairs) {
    next[pair.local] = slotProps[pair.key];
  }
  return next;
}

function resolveSlotElementName(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  const attr = node.attrs.find((candidate) => candidate.name === "name");
  if (!attr) {
    return "default";
  }
  const value = attr.kind === "static" ? attr.value : evaluateExpression(attr.value, context.scope, locals);
  return typeof value === "string" && value.length > 0 ? value : "default";
}

function collectSlotElementProps(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of node.attrs) {
    if (attr.name === "name") continue;
    props[normalizePropName(attr.name)] = attr.kind === "static" ? attr.value : evaluateExpression(attr.value, context.scope, locals);
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
  return [
    clientRuntimePart01,
    packageRegistrySource,
    clientRuntimePart02,
    clientRuntimePart03,
    clientRuntimePart04,
    clientRuntimePart05,
    clientRuntimePart06,
    clientRuntimePart07,
    JSON.stringify([...unsafeTransitionContainerTags]),
    clientRuntimePart08,
    clientRuntimePart09,
  ].join("");
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
