export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Ref<T = unknown> {
  value: T;
}

export interface AsyncDataError {
  name: string;
  message: string;
}

export interface AsyncDataResource<T = unknown> {
  value: Ref<T | undefined>;
  pending: Ref<boolean>;
  error: Ref<AsyncDataError | null>;
  then: any;
}

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
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
  public?: Record<string, JsonValue>;
  [key: string]: unknown;
}

export interface ResuxAppLike {
  route: RouteContext;
  payload: ResuxPayload;
  $config: RuntimeConfig;
  provides: Record<string, unknown>;
  provide(key: string, value: unknown): void;
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

export type RouteMiddlewareResult =
  | void
  | string
  | false
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
  useState<T>(key: string, factory?: () => T): Ref<T>;
  useAsyncData<T>(key: string, handler?: () => T | Promise<T>): AsyncDataResource<T>;
  defineProps<T extends Record<string, unknown> = Record<string, unknown>>(): T;
  useRoute(): RouteContext;
  useHead(input: HeadEntry): void;
  useSeoMeta(input: SeoMetaInput): void;
  useRuntimeConfig(): RuntimeConfig;
  useResuxApp(): ResuxAppLike;
  useFetch<T>(url: string): Promise<Ref<T>>;
  $fetch<T>(url: string): Promise<T>;
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
  route: RouteContext;
  components: Record<string, ComponentDefinition>;
  layouts: Record<string, ComponentDefinition>;
  pageMeta: PageMeta;
  renderPage?: () => Promise<string>;
  renderSlot?: () => Promise<string>;
  renderLayout?: (name: string | false | undefined, slot: () => Promise<string>) => Promise<string>;
}

type ComponentProps = Record<string, unknown>;

export function defineComponent(definition: ComponentDefinition): ComponentDefinition {
  return definition;
}

export function defineResuxConfig<T extends Record<string, unknown>>(config: T): T {
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
  return event.query;
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
#__resux-loading {
  position: fixed;
  inset: 0 0 auto;
  z-index: 9999;
  color: #18181b;
  font: 600 13px/1.4 ui-sans-serif, system-ui, sans-serif;
  pointer-events: none;
}
#__resux-loading[hidden] {
  display: none;
}
#__resux-loading .bar {
  height: 3px;
  overflow: hidden;
  background: rgba(24, 24, 27, 0.12);
}
#__resux-loading .bar span {
  display: block;
  width: var(--resux-progress, 8%);
  height: 100%;
  background: #2563eb;
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.45);
  transition: width 160ms ease, background 160ms ease;
}
#__resux-loading .panel {
  width: fit-content;
  max-width: min(28rem, calc(100vw - 2rem));
  margin: 0.75rem auto 0;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgba(24, 24, 27, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 32px rgba(24, 24, 27, 0.12);
  backdrop-filter: blur(12px);
}
#__resux-loading[data-state="error"] .bar span {
  background: #dc2626;
}
#__resux-loading[data-state="complete"] .bar span {
  background: #16a34a;
}
#__resux[data-route-transition="loading"] {
  opacity: 0.72;
  transition: opacity 120ms ease;
}
@media (prefers-reduced-motion: reduce) {
  #__resux-loading .bar span,
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
    '<div id="__resux-loading" hidden data-state="idle" aria-live="polite" aria-busy="false"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span></span></div><div class="panel" data-rx-transition-message>Ready</div></div>',
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

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly runtimeConfig: RuntimeConfig = {}
  ) {}

  async renderComponent(
    definition: ComponentDefinition,
    renderPage?: () => Promise<string>,
    renderSlot?: () => Promise<string>,
    props: ComponentProps = {}
  ): Promise<string> {
    const scopeId = `s${this.nextScopeId++}`;
    const stateRefs: Record<string, Ref<unknown>> = {};
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};
    const resuxApp = createResuxApp(this.route, this.modules, this.runtimeConfig);
    const setupContext = createServerSetupContext(this.route, props, stateRefs, asyncDataRefs, this.headEntries, resuxApp, this.runtimeConfig);
    const scope = await definition.script(setupContext);

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
      route: this.route,
      components: this.components,
      layouts: {},
      pageMeta: definition.meta ?? {},
      renderPage,
      renderSlot
    });
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
  const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed for ${url}: ${response.status}`);
    }
    return response.json() as Promise<T>;
  };

  return {
    props,

    useState<T>(key: string, factory?: () => T): Ref<T> {
      if (stateRefs[key]) {
        return stateRefs[key] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useState("${key}")`);
      const ref: Ref<T> = { value: value as T };
      stateRefs[key] = ref as Ref<unknown>;
      return ref;
    },

    useAsyncData<T>(key: string, handler?: () => T | Promise<T>): AsyncDataResource<T> {
      if (asyncDataRefs[key]) {
        return asyncDataRefs[key] as AsyncDataResource<T>;
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

    async useFetch<T>(url: string): Promise<Ref<T>> {
      return {
        value: await fetchJson<T>(url)
      };
    },

    $fetch<T>(url: string): Promise<T> {
      return fetchJson<T>(url);
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
  const value: Ref<T | undefined> = { value: undefined };
  const pending: Ref<boolean> = { value: true };
  const error: Ref<AsyncDataError | null> = { value: null };
  let completion: Promise<void> = Promise.resolve();
  const resource: AsyncDataResource<T> = {
    value,
    pending,
    error,
    then(onfulfilled: any, onrejected: any) {
      return completion.then(() => {
        const snapshot = {
          value: resource.value.value,
          pending: resource.pending.value,
          error: resource.error.value
        };
        return onfulfilled ? onfulfilled(snapshot) : snapshot;
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
  handler: (() => T | Promise<T>) | undefined,
  key: string
): Promise<void> {
  try {
    const value = handler ? await handler() : undefined;
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

    return `<span data-rx-block="${context.scopeId}:${node.for.blockId}">${rendered}</span>`;
  }

  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, context.scope, locals)
      ? renderElement({ ...node, if: undefined }, context, locals)
      : "";
    return `<span data-rx-block="${context.scopeId}:${node.if.blockId}">${rendered}</span>`;
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

    return `<span data-rx-block="${context.scopeId}:${node.for.blockId}">${rendered.join("")}</span>`;
  }

  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, context.scope, locals)
      ? await renderElementAsync({ ...node, if: undefined }, context, renderComponent, locals)
      : "";
    return `<span data-rx-block="${context.scopeId}:${node.if.blockId}">${rendered}</span>`;
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

  const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, context.scope, locals))
    : await renderTemplateNodesAsync(node.children, context, renderComponent, locals);
  return `<${tag}${attrText}>${children}</${tag}>`;
}

function renderVueIsland(
  node: ElementTemplateNode,
  context: RenderTemplateContext,
  locals: Record<string, unknown>
): string {
  const name = resolveVueIslandName(node, context, locals);
  const props = resolveVueIslandProps(node, context, locals);
  return `<div data-rx-vue-island="${escapeAttribute(name)}" data-rx-vue-props="${escapeAttribute(JSON.stringify(props))}"></div>`;
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
  readonly headEntries: HeadEntry[] = [];
  readonly resuxApp: ResuxAppLike;

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly vueIslands: Record<string, string> = {},
    private readonly layouts: Record<string, ComponentDefinition> = {},
    private readonly pageMeta: PageMeta = {},
    private readonly runtimeConfig: RuntimeConfig = {}
  ) {
    this.resuxApp = createResuxApp(route, modules, runtimeConfig);
  }

  async renderComponent(
    definition: ComponentDefinition,
    renderPage?: () => Promise<string>,
    renderSlot?: () => Promise<string>,
    props: ComponentProps = {}
  ): Promise<string> {
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
    const scope = await definition.script(setupContext);

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
        route: this.route,
        components: this.components,
        layouts: this.layouts,
        pageMeta: this.pageMeta,
        renderPage,
        renderSlot,
        renderLayout: (name, slot) => this.renderLayout(name, slot)
      },
      (component, props, slot) => this.renderComponent(component, undefined, slot, props)
    );
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
    options.runtimeConfig ?? {}
  );

  for (const plugin of options.plugins ?? []) {
    await plugin(renderer.resuxApp);
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
  const provides: Record<string, unknown> = {};

  return {
    route,
    payload,
    $config: runtimeConfig,
    provides,
    provide(key: string, value: unknown): void {
      provides[key] = value;
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
    link: []
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
  }

  return merged;
}

function renderHead(head: HeadEntry): string {
  const tags: string[] = [];
  tags.push(`<title>${escapeHtml(head.title ?? "Resux App")}</title>`);

  for (const meta of head.meta ?? []) {
    tags.push(`<meta data-rx-head="true" ${renderAttributes(meta)}>`);
  }

  for (const link of head.link ?? []) {
    tags.push(`<link data-rx-head="true" ${renderAttributes(link)}>`);
  }

  return tags.join("");
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
  scopeId: string
): ClientPatch[] {
  const patches: ClientPatch[] = [];
  collectPatches(template, scope, scopeId, {}, patches);
  return patches;
}

function collectPatches(
  nodes: TemplateNode[],
  scope: Record<string, unknown>,
  scopeId: string,
  locals: Record<string, unknown>,
  patches: ClientPatch[]
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
          route: { path: "", params: {}, query: {} },
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
          route: { path: "", params: {}, query: {} },
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

    collectPatches(node.children, scope, scopeId, locals, patches);
  }
}

function nativeElementTag(node: ElementTemplateNode): string {
  return node.tag === "ResuxLink" ? "a" : node.tag;
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
let devImportRevision = 0;
let routeTransitionToken = 0;
let routeTransitionHideTimer = 0;

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
        useState(key, factory) {
          if (!stateRefs[key]) {
            const hasValue = serializedScope.state && Object.prototype.hasOwnProperty.call(serializedScope.state, key);
            stateRefs[key] = { value: hasValue ? serializedScope.state[key] : factory?.() };
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
              const completion = settleAsyncDataResource(resource, handler, key);
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
        useHead() {
          // Head updates are server-rendered in the MVP.
        },
        useSeoMeta() {
          // SEO meta updates are server-rendered in the MVP.
        },
        useRuntimeConfig() {
          return globalThis.__RESUX__?.config ?? { public: {} };
        },
        useResuxApp() {
          return {
            route,
            payload: globalThis.__RESUX__,
            $config: globalThis.__RESUX__?.config ?? { public: {} },
            provides: {},
            provide() {}
          };
        },
        async useFetch(url) {
          return { value: await setupContext.$fetch(url) };
        },
        async $fetch(url) {
          const response = await fetch(url);
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
      return renderClientPatches(definition.template, scopeRecord.scope);
    },
    render(scopeRecord) {
      return renderClientPatches(definition.template, scopeRecord.scope);
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
  for (const eventName of ["input", "change", "submit", "keydown", "keyup", "keypress", "mousedown", "mouseup", "blur", "focusout"]) {
    document.addEventListener(eventName, (event) => {
      void handleDelegatedEvent(eventName, event);
    });
  }
  if (typeof window !== "undefined" && typeof history !== "undefined" && typeof location !== "undefined") {
    window.addEventListener("popstate", () => {
      void navigateTo(location.pathname + location.search, { replace: true });
    });
    if (!history.state || !history.state.__resux) {
      history.replaceState({ __resux: true, path: location.pathname + location.search }, "", location.href);
    }
  }
  if (typeof window !== "undefined") {
    window.__RESUX_APPLY_DEV_UPDATE__ = applyDevUpdate;
  }
  void resumePendingAsyncData();
  void mountVueIslands();
}

function createAsyncDataResource(value, pending = false, error = null) {
  let completion = Promise.resolve();
  const resource = {
    value: { value },
    pending: { value: pending },
    error: { value: error },
    then(onfulfilled, onrejected) {
      return completion.then(() => {
        const snapshot = {
          value: resource.value.value,
          pending: resource.pending.value,
          error: resource.error.value
        };
        return onfulfilled ? onfulfilled(snapshot) : snapshot;
      }, onrejected);
    },
    setCompletion(nextCompletion) {
      completion = nextCompletion;
    }
  };

  return resource;
}

async function settleAsyncDataResource(resource, handler, key) {
  try {
    const value = await handler();
    assertJsonSerializable(value, 'useAsyncData("' + key + '")');
    resource.value.value = value;
    resource.error.value = null;
  } catch (error) {
    resource.value.value = undefined;
    resource.error.value = normalizeAsyncDataError(error);
  } finally {
    resource.pending.value = false;
  }
}

function serializeAsyncData(refs) {
  const output = {};
  for (const [key, ref] of Object.entries(refs)) {
    output[key] = {
      value: ref.value.value === undefined ? null : ref.value.value,
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
  const loader = document.getElementById("__resux-loading");
  const root = document.getElementById("__resux");
  if (!loader) {
    return;
  }

  if (routeTransitionHideTimer) {
    clearTimeout(routeTransitionHideTimer);
    routeTransitionHideTimer = 0;
  }

  const progress = transitionProgress(state, options.progress);
  const message = options.message ?? transitionMessage(state);
  loader.hidden = false;
  loader.dataset.state = state;
  loader.style.setProperty("--resux-progress", progress + "%");
  loader.setAttribute("aria-busy", state === "idle" || state === "complete" ? "false" : "true");

  const progressbar = loader.querySelector("[role='progressbar']");
  if (progressbar) {
    progressbar.setAttribute("aria-valuenow", String(progress));
    progressbar.setAttribute("aria-valuetext", message);
  }

  const label = loader.querySelector("[data-rx-transition-message]");
  if (label) {
    label.textContent = message;
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

  if (state === "idle" || state === "complete") {
    routeTransitionHideTimer = setTimeout(() => {
      loader.hidden = true;
      loader.dataset.state = "idle";
      loader.style.setProperty("--resux-progress", "0%");
      progressbar?.setAttribute("aria-valuenow", "0");
      progressbar?.setAttribute("aria-valuetext", "Idle");
    }, state === "complete" ? 160 : 0);
  }
}

function transitionProgress(state, explicitProgress) {
  if (typeof explicitProgress === "number") {
    return Math.max(0, Math.min(100, Math.round(explicitProgress)));
  }
  if (state === "start") return 8;
  if (state === "fetching") return 38;
  if (state === "swapping") return 76;
  if (state === "complete") return 100;
  if (state === "error") return 100;
  return 0;
}

function transitionMessage(state) {
  if (state === "start") return "Starting navigation";
  if (state === "fetching") return "Loading route";
  if (state === "swapping") return "Updating page";
  if (state === "complete") return "Route loaded";
  if (state === "error") return "Route failed";
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
  if (nextPath === currentPath && target.hash) {
    return false;
  }

  event.preventDefault();
  void navigateTo(nextPath + target.hash);
  return true;
}

async function navigateTo(target, options = {}) {
  const nextUrl = new URL(target, location.href);
  const routePath = nextUrl.pathname + nextUrl.search;
  const transitionToken = ++routeTransitionToken;
  let completed = false;
  setRouteTransition("start", { path: routePath });

  try {
    setRouteTransition("fetching", { path: routePath });
    const result = await fetchRoutePayload(routePath);
    if (result.redirect) {
      await navigateTo(result.redirect, { replace: true });
      return;
    }

    const root = document.getElementById("__resux");
    if (!root) {
      location.href = nextUrl.href;
      return;
    }

    setRouteTransition("swapping", { path: routePath });
    const previousPayload = globalThis.__RESUX__;
    const preserved = replaceRouteHtml(root, result.html);
    globalThis.__RESUX__ = mergePersistentLayoutPayload(previousPayload, result.payload, preserved.scopeIds);
    applyHead(result.head);
    clearScopeCacheExcept(preserved.scopeIds);
    void resumePendingAsyncData();
    void mountVueIslands(preserved.root);

    if (options.replace) {
      history.replaceState({ __resux: true, path: routePath }, "", nextUrl.href);
    } else {
      history.pushState({ __resux: true, path: routePath }, "", nextUrl.href);
    }

    if (nextUrl.hash) {
      document.getElementById(nextUrl.hash.slice(1))?.scrollIntoView();
    } else if (typeof scrollTo === "function") {
      scrollTo(0, 0);
    }
    if (transitionToken === routeTransitionToken) {
      setRouteTransition("complete", { path: routePath });
      completed = true;
    }
  } catch {
    setRouteTransition("error", { path: routePath });
    location.href = nextUrl.href;
  } finally {
    if (!completed && transitionToken === routeTransitionToken) {
      setRouteTransition("idle", { path: routePath });
    }
  }
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

  document.querySelectorAll("[data-rx-head]").forEach((element) => element.remove());

  for (const meta of head.meta ?? []) {
    const element = document.createElement("meta");
    element.setAttribute("data-rx-head", "true");
    for (const [key, value] of Object.entries(meta)) {
      element.setAttribute(key, value);
    }
    document.head.appendChild(element);
  }

  for (const link of head.link ?? []) {
    const element = document.createElement("link");
    element.setAttribute("data-rx-head", "true");
    for (const [key, value] of Object.entries(link)) {
      element.setAttribute(key, value);
    }
    document.head.appendChild(element);
  }
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

function renderClientPatches(template, scope) {
  const patches = [];
  collectPatches(template, scope, {}, patches);
  return patches;
}

function collectPatches(nodes, scope, locals, patches) {
  for (const node of nodes) {
    if (node.type === "interpolation") {
      patches.push({ type: "text", id: node.bindingId, value: stringifyValue(evaluateExpression(node.expression, scope, locals)) });
      continue;
    }
    if (node.type !== "element") {
      continue;
    }
    if (node.for) {
      patches.push({ type: "block", id: node.for.blockId, value: renderNode(node, scope, locals).replace(/^<span[^>]*>|<\/span>$/g, "") });
      continue;
    }
    if (node.if) {
      patches.push({ type: "block", id: node.if.blockId, value: renderNode(node, scope, locals).replace(/^<span[^>]*>|<\/span>$/g, "") });
      continue;
    }
    if (node.html) {
      patches.push({ type: "html", id: node.html.bindingId, value: sanitizeHtml(evaluateExpression(node.html.expression, scope, locals)) });
    }
    for (const attr of node.attrs) {
      if (attr.kind === "dynamic" && attr.bindingId) {
        const attrName = nativeAttributeName(node, attr.name);
        patches.push({ type: "attr", id: attr.bindingId, attr: attrName, value: stringifyAttributeValue(attrName, evaluateExpression(attr.value, scope, locals)) });
      }
    }
    collectPatches(node.children, scope, locals, patches);
  }
}

function renderNode(node, scope, locals) {
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
          return renderElement({ ...node, for: undefined, if: undefined }, scope, nextLocals);
        }).join("")
      : "";
    return '<span data-rx-block=":' + node.for.blockId + '">' + rendered + '</span>';
  }
  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, scope, locals)
      ? renderElement({ ...node, if: undefined }, scope, locals)
      : "";
    return '<span data-rx-block=":' + node.if.blockId + '">' + rendered + '</span>';
  }
  return renderElement(node, scope, locals);
}

function renderElement(node, scope, locals) {
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
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, scope, locals))
    : node.children.map((child) => renderNode(child, scope, locals)).join("");
  return "<" + tag + attrText + ">" + children + "</" + tag + ">";
}

function nativeElementTag(node) {
  return node.tag === "ResuxLink" ? "a" : node.tag;
}

function nativeAttributeName(node, name) {
  return node.tag === "ResuxLink" && name === "to" ? "href" : name;
}

function applyPatches(scopeId, patches) {
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
      });
      continue;
    }
    document.querySelectorAll('[data-rx-block="' + scopeId + ':' + patch.id + '"]').forEach((element) => {
      unmountVueIslands(element);
      element.innerHTML = patch.value;
      void mountVueIslands(element);
    });
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
  return String(value);
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
    const value = resource.value.value;
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
  return String(value);
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
