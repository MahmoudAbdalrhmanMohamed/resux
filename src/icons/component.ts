import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type PropType,
} from "vue";
import { DEFAULT_FALLBACK_SVG_PATH, DEFAULT_FALLBACK_VIEWBOX, DEFAULT_ICON_SIZE } from "./constants.js";
import { renderCssMaskIcon } from "./css-mode.js";
import { resolveIconAsync, resolveIconSync } from "./resolver.js";
import { renderSvgIcon } from "./svg-mode.js";
import type { IconData, IconLoadingMode, IconMode, ResuxIconsConfig } from "./types.js";

function getIconsRuntimeConfig(): ResuxIconsConfig | undefined {
  try {
    if (typeof globalThis !== "undefined") {
      const g = globalThis as any;
      if (g.__RESUX__?.config?.public?.icons) {
        return g.__RESUX__.config.public.icons;
      }
      if (g.__RESUX__?.config?.icons) {
        return g.__RESUX__.config.icons;
      }
      if (g.__RESUX_APP__?.config?.public?.icons) {
        return g.__RESUX_APP__.config.public.icons;
      }
      if (g.__RESUX_APP__?.config?.icons) {
        return g.__RESUX_APP__.config.icons;
      }
      if (typeof g.useRuntimeConfig === "function") {
        const rc = g.useRuntimeConfig();
        if (rc?.public?.icons) return rc.public.icons;
        if (rc?.icons) return rc.icons;
      }
      if (g.__RESUX_RUNTIME_CONFIG__?.public?.icons) {
        return g.__RESUX_RUNTIME_CONFIG__.public.icons;
      }
    }
  } catch {
    // Ignore when outside Resux runtime context
  }
  return undefined;
}

export const Icon = defineComponent({
  name: "ResuxIcon",
  props: {
    name: { type: String, required: true },
    size: { type: [String, Number], default: DEFAULT_ICON_SIZE },
    mode: { type: String as PropType<IconMode>, default: undefined },
    ssr: { type: Boolean, default: undefined },
    lazy: { type: Boolean, default: false },
    loading: { type: String as PropType<IconLoadingMode>, default: "eager" },
    apiProvider: { type: String, default: "" },
    class: { type: String, default: "" },
  },
  setup(props, { attrs }) {
    const iconRef = ref<HTMLElement | null>(null);
    const isVisible = ref(false);
    const runtimeConfig = getIconsRuntimeConfig();

    const effectiveMode = computed<IconMode>(() => props.mode || runtimeConfig?.mode || "svg");
    const isSsrDisabled = computed(() => {
      if (props.ssr === false) return true;
      if (props.ssr === true) return false;
      return runtimeConfig?.ssr === false;
    });

    const isLazy = computed(() => props.lazy || props.loading === "lazy");
    const sizeValue = computed(() =>
      typeof props.size === "number" ? `${props.size}px` : String(props.size || "").trim() || DEFAULT_ICON_SIZE
    );

    // Initial synchronous resolution
    const initialSyncData = resolveIconSync(props.name, runtimeConfig);
    const dynamicData = ref<IconData | null>(initialSyncData);

    let requestRevision = 0;
    const loadDynamicIcon = () => {
      const requestedName = props.name;
      const revision = ++requestRevision;

      resolveIconAsync(requestedName, {
        ...runtimeConfig,
        apiProvider: props.apiProvider || runtimeConfig?.apiProvider,
      }).then((result) => {
        if (result && revision === requestRevision && requestedName === props.name) {
          dynamicData.value = result;
        }
      }).catch(() => {
        // Keep current or fallback icon when async resolution fails
      });
    };

    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      if (isLazy.value && typeof window !== "undefined" && "IntersectionObserver" in window) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              isVisible.value = true;
              if (!dynamicData.value) {
                loadDynamicIcon();
              }
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
        if (!dynamicData.value) {
          loadDynamicIcon();
        }
      }
    });

    onUnmounted(() => {
      requestRevision += 1;
      if (observer) {
        observer.disconnect();
      }
    });

    watch([() => props.name, () => props.apiProvider], () => {
      dynamicData.value = resolveIconSync(props.name, runtimeConfig);
      if (!dynamicData.value && (!isLazy.value || isVisible.value)) {
        loadDynamicIcon();
      }
    });

    return () => {
      // If SSR is explicitly disabled, render placeholder on server or until hydrated
      if (isSsrDisabled.value && (typeof window === "undefined" || !isVisible.value)) {
        return h("span", {
          ref: iconRef,
          class: ["resux-icon-placeholder inline-block shrink-0 align-middle", props.class]
            .filter(Boolean)
            .join(" "),
          style: { width: sizeValue.value, height: sizeValue.value },
          "data-icon-name": props.name,
          "data-icon-ssr": "false",
          "aria-hidden": "true",
          ...attrs,
        });
      }

      const activeData: IconData = dynamicData.value || {
        path: DEFAULT_FALLBACK_SVG_PATH,
        opacity: ".35",
        viewBox: DEFAULT_FALLBACK_VIEWBOX,
      };

      const mergedAttrs = {
        "data-icon-name": props.name,
        "data-icon-lazy": isLazy.value ? "true" : "false",
        ...attrs,
      };

      if (effectiveMode.value === "css") {
        return renderCssMaskIcon(activeData, sizeValue.value, props.class, { ref: iconRef, ...mergedAttrs });
      }

      return renderSvgIcon(activeData, sizeValue.value, props.class, mergedAttrs, iconRef);
    };
  },
});

export const ResuxIcon = Icon;
