import { defineComponent, h, computed, ref, onMounted, onUnmounted, watch } from "vue";
import { defineResuxModule } from "../kit/index.js";

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

export interface IconData {
  path?: string;
  opacity?: string;
  viewBox?: string;
}

export const iconRegistry: Record<string, IconData> = {
  "material-symbols:call": { path: "M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.26 1.02l-2.2 2.2z" },
  "call": { path: "M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.26 1.02l-2.2 2.2z" },
  "material-symbols:mail": { path: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5l-8-5V6l8 5l8-5v2z" },
  "material-symbols-light:mail-outline-sharp": { path: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5l-8-5V6l8 5l8-5v2z" },
  "material-symbols:mail-outline": { path: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5l-8-5V6l8 5l8-5v2z" },
  "mail": { path: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5l-8-5V6l8 5l8-5v2z" },
  "material-symbols:location-on-outline-rounded": { path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5z" },
  "location": { path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5z" },
  "material-symbols:warning": { path: "M1 21h22L12 2L1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" },
  "warning": { path: "M1 21h22L12 2L1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" },
  "material-symbols:error": { path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" },
  "error": { path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" },
  "material-symbols:close": { path: "M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" },
  "close": { path: "M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" },
  "material-symbols:add": { path: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" },
  "add": { path: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" },
  "material-symbols:keyboard-arrow-down": { path: "m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" },
  "arrow-down": { path: "m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" },
  "mdi:facebook": { path: "M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" },
  "mdi:facebook-box": { path: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3h-1.8v-2.2h1.8V9.3c0-1.8 1.1-2.8 2.7-2.8c.8 0 1.5.1 1.7.1v2h-1.2c-.9 0-1 .4-1 1v1.3h2.2l-.3 2.2h-1.9v5.3h-2.2z" },
  "facebook": { path: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3h-1.8v-2.2h1.8V9.3c0-1.8 1.1-2.8 2.7-2.8c.8 0 1.5.1 1.7.1v2h-1.2c-.9 0-1 .4-1 1v1.3h2.2l-.3 2.2h-1.9v5.3h-2.2z" },
  "mingcute:instagram-fill": { path: "M16 3a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm-4 5a4 4 0 1 0 0 8a4 4 0 0 0 0-8m0 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4m4.5-3.5a1 1 0 1 0 0 2a1 1 0 0 0 0-2" },
  "instagram": { path: "M16 3a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm-4 5a4 4 0 1 0 0 8a4 4 0 0 0 0-8m0 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4m4.5-3.5a1 1 0 1 0 0 2a1 1 0 0 0 0-2" },
  "cib:linkedin": { path: "M27.26 27.271h-4.733v-7.427c0-1.771-.037-4.047-2.475-4.047c-2.468 0-2.844 1.921-2.844 3.916v7.557h-4.739V11.999h4.552v2.083h.061c.636-1.203 2.183-2.468 4.491-2.468c4.801 0 5.692 3.161 5.692 7.271v8.385zM7.115 9.912a2.75 2.75 0 0 1-2.751-2.756a2.753 2.753 0 1 1 2.751 2.756m2.374 17.359H4.74V12h4.749zM29.636 0H2.36C1.057 0 0 1.031 0 2.307v27.387c0 1.276 1.057 2.307 2.36 2.307h27.271c1.301 0 2.369-1.031 2.369-2.307V2.307C32 1.031 30.932 0 29.636 0z" },
  "lineicons:linkedin": { path: "M27.26 27.271h-4.733v-7.427c0-1.771-.037-4.047-2.475-4.047c-2.468 0-2.844 1.921-2.844 3.916v7.557h-4.739V11.999h4.552v2.083h.061c.636-1.203 2.183-2.468 4.491-2.468c4.801 0 5.692 3.161 5.692 7.271v8.385zM7.115 9.912a2.75 2.75 0 0 1-2.751-2.756a2.753 2.753 0 1 1 2.751 2.756m2.374 17.359H4.74V12h4.749zM29.636 0H2.36C1.057 0 0 1.031 0 2.307v27.387c0 1.276 1.057 2.307 2.36 2.307h27.271c1.301 0 2.369-1.031 2.369-2.307V2.307C32 1.031 30.932 0 29.636 0z" },
  "linkedin": { path: "M27.26 27.271h-4.733v-7.427c0-1.771-.037-4.047-2.475-4.047c-2.468 0-2.844 1.921-2.844 3.916v7.557h-4.739V11.999h4.552v2.083h.061c.636-1.203 2.183-2.468 4.491-2.468c4.801 0 5.692 3.161 5.692 7.271v8.385zM7.115 9.912a2.75 2.75 0 0 1-2.751-2.756a2.753 2.753 0 1 1 2.751 2.756m2.374 17.359H4.74V12h4.749zM29.636 0H2.36C1.057 0 0 1.031 0 2.307v27.387c0 1.276 1.057 2.307 2.36 2.307h27.271c1.301 0 2.369-1.031 2.369-2.307V2.307C32 1.031 30.932 0 29.636 0z" },
  "uil:youtube": { path: "M23 9.71a8.5 8.5 0 0 0-.91-4.13a2.92 2.92 0 0 0-1.72-1A78 78 0 0 0 12 4.27a79 79 0 0 0-8.34.3a2.87 2.87 0 0 0-1.46.74c-.9.83-1 2.25-1.1 3.45a48 48 0 0 0 0 6.48a9.6 9.6 0 0 0 .3 2a3.14 3.14 0 0 0 .71 1.36a2.86 2.86 0 0 0 1.49.78a45 45 0 0 0 6.5.33c3.5.05 6.57 0 10.2-.28a2.9 2.9 0 0 0 1.53-.78a2.5 2.5 0 0 0 .61-1a10.6 10.6 0 0 0 .52-3.4c.04-.56.04-3.94.04-4.54M9.74 14.85V8.66l5.92 3.11c-1.66.92-3.85 1.96-5.92 3.08" },
  "youtube": { path: "M23 9.71a8.5 8.5 0 0 0-.91-4.13a2.92 2.92 0 0 0-1.72-1A78 78 0 0 0 12 4.27a79 79 0 0 0-8.34.3a2.87 2.87 0 0 0-1.46.74c-.9.83-1 2.25-1.1 3.45a48 48 0 0 0 0 6.48a9.6 9.6 0 0 0 .3 2a3.14 3.14 0 0 0 .71 1.36a2.86 2.86 0 0 0 1.49.78a45 45 0 0 0 6.5.33c3.5.05 6.57 0 10.2-.28a2.9 2.9 0 0 0 1.53-.78a2.5 2.5 0 0 0 .61-1a10.6 10.6 0 0 0 .52-3.4c.04-.56.04-3.94.04-4.54M9.74 14.85V8.66l5.92 3.11c-1.66.92-3.85 1.96-5.92 3.08" },
  "line-md:twitter-x": { path: "M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  "twitter": { path: "M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  "ic:baseline-whatsapp": { path: "M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.55 0 8.25 3.7 8.25 8.25c0 4.55-3.7 8.25-8.25 8.25c-1.47 0-2.88-.39-4.12-1.12l-.3-.18l-3.07.81l.82-2.99l-.19-.31A8.204 8.204 0 0 1 3.8 11.92c0-4.55 3.7-8.25 8.25-8.25z" },
  "streamline:interface-validation-check-circle-checkmark-addition-circle-success-check-validation-add-form": { path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" },
  "ph:check-circle-thin": { path: "M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 19a9 9 0 1 1 9-9a9.01 9.01 0 0 1-9 9zm4.53-11.47a.5.5 0 0 1 0 .71l-5 5a.5.5 0 0 1-.71 0l-2.5-2.5a.5.5 0 1 1 .71-.71L11.17 14.4l4.65-4.65a.5.5 0 0 1 .71 0z" },
  "solar:check-circle-linear": { path: "M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 19a9 9 0 1 1 9-9a9.01 9.01 0 0 1-9 9zm4.53-11.47a.5.5 0 0 1 0 .71l-5 5a.5.5 0 0 1-.71 0l-2.5-2.5a.5.5 0 1 1 .71-.71L11.17 14.4l4.65-4.65a.5.5 0 0 1 .71 0z" },
  "lucide-lab:flower-lotus": { path: "M12 21c-4.418 0-8-3.582-8-8c0-3.5 3.5-7 8-11c4.5 4 8 7.5 8 11c0 4.418-3.582 8-8 8z" },
  "solar:leaf-outline": { path: "M12 21c-4.418 0-8-3.582-8-8c0-3.5 3.5-7 8-11c4.5 4 8 7.5 8 11c0 4.418-3.582 8-8 8z" },
  "solar:command-linear": { path: "M8.5 5A3.5 3.5 0 0 0 5 8.5v.5A3.5 3.5 0 0 0 8.5 12.5H9v-1h-.5A2.5 2.5 0 0 1 6 9v-.5A2.5 2.5 0 0 1 8.5 6H9V5h-.5zm7 0H15v1h.5a2.5 2.5 0 0 1 2.5 2.5v.5a2.5 2.5 0 0 1-2.5 2.5H15v1h.5a3.5 3.5 0 0 0 3.5-3.5v-.5A3.5 3.5 0 0 0 15.5 5z" },
  "gg:mouse": { path: "M12 5a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1M4 8a8 8 0 1 1 16 0v8a8 8 0 1 1-16 0zm14 0v8a6 6 0 0 1-12 0V8a6 6 0 1 1 12 0" },
  "mouse": { path: "M12 5a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1M4 8a8 8 0 1 1 16 0v8a8 8 0 1 1-16 0zm14 0v8a6 6 0 0 1-12 0V8a6 6 0 1 1 12 0" },
  "iconoir:flash": { path: "M13 10V3L5 14h6v7l8-11z" },
  "flash": { path: "M13 10V3L5 14h6v7l8-11z" },
  "hugeicons:search-01": { path: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z" },
  "search": { path: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z" },
  "solar:info-circle-outline": { path: "M12 17.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75M12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2M1.25 12C1.25 6.063 6.063 1.25 12 1.25S22.75 6.063 22.75 12S17.937 22.75 12 22.75S1.25 17.937 1.25 12M12 2.75a9.25 9.25 0 1 0 0 18.5a9.25 9.25 0 0 0 0-18.5" },
  "ic:sharp-tag-faces": { path: "M12.01 2C6.49 2 2.02 6.48 2.02 12s4.47 10 9.99 10c5.53 0 10.01-4.48 10.01-10S17.54 2 12.01 2m.01 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.35 8 15.52 8s-1.5.67-1.5 1.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.35 8 8.52 8s-1.5.67-1.5 1.5s.67 1.5 1.5 1.5m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.91c.8 2.04 2.78 3.5 5.11 3.5" },
  "hamburger": { path: "M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" },
  "svg-spinners:ring-resize": { path: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" }
};

if (typeof globalThis !== "undefined") {
  (globalThis as any).__RESUX_ICON_REGISTRY__ = iconRegistry;
}

const pendingFetches = new Map<string, Promise<IconData | null>>();

export function fetchIconifyIcon(name: string): Promise<IconData | null> {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return Promise.resolve(null);
  if (iconRegistry[normalized]) {
    return Promise.resolve(iconRegistry[normalized]);
  }
  if (pendingFetches.has(normalized)) {
    return pendingFetches.get(normalized)!;
  }

  const parts = normalized.split(":");
  if (parts.length !== 2) return Promise.resolve(null);

  const prefix = parts[0];
  const iconName = parts[1];
  const url = `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}.svg`;

  const fetchPromise = fetch(url)
    .then((res) => {
      if (!res.ok) return null;
      return res.text();
    })
    .then((svgText) => {
      if (!svgText) return null;
      const pathMatch = /d="([^"]+)"/.exec(svgText);
      const viewBoxMatch = /viewBox="([^"]+)"/.exec(svgText);
      const iconData: IconData = {
        path: pathMatch ? pathMatch[1] : "",
        viewBox: viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24"
      };
      if (iconData.path) {
        iconRegistry[normalized] = iconData;
        return iconData;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      pendingFetches.delete(normalized);
    });

  pendingFetches.set(normalized, fetchPromise);
  return fetchPromise;
}

export const Icon = defineComponent({
  name: "ResuxIcon",
  props: {
    name: { type: String, required: true },
    size: { type: [String, Number], default: "1.25rem" },
    mode: { type: String, default: "svg" },
    lazy: { type: Boolean, default: false },
    loading: { type: String, default: "eager" },
    class: { type: String, default: "" }
  },
  setup(props, { attrs }) {
    const iconRef = ref<HTMLElement | null>(null);
    const isVisible = ref(false);
    const iconName = computed(() => String(props.name || "").trim().toLowerCase());
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

    const loadDynamicIcon = () => {
      if (!iconRegistry[iconName.value]) {
        fetchIconifyIcon(iconName.value).then((res) => {
          if (res) dynamicData.value = res;
        });
      }
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
      if (observer) {
        observer.disconnect();
      }
    });

    watch(iconName, () => {
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
          fill: "currentColor",
          class: ["inline-block shrink-0 align-middle", props.class].filter(Boolean).join(" "),
          style: { width: sizeValue.value, height: sizeValue.value },
          "aria-hidden": "true",
          "data-icon-name": props.name,
          "data-icon-lazy": isLazy.value ? "true" : "false",
          ...attrs
        },
        [
          h("path", {
            d: data.path || "",
            fillRule: "evenodd",
            clipRule: "evenodd",
            opacity: data.opacity || "1"
          })
        ]
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
          lazy: options.lazy === true
        }
      }
    });
  }
});
