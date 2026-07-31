import { readFile, writeFile } from "node:fs/promises";

const file = "src/icons/index.ts";
let source = await readFile(file, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) {
    throw new Error(`Could not find ${label}`);
  }
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected one ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceSection(label, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`Could not find start of ${label}`);
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    throw new Error(`Could not find end of ${label}`);
  }
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceOnce(
  "runtime config import",
  `import { defineResuxModule } from "../kit/index.js";`,
  `import { defineResuxModule } from "../kit/index.js";
import { useRuntimeConfig } from "../runtime/index.js";`,
);

replaceOnce(
  "icon data interface",
  `export interface IconData {
  path?: string;
  opacity?: string;
  viewBox?: string;
}`,
  `export interface IconPathData {
  d: string;
  opacity?: string;
}

export interface IconData {
  path?: string;
  paths?: IconPathData[];
  opacity?: string;
  viewBox?: string;
}`,
);

replaceSection(
  "dynamic icon loader",
  `const pendingFetches = new Map<string, Promise<IconData | null>>();`,
  `\nexport const Icon = defineComponent({`,
  `const DEFAULT_ICON_API_PROVIDER = "https://api.iconify.design";
const pendingFetches = new Map<string, Promise<IconData | null>>();
const fetchedIconCache = new Map<string, IconData>();

export function normalizeIconApiProvider(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().replace(/\\/+$/g, "") : "";
  if (!raw) {
    return DEFAULT_ICON_API_PROVIDER;
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString().replace(/\\/+$/g, "");
    }
  } catch {
    // Fall back to the public provider for malformed values.
  }
  return DEFAULT_ICON_API_PROVIDER;
}

export function fetchIconifyIcon(
  name: string,
  apiProvider: string = DEFAULT_ICON_API_PROVIDER,
): Promise<IconData | null> {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return Promise.resolve(null);
  if (iconRegistry[normalized]) {
    return Promise.resolve(iconRegistry[normalized]);
  }

  const parts = normalized.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return Promise.resolve(null);
  }

  const provider = normalizeIconApiProvider(apiProvider);
  const cacheKey = provider + "::" + normalized;
  const cached = fetchedIconCache.get(cacheKey);
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

  const fetchPromise = fetch(url)
    .then((response) => response.ok ? response.text() : null)
    .then((svgText) => {
      if (!svgText) return null;
      const viewBox = readSvgAttribute(svgText, "viewBox") || "0 0 24 24";
      const paths = [...svgText.matchAll(/<path\\b[^>]*>/gi)]
        .map((match) => ({
          d: readSvgAttribute(match[0], "d"),
          opacity: readSvgAttribute(match[0], "opacity") || undefined,
        }))
        .filter((entry): entry is IconPathData => Boolean(entry.d));
      if (!paths.length) {
        return null;
      }
      const data: IconData = {
        path: paths[0].d,
        paths,
        viewBox,
      };
      fetchedIconCache.set(cacheKey, data);
      return data;
    })
    .catch(() => null)
    .finally(() => {
      pendingFetches.delete(cacheKey);
    });

  pendingFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

function readSvgAttribute(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^\${}()|[\\]\\]/g, "\\\\$&");
  const match = new RegExp("\\\\b" + escapedName + "\\\\s*=\\\\s*([\\\"'])((?:\\\\.|(?!\\\\1)[\\\\s\\\\S])*)\\\\1", "i").exec(source);
  return match?.[2]?.trim() || "";
}
`,
);

replaceOnce(
  "api provider prop",
  `    loading: { type: String, default: "eager" },
    class: { type: String, default: "" }`,
  `    loading: { type: String, default: "eager" },
    apiProvider: { type: String, default: "" },
    class: { type: String, default: "" }`,
);

replaceOnce(
  "component provider state",
  `    const iconName = computed(() => String(props.name || "").trim().toLowerCase());
    const dynamicData = ref<IconData | null>(null);`,
  `    const iconName = computed(() => String(props.name || "").trim().toLowerCase());
    const runtimeConfig = useRuntimeConfig();
    const configuredProvider = (runtimeConfig.public?.icons as { apiProvider?: unknown } | undefined)?.apiProvider;
    const apiProvider = computed(() => normalizeIconApiProvider(props.apiProvider || configuredProvider));
    const dynamicData = ref<IconData | null>(null);`,
);

replaceOnce(
  "dynamic icon request guard",
  `    const loadDynamicIcon = () => {
      if (!iconRegistry[iconName.value]) {
        fetchIconifyIcon(iconName.value).then((res) => {
          if (res) dynamicData.value = res;
        });
      }
    };

    let observer: IntersectionObserver | null = null;`,
  `    let requestRevision = 0;
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

    let observer: IntersectionObserver | null = null;`,
);

replaceOnce(
  "icon unmount cancellation",
  `    onUnmounted(() => {
      if (observer) {
        observer.disconnect();
      }
    });

    watch(iconName, () => {`,
  `    onUnmounted(() => {
      requestRevision += 1;
      if (observer) {
        observer.disconnect();
      }
    });

    watch([iconName, apiProvider], () => {`,
);

replaceOnce(
  "multi path rendering",
  `        [
          h("path", {
            d: data.path || "",
            fillRule: "evenodd",
            clipRule: "evenodd",
            opacity: data.opacity || "1"
          })
        ]`,
  `        (data.paths?.length ? data.paths : [{ d: data.path || "", opacity: data.opacity }])
          .map((entry, index) => h("path", {
            key: index,
            d: entry.d,
            fillRule: "evenodd",
            clipRule: "evenodd",
            opacity: entry.opacity || "1"
          }))`,
);

replaceOnce(
  "default provider option",
  `    mode: "svg",
    lazy: false`,
  `    mode: "svg",
    apiProvider: DEFAULT_ICON_API_PROVIDER,
    lazy: false`,
);

replaceOnce(
  "runtime provider config",
  `          mode: options.mode || "svg",
          lazy: options.lazy === true`,
  `          mode: options.mode || "svg",
          apiProvider: normalizeIconApiProvider(options.apiProvider),
          lazy: options.lazy === true`,
);

await writeFile(file, source, "utf8");
console.log("Applied icon runtime fixes.");
