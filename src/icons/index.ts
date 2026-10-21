import { defineResuxModule, addVitePlugin } from "../kit/index.js";
import { DEFAULT_CUSTOM_COLLECTIONS_DIR, DEFAULT_ICON_API_PROVIDER, DEFAULT_ICON_SIZE } from "./constants.js";
import { normalizeIconApiProvider } from "./normalize.js";
import { iconRegistry } from "./registry.js";
import { createIconsVitePlugin } from "./transform.js";
import type { IconMode, ResuxIconsConfig } from "./types.js";

export interface ResuxIconsModuleOptions extends ResuxIconsConfig {}

export function defineIconCollections(collections: string[]): ResuxIconsModuleOptions {
  return { collections };
}

// Re-export modular subsystem interfaces and functions
export { iconRegistry, iconAliases, registerStaticIcon, getStaticIcon } from "./registry.js";
export type { IconData, IconPathData, IconProps, IconMode, IconLoadingMode, ResuxIconsConfig } from "./types.js";
export { normalizeIconApiProvider, parseIconName, stripTrailingSlashes } from "./normalize.js";
export { fetchIconifyIcon } from "./api-fetcher.js";
export { resolveIconSync, resolveIconAsync } from "./resolver.js";
export { loadLocalSvgIcon, loadLocalSvgIconSync, clearLocalSvgCache } from "./local-svg.js";
export { loadOfflineIcon, registerOfflineCollection, clearOfflineCollectionCache } from "./offline-loader.js";
export { renderCssMaskIcon, buildCssMaskStyle, svgToDataUri, iconDataToSvgString } from "./css-mode.js";
export { renderSvgIcon } from "./svg-mode.js";
export { transformStaticIcons, createIconsVitePlugin } from "./transform.js";
export { Icon, ResuxIcon } from "./component.js";

if (typeof globalThis !== "undefined") {
  (globalThis as any).__RESUX_ICON_REGISTRY__ = iconRegistry;
}

export default defineResuxModule<ResuxIconsModuleOptions>({
  defaults: {
    collections: [],
    component: "Icon",
    mode: "svg" as IconMode,
    ssr: true,
    apiProvider: DEFAULT_ICON_API_PROVIDER,
    lazy: false,
    defaultSize: DEFAULT_ICON_SIZE,
    aliases: {},
    customCollectionsDir: DEFAULT_CUSTOM_COLLECTIONS_DIR,
  },
  setup(options, resux) {
    const collections = Array.isArray(options.collections)
      ? [...new Set(options.collections.map((entry) => String(entry).trim()).filter(Boolean))]
      : [];

    const normalizedConfig: ResuxIconsConfig = {
      component: typeof options.component === "string" ? options.component : "Icon",
      collections,
      mode: options.mode || "svg",
      ssr: options.ssr !== false,
      apiProvider: normalizeIconApiProvider(options.apiProvider),
      lazy: options.lazy === true,
      defaultSize: options.defaultSize || DEFAULT_ICON_SIZE,
      aliases: options.aliases || {},
      customCollectionsDir: options.customCollectionsDir || DEFAULT_CUSTOM_COLLECTIONS_DIR,
    };

    resux.extendRuntimeConfig({
      public: {
        icons: normalizedConfig,
      },
    });

    try {
      addVitePlugin(createIconsVitePlugin(normalizedConfig));
    } catch {
      // If outside Vite context, ignore
    }
  },
});
