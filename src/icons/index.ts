import { defineComponent, h, computed, ref, onMounted, onUnmounted, watch } from "vue";
import { defineResuxModule } from "../kit/index.js";
import { useRuntimeConfig } from "../runtime/index.js";
import { iconRegistry, type IconData, type IconPathData } from "./registry.js";

export interface ResuxIconsModuleOptions {
  collections?: string[];
  component?: string;
  mode?: "css" | "svg";
  apiProvider?: string;
  lazy?: boolean;
}

export function defineIconCollections(collections: string[]): ResuxIconsModuleOptions {
  return { collections };
}

export { iconRegistry } from "./registry.js";
export type { IconData, IconPathData } from "./registry.js";

if (typeof globalThis !== "undefined") {
  (globalThis as any).__RESUX_ICON_REGISTRY__ = iconRegistry;
}

const DEFAULT_ICON_API_PROVIDER = "https://api.iconify.design";
const ICON_FETCH_TIMEOUT_MS = 10_000;
const ICON_FETCH_MAX_BYTES = 256 * 1024;
const ICON_FETCH_CACHE_MAX_ENTRIES = 256;
const ICON_FETCH_MAX_IN_FLIGHT = 32;
const ICON_FETCH_QUEUE_MAX_ENTRIES = 512;
const pendingFetches = new Map<string, Promise<IconData | null>>();
const fetchedIconCache = new Map<string, IconData>();
const iconFetchQueue: Array<() => void> = [];
let activeIconFetches = 0;

function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
}

export function normalizeIconApiProvider(value: unknown): string {
  const raw = typeof value === "string" ? stripTrailingSlashes(value.trim()) : "";
  if (!raw) {
    return DEFAULT_ICON_API_PROVIDER;
  }
  if (raw.startsWith("//")) {
    return DEFAULT_ICON_API_PROVIDER;
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return stripTrailingSlashes(url.toString());
    }
  } catch {
    // Fall back to the public provider for malformed values.
  }
  return DEFAULT_ICON_API_PROVIDER;
}

async function readBoundedIconSvg(response: Response): Promise<string | null> {
  const rawLength = response.headers?.get?.("content-length");
  if (rawLength) {
    const contentLength = Number(rawLength);
    if (Number.isFinite(contentLength) && contentLength > ICON_FETCH_MAX_BYTES) {
      return null;
    }
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= ICON_FETCH_MAX_BYTES ? text : null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > ICON_FETCH_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

function readFetchedIcon(cacheKey: string): IconData | undefined {
  const cached = fetchedIconCache.get(cacheKey);
  if (!cached) return undefined;
  fetchedIconCache.delete(cacheKey);
  fetchedIconCache.set(cacheKey, cached);
  return cached;
}

function rememberFetchedIcon(cacheKey: string, data: IconData): void {
  fetchedIconCache.delete(cacheKey);
  fetchedIconCache.set(cacheKey, data);
  while (fetchedIconCache.size > ICON_FETCH_CACHE_MAX_ENTRIES) {
    const oldestKey = fetchedIconCache.keys().next().value;
    if (oldestKey === undefined) break;
    fetchedIconCache.delete(oldestKey);
  }
}

function runWithIconFetchSlot(
  task: () => Promise<IconData | null>,
): Promise<IconData | null> {
  if (activeIconFetches >= ICON_FETCH_MAX_IN_FLIGHT
    && iconFetchQueue.length >= ICON_FETCH_QUEUE_MAX_ENTRIES) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const run = () => {
      activeIconFetches += 1;
      void task()
        .then(resolve, () => resolve(null))
        .finally(() => {
          activeIconFetches = Math.max(0, activeIconFetches - 1);
          iconFetchQueue.shift()?.();
        });
    };
    if (activeIconFetches < ICON_FETCH_MAX_IN_FLIGHT) {
      run();
    } else {
      iconFetchQueue.push(run);
    }
  });
}

export function fetchIconifyIcon(
  name: string,
  apiProvider: string = DEFAULT_ICON_API_PROVIDER,
): Promise<IconData | null> {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized || normalized.length > 256) return Promise.resolve(null);
  if (iconRegistry[normalized]) {
    return Promise.resolve(iconRegistry[normalized]);
  }

  const parts = normalized.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return Promise.resolve(null);
  }

  const provider = normalizeIconApiProvider(apiProvider);
  const cacheKey = provider + "::" + normalized;
  const cached = readFetchedIcon(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = pendingFetches.get(cacheKey);
  if (pending) {
    return pending;
  }
  const prefix = parts[0];
  const iconName = parts[1];
  const url = provider + "/" + encodeURIComponent(prefix) + "/" + encodeURIComponent(iconName) + ".svg";

  const fetchPromise = runWithIconFetchSlot(async () => {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), ICON_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
      if (!response.ok) return null;
      const svgText = await readBoundedIconSvg(response);
      if (!svgText) return null;
      const data = parseFetchedIconSvg(svgText);
      if (!data) {
        return null;
      }
      rememberFetchedIcon(cacheKey, data);
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }).finally(() => {
    pendingFetches.delete(cacheKey);
  });

  pendingFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

function readSvgAttribute(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const pattern = "\\b" + escapedName + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')";
  const match = new RegExp(pattern, "i").exec(source);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}
function readSvgPresentationAttributes(source: string): Partial<IconData> {
  const output: Partial<IconData> = {};
  const attributes = [
    ["opacity", "opacity"],
    ["fill", "fill"],
    ["stroke", "stroke"],
    ["stroke-width", "strokeWidth"],
    ["stroke-linecap", "strokeLinecap"],
    ["stroke-linejoin", "strokeLinejoin"],
    ["fill-rule", "fillRule"],
    ["clip-rule", "clipRule"],
  ] as const;
  for (const [attributeName, propertyName] of attributes) {
    const value = readSvgAttribute(source, attributeName);
    if (value) output[propertyName] = value;
  }
  return output;
}

function inheritedSvgPresentation(source: string): Partial<IconData> {
  const { opacity: _opacity, ...inherited } = readSvgPresentationAttributes(source);
  return inherited;
}

function parseFetchedIconSvg(svgText: string): IconData | null {
  const svgRoot = /<svg\b[^>]*>/i.exec(svgText)?.[0];
  if (!svgRoot) return null;

  const rootPresentation = readSvgPresentationAttributes(svgRoot);
  const inheritedStack: Array<Partial<IconData>> = [inheritedSvgPresentation(svgRoot)];
  const paths: IconPathData[] = [];

  for (const match of svgText.matchAll(/<\/?(?:svg|g|path)\b[^>]*>/gi)) {
    const source = match[0];
    const closing = /^<\//.test(source);
    const tag = /^<\/?([A-Za-z]+)/.exec(source)?.[1]?.toLowerCase();
    if (!tag || tag === "svg") continue;

    if (tag === "g") {
      if (closing) {
        if (inheritedStack.length > 1) inheritedStack.pop();
      } else {
        inheritedStack.push({
          ...inheritedStack[inheritedStack.length - 1],
          ...inheritedSvgPresentation(source),
        });
        if (/\/\s*>$/.test(source) && inheritedStack.length > 1) {
          inheritedStack.pop();
        }
      }
      continue;
    }

    if (closing || paths.length >= 128) continue;
    const d = readSvgAttribute(source, "d").slice(0, 65_536);
    if (!d) continue;
    paths.push({
      d,
      ...inheritedStack[inheritedStack.length - 1],
      ...readSvgPresentationAttributes(source),
    });
  }

  if (!paths.length) return null;
  return {
    path: paths[0].d,
    paths,
    viewBox: readSvgAttribute(svgRoot, "viewBox") || "0 0 24 24",
    ...rootPresentation,
  };
}

export const Icon = defineComponent({
  name: "ResuxIcon",
  props: {
    name: { type: String, required: true },
    size: { type: [String, Number], default: "1.25rem" },
    mode: { type: String, default: "svg" },
    lazy: { type: Boolean, default: false },
    loading: { type: String, default: "eager" },
    apiProvider: { type: String, default: "" },
    class: { type: String, default: "" }
  },
  setup(props, { attrs }) {
    const iconRef = ref<HTMLElement | null>(null);
    const isVisible = ref(false);
    const iconName = computed(() => String(props.name || "").trim().toLowerCase());
    const runtimeConfig = useRuntimeConfig();
    const configuredProvider = (runtimeConfig.public?.icons as { apiProvider?: unknown } | undefined)?.apiProvider;
    const apiProvider = computed(() => normalizeIconApiProvider(props.apiProvider || configuredProvider));
    const dynamicData = ref<IconData | null>(null);

    const isLazy = computed(() => props.lazy || props.loading === "lazy");

    const iconData = computed<IconData>(() => {
      if (iconRegistry[iconName.value]) {
        return iconRegistry[iconName.value];
      }
      if (dynamicData.value) {
        return dynamicData.value;
      }
      return {
        path: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16z",
        opacity: ".35",
        viewBox: "0 0 24 24"
      };
    });

    let requestRevision = 0;
    const loadDynamicIcon = () => {
      const requestedName = iconName.value;
      const requestedProvider = apiProvider.value;
      const revision = ++requestRevision;
      if (iconRegistry[requestedName]) {
        return;
      }
      fetchIconifyIcon(requestedName, requestedProvider).then((result) => {
        if (
          result
          && revision === requestRevision
          && requestedName === iconName.value
          && requestedProvider === apiProvider.value
        ) {
          dynamicData.value = result;
        }
      });
    };

    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      if (isLazy.value && typeof window !== "undefined" && "IntersectionObserver" in window) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              isVisible.value = true;
              loadDynamicIcon();
              if (observer && iconRef.value) {
                observer.unobserve(iconRef.value);
              }
            }
          },
          { rootMargin: "100px" }
        );
        if (iconRef.value) {
          observer.observe(iconRef.value);
        }
      } else {
        isVisible.value = true;
        loadDynamicIcon();
      }
    });

    onUnmounted(() => {
      requestRevision += 1;
      if (observer) {
        observer.disconnect();
      }
    });

    watch([iconName, apiProvider], () => {
      dynamicData.value = null;
      if (!isLazy.value || isVisible.value) {
        loadDynamicIcon();
      }
    });

    const sizeValue = computed(() =>
      typeof props.size === "number" ? `${props.size}px` : (String(props.size || "").trim() || "1.25rem")
    );

    return () => {
      const data = iconData.value;
      return h(
        "svg",
        {
          ref: iconRef,
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: data.viewBox || "0 0 24 24",
          width: sizeValue.value,
          height: sizeValue.value,
          fill: data.fill || "currentColor",
          stroke: data.stroke,
          "stroke-width": data.strokeWidth,
          "stroke-linecap": data.strokeLinecap,
          "stroke-linejoin": data.strokeLinejoin,
          "fill-rule": data.fillRule,
          "clip-rule": data.clipRule,
          opacity: data.paths?.length ? data.opacity : undefined,
          class: ["inline-block shrink-0 align-middle", props.class].filter(Boolean).join(" "),
          style: { width: sizeValue.value, height: sizeValue.value },
          "aria-hidden": "true",
          "data-icon-name": props.name,
          "data-icon-lazy": isLazy.value ? "true" : "false",
          ...attrs
        },
        (data.paths?.length ? data.paths : [{ d: data.path || "", opacity: data.opacity }])
          .map((entry, index) => h("path", {
            key: index,
            d: entry.d,
            fill: entry.fill,
            stroke: entry.stroke,
            "stroke-width": entry.strokeWidth,
            "stroke-linecap": entry.strokeLinecap,
            "stroke-linejoin": entry.strokeLinejoin,
            "fill-rule": entry.fillRule || data.fillRule || "nonzero",
            "clip-rule": entry.clipRule || data.clipRule || "nonzero",
            opacity: entry.opacity
          }))
      );
    };
  }
});

export const ResuxIcon = Icon;

export default defineResuxModule<ResuxIconsModuleOptions>({
  defaults: {
    collections: [],
    component: "Icon",
    mode: "svg",
    apiProvider: DEFAULT_ICON_API_PROVIDER,
    lazy: false
  },
  setup(options, resux) {
    const collections = Array.isArray(options.collections)
      ? [...new Set(options.collections.map((entry) => String(entry).trim()).filter(Boolean))]
      : [];
    resux.extendRuntimeConfig({
      public: {
        icons: {
          component: typeof options.component === "string" ? options.component : "Icon",
          collections,
          mode: options.mode || "svg",
          apiProvider: normalizeIconApiProvider(options.apiProvider),
          lazy: options.lazy === true
        }
      }
    });
  }
});
