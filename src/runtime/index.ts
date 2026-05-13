import { getQuery as h3GetQuery, readBody as h3ReadBody, setHeader as h3SetHeader } from "h3";
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
  title?: string;
  meta?: Array<Record<string, string>>;
}

export interface HeadEntry {
  title?: string;
  meta?: Array<Record<string, string>>;
  link?: Array<Record<string, string>>;
  style?: ComponentStyle[];
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
}

export type ResuxModule<TOptions = Record<string, unknown>> =
  | ((options: TOptions, context: ResuxModuleContext) => unknown | Promise<unknown>)
  | {
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
  deploy?: ResuxDeployOptions;
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
  useAsyncData<T>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>): AsyncDataResource<T>;
  defineProps<T extends Record<string, unknown> = Record<string, unknown>>(): T;
  useRoute(): RouteContext;
  useRouter(): ResuxRouter;
  useHead(input: HeadEntry): void;
  useSeoMeta(input: SeoMetaInput): void;
  useRuntimeConfig(): RuntimeConfig;
  useResuxApp(): ResuxAppLike;
  apiURL(path: string): string;
  useResuxImage(): ResuxImageBuilder;
  useFetch<T>(url: string, init?: RequestInit): Promise<Ref<T>>;
  $fetch<T>(url: string, init?: RequestInit): Promise<T>;
  onMounted(callback: () => unknown | Promise<unknown>): void;
  definePageMeta(_meta: PageMeta): void;
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
}

interface ScopeRecord {
  id: string;
  moduleId: string;
  props: Record<string, unknown>;
  stateRefs: Record<string, Ref<unknown>>;
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
let activeResuxApp: ResuxAppLike | null = null;

async function withActiveResuxApp<T>(resuxApp: ResuxAppLike, run: () => Promise<T> | T): Promise<T> {
  const previous = activeResuxApp;
  activeResuxApp = resuxApp;
  try {
    return await run();
  } finally {
    activeResuxApp = previous;
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
  if (activeResuxApp) {
    return activeResuxApp;
  }

  const globalApp = (globalThis as { __RESUX_APP__?: ResuxAppLike }).__RESUX_APP__;
  if (globalApp) {
    return globalApp;
  }

  throw new Error("useResuxApp() is only available while executing a Resux setup or middleware context.");
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

export function defineEventHandler(handler: EventHandler): EventHandler {
  return handler;
}

export const eventHandler = defineEventHandler;

export function defineServerMiddleware(middleware: ServerMiddleware): ServerMiddleware {
  return middleware;
}

export async function readBody<T = unknown>(event: EventHandlerEvent): Promise<T> {
  try {
    return await h3ReadBody(event as unknown as Parameters<typeof h3ReadBody>[0]) as T;
  } catch {
    // Fall through to the minimal reader for tests and custom Node-like events.
  }

  const req = event.node.req as AsyncIterable<Uint8Array> | { on?: unknown } | undefined;
  if (!req || typeof (req as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] !== "function") {
    return undefined as T;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of req as AsyncIterable<Uint8Array>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
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
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    renderHead(mergedHead),
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>
[data-rx-block] {
  display: contents !important;
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
    `<script>window.__RESUX__=${payload}</script>`,
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
  private readonly headEntries: HeadEntry[] = [];
  private readonly styleIds = new Set<string>();

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly runtimeConfig: RuntimeConfig = { public: {} }
  ) {}

  async renderComponent(
    definition: ComponentDefinition,
    renderPage?: () => Promise<string>,
    renderSlot?: () => Promise<string>,
    props: ComponentProps = {}
  ): Promise<string> {
    this.collectComponentStyles(definition);
    const scopeId = `s${this.nextScopeId++}`;
    const stateRefs: Record<string, Ref<unknown>> = {};
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};
    const resuxApp = createResuxApp(this.route, this.modules, this.runtimeConfig);
    const setupContext = createServerSetupContext(this.route, props, stateRefs, asyncDataRefs, this.headEntries, resuxApp, this.runtimeConfig);
    const scope = await withActiveResuxApp(resuxApp, () => definition.script(setupContext));

    this.scopes[scopeId] = {
      id: scopeId,
      moduleId: definition.id,
      props,
      stateRefs,
      asyncDataRefs
    };

    return renderTemplateNodes(definition.template, {
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
    });
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
        asyncData: serializeAsyncData(scope.asyncDataRefs)
      };
    }

    return {
      route: this.route,
      scopes,
      modules: this.modules,
      config: publicRuntimeConfig(this.runtimeConfig)
    };
  }
}

function createServerSetupContext(
  route: RouteContext,
  props: ComponentProps,
  stateRefs: Record<string, Ref<unknown>>,
  asyncDataRefs: Record<string, AsyncDataResource<unknown>>,
  headEntries: HeadEntry[],
  resuxApp: ResuxAppLike,
  runtimeConfig: RuntimeConfig
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

  return {
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
      if (stateRefs[key]) {
        return stateRefs[key] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useState("${key}")`);
      const stateRef = ref(value as T);
      stateRefs[key] = stateRef as Ref<unknown>;
      return stateRef;
    },

    useAsyncData<T>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>): AsyncDataResource<T> {
      const existing = asyncDataRefs[key] as AsyncDataResource<unknown> | undefined;
      if (existing) {
        return existing as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      asyncDataRefs[key] = pending.resource as AsyncDataResource<unknown>;
      pending.setCompletion(settleAsyncDataResource(pending.resource, handler, key));
      return pending.resource;
    },

    defineProps<T extends Record<string, unknown> = Record<string, unknown>>(): T {
      return props as T;
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

    async useFetch<T>(url: string, init?: RequestInit): Promise<Ref<T>> {
      return ref(await fetchJson<T>(url, init));
    },

    $fetch<T>(url: string, init?: RequestInit): Promise<T> {
      return fetchJson<T>(url, init);
    },

    onMounted(): void {
      // Client lifecycle hooks run when a resumable scope is first resumed.
    },

    definePageMeta(): void {
      // Page meta is compiled statically in Resux.
    }
  };
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

  if (node.tag === "ResuxLink") {
    return renderNativeElement(node, context, locals);
  }

  if (node.tag === "ResuxImg") {
    return renderResuxImg(node, context, locals);
  }

  if (node.tag === "ResuxPicture") {
    return renderResuxPicture(node, context, locals);
  }
  if (node.tag === "ResuxVideo") {
    return renderResuxVideo(node, context, locals);
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
    const component = context.components[node.tag];
    if (!component) {
      throw new Error(`Unknown component <${node.tag}>.`);
    }

    throw new Error(`Component <${node.tag}> must be rendered by renderTemplateNodesAsync.`);
  }

  return renderNativeElement(node, context, locals);
}

function renderNativeElement(node: ElementTemplateNode, context: RenderTemplateContext, locals: Record<string, unknown>): string {
  const attrs: string[] = [];
  const tag = nativeElementTag(node);

  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(`${attrName}="${escapeAttribute(attr.value)}"`);
      continue;
    }

    const value = evaluateExpression(attr.value, context.scope, locals);
    if (value === false || value === null || value === undefined) {
      continue;
    }

    const marker = attr.bindingId ? ` data-rx-attr-${attr.bindingId}="${context.scopeId}:${attr.bindingId}"` : "";
    attrs.push(`${attrName}="${escapeAttribute(stringifyAttributeValue(attrName, value))}"${marker}`);
  }

  for (const event of node.events) {
    attrs.push(`data-rx-on-${event.name}="${context.scopeId}:${context.moduleId}:${event.handler}"`);
    if (event.modifiers?.length) {
      attrs.push(`data-rx-mod-${event.name}="${escapeAttribute(event.modifiers.join(","))}"`);
    }
  }

  if (node.html) {
    attrs.push(`data-rx-html-${node.html.bindingId}="${context.scopeId}:${node.html.bindingId}"`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);

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

  if (node.tag === "ResuxLink") {
    return renderNativeElementAsync(node, context, renderComponent, locals);
  }

  if (node.tag === "ResuxImg") {
    return renderResuxImg(node, context, locals);
  }

  if (node.tag === "ResuxPicture") {
    return renderResuxPicture(node, context, locals);
  }
  if (node.tag === "ResuxVideo") {
    return renderResuxVideo(node, context, locals);
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
    const component = context.components[node.tag];
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
  const attrs: string[] = [];
  const tag = nativeElementTag(node);

  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(`${attrName}="${escapeAttribute(attr.value)}"`);
      continue;
    }

    const value = evaluateExpression(attr.value, context.scope, locals);
    if (value === false || value === null || value === undefined) {
      continue;
    }

    const marker = attr.bindingId ? ` data-rx-attr-${attr.bindingId}="${context.scopeId}:${attr.bindingId}"` : "";
    attrs.push(`${attrName}="${escapeAttribute(stringifyAttributeValue(attrName, value))}"${marker}`);
  }

  for (const event of node.events) {
    attrs.push(`data-rx-on-${event.name}="${context.scopeId}:${context.moduleId}:${event.handler}"`);
    if (event.modifiers?.length) {
      attrs.push(`data-rx-mod-${event.name}="${escapeAttribute(event.modifiers.join(","))}"`);
    }
  }

  if (node.html) {
    attrs.push(`data-rx-html-${node.html.bindingId}="${context.scopeId}:${node.html.bindingId}"`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);

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

function renderResuxVideo(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>,
): string {
  const props = collectComponentProps(node, context.scope, locals);
  const explicitLoading = readStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : false);
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true || lazy;
  const src = readStringProp(props.src);
  const poster = readStringProp(props.poster);
  const fallbackPoster = readStringProp(props.fallbackPoster);
  const width = readNumberProp(props.width);
  const height = readNumberProp(props.height);
  const placeholderSrc = resolveMediaPlaceholderSource(props.placeholder);
  const preload = readStringProp(props.preload) ?? "metadata";
  const ariaLabel = readStringProp(props.ariaLabel ?? props["aria-label"]);
  const rootMargin = readStringProp(props.rootMargin) ?? "320px 0px";
  const thresholdRaw = Number(props.threshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : 0;
  const forceAutoplay = readBooleanProp(props.forceAutoplay, false);
  const autoplay = readBooleanProp(props.autoplay, false);
  const resolvedSources = resolveVideoSources(props.sources);
  const hasSourceChildren = resolvedSources.length > 0;

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
      || name === "forceAutoplay"
      || name === "ariaLabel"
      || name === "autoplay"
      || name === "src"
      || name === "poster"
      || name === "preload"
      || name === "fallbackText"
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
  if (!hasSourceChildren && !deferLazy && src) {
    attrs.push(`src="${escapeAttribute(src)}"`);
  }
  attrs.push('data-resux-media="video"');
  if (deferLazy && src) {
    attrs.push(`data-rx-lazy-src="${escapeAttribute(src)}"`);
    attrs.push(`data-src="${escapeAttribute(src)}"`);
  }
  if (deferLazy) {
    attrs.push('data-rx-lazy-video="true"');
    attrs.push('data-resux-lazy="true"');
    attrs.push(`data-rx-lazy-root-margin="${escapeAttribute(rootMargin)}"`);
    attrs.push(`data-rx-lazy-threshold="${escapeAttribute(String(threshold))}"`);
    attrs.push(`data-rx-lazy-preload="${escapeAttribute(preload)}"`);
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

  const initialPoster = placeholderSrc ?? poster;
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
  if (ariaLabel) {
    attrs.push(`aria-label="${escapeAttribute(ariaLabel)}"`);
  }
  if (styleParts.length > 0) {
    attrs.push(`style="${escapeAttribute(styleParts.join("; "))}"`);
  }
  appendStyleScopeAttribute(attrs, context.styleScopeId);
  const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
  const sourceTags = hasSourceChildren
    ? resolvedSources
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
  const children = renderTemplateNodes(node.children, context, locals);
  const fallbackText = escapeHtml(readStringProp(props.fallbackText) ?? "Your browser does not support the video tag.");
  return `<video${attrText}>${sourceTags}${children}${fallbackText}</video>`;
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
    !isDeferredLazy ? placeholderBackground : undefined,
    placeholderStyle,
  );
  const initialSrc = isDeferredLazy
    ? (placeholderSrc ?? resuxLazyPlaceholderSrc)
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
  if (looksLikeMediaSource(trimmed)) {
    return trimmed;
  }
  return createTextPlaceholderDataUri(trimmed);
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
    sources.push({
      src,
      type: readStringProp(record.type),
    });
  }
  return sources;
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
    const stateRefs: Record<string, Ref<unknown>> = {};
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};
    const setupContext = createServerSetupContext(
      this.route,
      props,
      stateRefs,
      asyncDataRefs,
      this.headEntries,
      this.resuxApp,
      this.runtimeConfig
    );
    const scope = await withActiveResuxApp(this.resuxApp, () => definition.script(setupContext));

    this.scopes[scopeId] = {
      id: scopeId,
      moduleId: definition.id,
      props,
      stateRefs,
      asyncDataRefs
    };

    return renderTemplateNodesAsync(
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
    );
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
        asyncData: serializeAsyncData(scope.asyncDataRefs)
      };
    }

    return {
      route: this.route,
      scopes,
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
  const appHead = mergeHead([
    options.appHead ?? {},
    headFromPageMeta(pageMeta)
  ]);
  const renderer = new AsyncResuxRenderer(
    options.route,
    options.components ?? {},
    options.modules ?? {},
    options.vueIslands ?? {},
    options.layouts ?? {},
    pageMeta,
    options.runtimeConfig ?? { public: {} }
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
    }
  };
}

function publicRuntimeConfig(runtimeConfig: RuntimeConfig): RuntimeConfig {
  return {
    public: runtimeConfig.public ?? {}
  };
}

function headFromPageMeta(meta: PageMeta): HeadEntry {
  return {
    title: meta.title,
    meta: meta.meta
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
    style: []
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
  }

  merged.link = sortHeadLinksForPriority(merged.link ?? []);

  return merged;
}

function renderHead(head: HeadEntry): string {
  const tags: string[] = [];
  tags.push(`<title>${escapeHtml(head.title ?? "Resux App")}</title>`);

  const links = sortHeadLinksForPriority(head.link ?? []);
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
    tags.push(`<style data-rx-head="true" data-rx-style="${escapeAttribute(style.id)}">${escapeStyleContent(style.css)}</style>`);
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

function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
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
  return node.tag;
}

function nativeAttributeName(node: ElementTemplateNode, name: string): string {
  return node.tag === "ResuxLink" && name === "to" ? "href" : name;
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

export function getClientRuntimeSource(): string {
  return String.raw`
const scopeCache = new Map();
const routePayloadCache = new Map();
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
const RESUX_LAZY_PLACEHOLDER_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const RESUX_DEFAULT_PLACEHOLDER_SRC = "/__resux/resux-placeholder.svg";
const observedLazyImages = new Set();
const observedLazyVideos = new Set();
const lazyImageObserverByElement = new WeakMap();
const lazyVideoObserverByElement = new WeakMap();
const failedMediaSources = new Set();

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
  __rxFlushPromise = __rxResolvedPromise.then(() => {
    try {
      for (const queued of __rxQueue) {
        queued();
      }
    } finally {
      __rxQueue.clear();
      __rxFlushing = false;
      __rxFlushPromise = null;
    }
  });
}

function nextTick(fn) {
  const promise = __rxFlushPromise || __rxResolvedPromise;
  return fn ? promise.then(fn) : promise;
}

class __rxReactiveEffect {
  constructor(fn, scheduler, onStop) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.onStop = onStop;
    this.active = true;
    this.deps = [];
  }

  run() {
    if (!this.active) {
      return this.fn();
    }
    const previous = __rxActiveEffect;
    __rxActiveEffect = this;
    __rxTrackStack.push(__rxShouldTrack);
    __rxShouldTrack = true;
    try {
      return this.fn();
    } finally {
      __rxShouldTrack = __rxTrackStack.pop() ?? true;
      __rxActiveEffect = previous;
    }
  }

  stop() {
    if (!this.active) {
      return;
    }
    for (const dep of this.deps) {
      dep.delete(this);
    }
    this.deps.length = 0;
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

function __rxTrigger(target, key) {
  const depsMap = __rxTargetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  for (const reactiveEffect of [...dep]) {
    if (reactiveEffect.scheduler) {
      reactiveEffect.scheduler();
    } else {
      reactiveEffect.run();
    }
  }
}

function reactive(target) {
  return __rxCreateReactiveObject(target, false, __rxReactiveMap, false);
}

function readonly(target) {
  return __rxCreateReactiveObject(target, true, __rxReadonlyMap, false);
}

function __rxCreateReactiveObject(target, isReadonlyValue, proxyMap, isShallow) {
  if (!__rxIsObject(target)) {
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
      const oldValue = Reflect.get(rawTarget, key, receiver);
      const success = Reflect.set(rawTarget, key, value, receiver);
      if (success && __rxHasChanged(value, oldValue)) {
        __rxTrigger(rawTarget, key);
      }
      return success;
    },
    deleteProperty(rawTarget, key) {
      if (isReadonlyValue) {
        return true;
      }
      const hadKey = Reflect.has(rawTarget, key);
      const success = Reflect.deleteProperty(rawTarget, key);
      if (hadKey && success) {
        __rxTrigger(rawTarget, key);
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
    for (const reactiveEffect of [...this.dep]) {
      if (reactiveEffect.scheduler) {
        reactiveEffect.scheduler();
      } else {
        reactiveEffect.run();
      }
    }
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
  const output = {};
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
        for (const reactiveEffect of [...dep]) {
          if (reactiveEffect.scheduler) {
            reactiveEffect.scheduler();
          } else {
            reactiveEffect.run();
          }
        }
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
  const deep = options.deep === true;
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

function __rxTraverse(value, seen = new Set()) {
  if (!__rxIsObject(value) || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Object.keys(value)) {
    __rxTraverse(value[key], seen);
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

function getClientResuxApp(routeOverride) {
  const payload = globalThis.__RESUX__ ?? {
    route: routeOverride ?? { path: "/", params: {}, query: {} },
    scopes: {},
    modules: {},
    config: { public: {} }
  };
  const route = routeOverride ?? payload.route ?? { path: "/", params: {}, query: {} };
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
      }
    };
    for (const [key, value] of Object.entries(clientProvides)) {
      app["$" + key] = value;
    }
    globalThis.__RESUX_APP__ = app;
  } else {
    app.route = route;
    app.payload = payload;
    app.$config = config;
    app.provides = clientProvides;
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

export function createClientComponent(definition) {
  return {
    async createScope(serializedScope, route) {
      const stateRefs = {};
      const asyncDataRefs = {};
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
          if (!stateRefs[key]) {
            const hasValue = serializedScope.state && Object.prototype.hasOwnProperty.call(serializedScope.state, key);
            stateRefs[key] = ref(hasValue ? serializedScope.state[key] : factory?.());
          }
          return stateRefs[key];
        },
        useAsyncData(key, handler) {
          if (!asyncDataRefs[key]) {
            const snapshot = serializedScope.asyncData ? serializedScope.asyncData[key] : undefined;
            const resource = createAsyncDataResource(
              snapshot?.value,
              snapshot?.pending ?? false,
              snapshot?.error ?? null
            );
            asyncDataRefs[key] = resource;
            if (resource.pending.value && typeof handler === "function") {
              const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
              if (controller) {
                pendingAsyncDataControllers.add(controller);
                resource.abortController = controller;
              }
              const completion = settleAsyncDataResource(resource, handler, key, controller ? controller.signal : undefined)
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
          return asyncDataRefs[key];
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
        async useFetch(url, init) {
          return ref(await setupContext.$fetch(url, init));
        },
        async $fetch(url, init) {
          const response = await fetch(url, init);
          if (!response.ok) {
            throw new Error("Fetch failed for " + url + ": " + response.status);
          }
          return response.json();
        },
        onMounted(callback) {
          if (typeof callback === "function") {
            mountedCallbacks.push(callback);
          }
        },
        definePageMeta() {
          // Page meta is compiled statically in Resux.
        }
      };
      const scope = await definition.script(setupContext);
      await Promise.allSettled(mountedCallbacks.map((callback) => callback()));
      return { scope, props, stateRefs, asyncDataRefs, pendingCompletions };
    },
    async run(scopeRecord, handlerName, event) {
      const handler = scopeRecord.scope[handlerName];
      if (typeof handler !== "function") {
        throw new Error("Missing resumable handler " + handlerName + ".");
      }
      await handler(event);
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

function installResux() {
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
  for (const eventName of ["input", "change", "submit", "keydown", "keyup", "keypress", "mousedown", "mouseup", "blur", "focusout"]) {
    document.addEventListener(eventName, (event) => {
      void handleDelegatedEvent(eventName, event);
    });
  }
  for (const eventName of ["load", "error", "loadstart", "loadedmetadata", "loadeddata", "canplay", "lazy-load-start", "lazy-load-complete"]) {
    document.addEventListener(eventName, (event) => {
      void handleDelegatedEvent(eventName, event);
    }, true);
  }
  if (typeof window !== "undefined" && typeof history !== "undefined" && typeof location !== "undefined") {
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
  applyReducedMotionVideoPreference();
}

function activateDeferredLazyMedia(root = document) {
  cleanupDetachedLazyMedia();
  activateDeferredLazyImages(root);
  activateDeferredLazyVideos(root);
  dispatchPageReadyEvent(root);
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
  image.setAttribute("data-rx-lazy-pending", "true");
  image.setAttribute("data-rx-lazy-ready", "true");
  image.setAttribute("data-resux-loading", "true");

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
      || video.getAttribute("data-resux-loaded") === "true"
      || video.getAttribute("data-resux-error-handled") === "true"
      || observedLazyVideos.has(video)
    ) {
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

function revealDeferredLazyVideo(video) {
  if (!video || !isManagedMediaConnected(video)) {
    return;
  }
  unobserveLazyVideo(video);

  if (
    video.getAttribute("data-rx-lazy-ready") === "true"
    || video.getAttribute("data-resux-loaded") === "true"
    || video.getAttribute("data-resux-error-handled") === "true"
  ) {
    return;
  }

  const targetSrc = video.getAttribute("data-rx-lazy-src") || video.getAttribute("data-src") || "";
  if (targetSrc && mediaSourceWasFailed(video, targetSrc)) {
    applyKnownVideoFailure(video, targetSrc);
    return;
  }

  dispatchManagedEvent(video, "lazy-load-start");

  const preload = video.getAttribute("data-rx-lazy-preload") || "metadata";
  video.setAttribute("preload", preload);
  const sourceNodes = video.querySelectorAll
    ? video.querySelectorAll("source[data-rx-lazy-src]")
    : [];
  sourceNodes.forEach((source) => {
    const nextSrc = source.getAttribute("data-rx-lazy-src");
    if (nextSrc && !mediaSourceWasFailed(video, nextSrc)) {
      source.setAttribute("src", nextSrc);
    }
    source.removeAttribute("data-rx-lazy-src");
    source.removeAttribute("data-src");
  });
  if (targetSrc && sourceNodes.length === 0 && shouldAssignMediaSource(video, targetSrc)) {
    video.setAttribute("src", targetSrc);
  }
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  video.removeAttribute("data-rx-lazy-video");
  video.setAttribute("data-rx-lazy-pending", "true");
  video.setAttribute("data-rx-lazy-ready", "true");
  video.setAttribute("data-resux-loading", "true");
  video.setAttribute("data-resux-video-loading", "true");

  if (typeof video.load === "function" && video.getAttribute("data-rx-load-called") !== "true") {
    video.setAttribute("data-rx-load-called", "true");
    try {
      video.load();
    } catch {
      // Ignore load() runtime failures from older browsers.
    }
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
  if (target.getAttribute("data-rx-lazy-pending") === "true") {
    target.removeAttribute("data-rx-lazy-pending");
    dispatchManagedEvent(target, "lazy-load-complete");
  }
  target.setAttribute("data-resux-loaded", "true");
  target.removeAttribute("data-resux-loading");
  clearManagedPlaceholderState(target);
}

function handleManagedVideoReady(event) {
  const target = event && event.target;
  if (!target || !target.tagName || String(target.tagName).toLowerCase() !== "video") {
    return;
  }

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
  clearManagedPlaceholderState(target);
  if (target.getAttribute("data-rx-placeholder-src")) {
    const realPoster = target.getAttribute("data-rx-poster");
    if (realPoster) {
      target.setAttribute("poster", realPoster);
    } else {
      target.removeAttribute("poster");
    }
  }
}

function handleManagedMediaError(event) {
  const target = event && event.target;
  if (!target || !target.tagName) {
    return;
  }
  const tag = String(target.tagName).toLowerCase();
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
  target.setAttribute("data-resux-error", "true");
  target.setAttribute("data-rx-error", "true");
  target.removeAttribute("data-resux-loading");
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
  target.setAttribute("data-resux-error", "true");
  target.setAttribute("data-rx-error", "true");
  target.removeAttribute("data-resux-loading");
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
  markFailedMediaSource(video, failedSrc);
  video.setAttribute("data-resux-error", "true");
  video.setAttribute("data-rx-error", "true");
  video.removeAttribute("data-resux-loading");
  video.removeAttribute("data-resux-video-loading");

  if (video.getAttribute("data-rx-lazy-video") === "true" && video.getAttribute("data-rx-lazy-ready") !== "true") {
    applyVideoPosterFallback(video, failedSrc);
    return;
  }

  unobserveLazyVideo(video);
  if (video.getAttribute("data-resux-error-handled") === "true") {
    return;
  }

  markMediaErrorHandled(video);
  clearManagedVideoSources(video);
  applyVideoPosterFallback(video, failedSrc);
}

function applyKnownVideoFailure(video, failedSrc) {
  markFailedMediaSource(video, failedSrc);
  video.setAttribute("data-resux-error", "true");
  video.setAttribute("data-rx-error", "true");
  video.removeAttribute("data-resux-loading");
  video.removeAttribute("data-resux-video-loading");
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
}

function dispatchPageReadyEvent(root) {
  const target = root && typeof root.dispatchEvent === "function" ? root : document;
  dispatchManagedEvent(target, "resux:page-ready", { root });
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
  const output = {};
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
  if (!anchor || anchor.target || anchor.hasAttribute("download")) {
    return false;
  }

  const actionTarget = event.target && event.target.closest
    ? event.target.closest("[data-rx-on-click]")
    : null;
  if (actionTarget && readEventModifiers(actionTarget, "click").includes("prevent")) {
    return false;
  }

  const target = new URL(anchor.getAttribute("href"), location.href);
  if (target.origin !== location.origin) {
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
  void navigateTo(nextPath + target.hash);
  return true;
}

async function navigateTo(target, options = {}) {
  const nextUrl = new URL(target, location.href);
  const routePath = nextUrl.pathname + nextUrl.search;
  const currentUrl = new URL(location.href);
  const currentRoutePath = currentUrl.pathname + currentUrl.search;
  if (!options.force && routePath === currentRoutePath && nextUrl.hash === currentUrl.hash) {
    return;
  }
  const transitionToken = ++routeTransitionToken;
  let completed = false;
  abortPendingAsyncData();
  setRouteTransition("start", { path: routePath });

  try {
    setRouteTransition("fetching", { path: routePath });
    const result = await fetchRoutePayload(routePath);
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

    setRouteTransition("swapping", { path: routePath });
    const preserved = replaceRouteHtml(root, result.html);
    globalThis.__RESUX__ = mergePersistentLayoutPayload(previousPayload, nextPayload, preserved.scopeIds);
    getClientResuxApp(globalThis.__RESUX__.route);
    applyHead(result.head);
    clearScopeCacheExcept(preserved.scopeIds);
    void resumePendingAsyncData();
    void mountVueIslands(preserved.root);
    activateDeferredLazyMedia(preserved.root);
    applyReducedMotionVideoPreference(preserved.root);

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
  if (!previousPayload || !previousPayload.scopes || !nextPayload || !nextPayload.scopes) {
    return nextPayload;
  }

  for (const scopeId of preservedScopeIds) {
    if (previousPayload.scopes[scopeId]) {
      nextPayload.scopes[scopeId] = previousPayload.scopes[scopeId];
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
  routePayloadCache.clear();
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
  const routePath = getPrefetchPath(anchor);
  if (!routePath || routePayloadCache.has(routePath)) {
    return;
  }

  try {
    routePayloadCache.set(routePath, await fetchRoutePayload(routePath));
  } catch {
    routePayloadCache.delete(routePath);
  }
}

function getPrefetchPath(anchor) {
  if (!anchor || anchor.target || anchor.hasAttribute("download")) {
    return null;
  }

  const target = new URL(anchor.getAttribute("href"), location.href);
  if (target.origin !== location.origin) {
    return null;
  }

  const routePath = target.pathname + target.search;
  if (routePath === location.pathname + location.search) {
    return null;
  }

  return routePath;
}

async function fetchRoutePayload(routePath) {
  if (routePayloadCache.has(routePath)) {
    return routePayloadCache.get(routePath);
  }

  const response = await fetch("/__resux/route?path=" + encodeURIComponent(routePath), {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Route payload request failed: " + response.status);
  }

  const result = await response.json();
  routePayloadCache.set(routePath, result);
  return result;
}

function applyHead(head) {
  if (!head) {
    return;
  }

  if (head.title) {
    document.title = head.title;
  }

  const nextEntries = [];

  for (const meta of head.meta ?? []) {
    nextEntries.push({ tag: "meta", attrs: meta });
  }

  for (const link of head.link ?? []) {
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
  const [scopeId, moduleId, handlerName] = marker.split(":");
  const payload = globalThis.__RESUX__;
  const component = await importComponent(moduleId, payload.modules, devImportRevision);
  let scopeRecord = scopeCache.get(scopeId);
  if (!scopeRecord) {
    scopeRecord = await component.createScope(payload.scopes[scopeId], payload.route);
    scopeCache.set(scopeId, scopeRecord);
  }
  const patches = await component.run(scopeRecord, handlerName, event);
  const serialized = component.serialize(scopeRecord);
  payload.scopes[scopeId].props = serialized.props;
  payload.scopes[scopeId].state = serialized.state;
  payload.scopes[scopeId].asyncData = serialized.asyncData;
  applyPatches(scopeId, patches);
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

function renderClientResuxVideo(node, scope, locals, styleScopeId) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const explicitLoading = readClientStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readClientBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : false);
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true || lazy;
  const src = readClientStringProp(props.src);
  const poster = readClientStringProp(props.poster);
  const fallbackPoster = readClientStringProp(props.fallbackPoster);
  const width = readClientNumberProp(props.width);
  const height = readClientNumberProp(props.height);
  const placeholderSrc = resolveClientPlaceholderSource(props.placeholder);
  const preload = readClientStringProp(props.preload) || "metadata";
  const ariaLabel = readClientStringProp(props.ariaLabel || props["aria-label"]);
  const rootMargin = readClientStringProp(props.rootMargin) || "320px 0px";
  const thresholdRaw = Number(props.threshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : 0;
  const forceAutoplay = readClientBooleanProp(props.forceAutoplay, false);
  const autoplay = readClientBooleanProp(props.autoplay, false);
  const resolvedSources = resolveClientVideoSources(props.sources);
  const hasSourceChildren = resolvedSources.length > 0;
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
      || name === "forceAutoplay"
      || name === "ariaLabel"
      || name === "autoplay"
      || name === "src"
      || name === "poster"
      || name === "preload"
      || name === "fallbackText"
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
  if (!hasSourceChildren && !deferLazy && src) {
    attrs.push('src="' + escapeAttribute(src) + '"');
  }
  attrs.push('data-resux-media="video"');
  if (deferLazy && src) {
    attrs.push('data-rx-lazy-src="' + escapeAttribute(src) + '"');
    attrs.push('data-src="' + escapeAttribute(src) + '"');
  }
  if (deferLazy) {
    attrs.push('data-rx-lazy-video="true"');
    attrs.push('data-resux-lazy="true"');
    attrs.push('data-rx-lazy-root-margin="' + escapeAttribute(rootMargin) + '"');
    attrs.push('data-rx-lazy-threshold="' + escapeAttribute(String(threshold)) + '"');
    attrs.push('data-rx-lazy-preload="' + escapeAttribute(preload) + '"');
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
  const initialPoster = placeholderSrc || poster;
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
    ? resolvedSources
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
  return "<video" + attrText + ">" + sourceTags + children + fallbackText + "</video>";
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
    !isDeferredLazy ? placeholderBackground : undefined,
    placeholderStyle
  );
  const initialSrc = isDeferredLazy
    ? (placeholderSrc || RESUX_LAZY_PLACEHOLDER_SRC)
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
  if (looksLikeClientMediaSource(trimmed)) {
    return trimmed;
  }
  return createClientTextPlaceholderDataUri(trimmed);
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
    sources.push({
      src,
      type: readClientStringProp(entry.type)
    });
  }
  return sources;
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
  return node.tag;
}

function nativeAttributeName(node, name) {
  return node.tag === "ResuxLink" && name === "to" ? "href" : name;
}

function applyPatches(scopeId, patches) {
  let needsLazyImageActivation = false;
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
      });
      continue;
    }
    document.querySelectorAll('[data-rx-block="' + scopeId + ':' + patch.id + '"]').forEach((element) => {
      unmountVueIslands(element);
      element.innerHTML = patch.value;
      void mountVueIslands(element);
      needsLazyImageActivation = true;
    });
  }
  if (needsLazyImageActivation) {
    activateDeferredLazyMedia();
    applyReducedMotionVideoPreference();
  }
}

function evaluateExpression(expression, scope, locals) {
  return Function("scope", "locals", "with (scope) { with (locals) { return (" + expression + "); } }")(scope, locals);
}

function serializeRefs(refs) {
  const output = {};
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
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

installResux();
`;
}

function serializeRefs(refs: Record<string, Ref<unknown>>): Record<string, JsonValue> {
  const output: Record<string, JsonValue> = {};

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
  const output: Record<string, SerializedAsyncData> = {};

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

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
