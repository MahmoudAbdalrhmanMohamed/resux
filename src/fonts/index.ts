import { defineResuxModule } from "../kit/index.js";

export interface ResuxFontFamilyInput {
  name: string;
  weights?: Array<number | string>;
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  strategy?: "eager" | "preload" | "lazy";
  deferUntilPageLoad?: boolean;
}

export interface ResuxFontsModuleOptions {
  google?: ResuxFontFamilyInput[];
  preconnect?: boolean;
  strategy?: "eager" | "preload" | "lazy";
  deferUntilPageLoad?: boolean;
}

function normalizeFamily(input: ResuxFontFamilyInput): string | null {
  const name = String(input.name || "").trim();
  if (!name) {
    return null;
  }
  const family = name.replace(/\s+/g, "+");
  const weights = Array.isArray(input.weights)
    ? input.weights.map((weight) => String(weight).trim()).filter(Boolean)
    : [];
  if (!weights.length) {
    return `family=${family}`;
  }
  return `family=${family}:wght@${[...new Set(weights)].join(";")}`;
}

export function googleFont(input: ResuxFontFamilyInput): ResuxFontFamilyInput {
  return input;
}

function isLazyFamily(input: ResuxFontFamilyInput, options: ResuxFontsModuleOptions): boolean {
  if (typeof input.deferUntilPageLoad === "boolean") {
    if (input.deferUntilPageLoad) {
      return true;
    }
    return input.strategy === "lazy";
  }
  if (input.strategy) {
    return input.strategy === "lazy";
  }
  return options.strategy === "lazy" || options.deferUntilPageLoad === true;
}

export default defineResuxModule<ResuxFontsModuleOptions>({
  defaults: {
    google: [],
    preconnect: true,
    strategy: "eager",
    deferUntilPageLoad: false
  },
  setup(options, resux) {
    const googleFamilies = Array.isArray(options.google) ? options.google : [];
    if (!googleFamilies.length) {
      return;
    }

    const eagerGroup: ResuxFontFamilyInput[] = [];
    const lazyGroup: ResuxFontFamilyInput[] = [];

    for (const family of googleFamilies) {
      if (isLazyFamily(family, options)) {
        lazyGroup.push(family);
      } else {
        eagerGroup.push(family);
      }
    }

    const headLinks: Array<{ rel: string; href: string; as?: string; crossorigin?: string }> = [];
    const headScripts: Array<{ innerHTML: string }> = [];

    const hasAnyFonts = eagerGroup.length > 0 || lazyGroup.length > 0;
    if (options.preconnect !== false && hasAnyFonts) {
      headLinks.push(
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }
      );
    }

    if (eagerGroup.length > 0) {
      const eagerNormalized = eagerGroup
        .map((f) => normalizeFamily(f))
        .filter((f): f is string => Boolean(f));
      if (eagerNormalized.length > 0) {
        const display = eagerGroup.find((f) => f.display)?.display ?? "swap";
        const href = `https://fonts.googleapis.com/css2?${eagerNormalized.join("&")}&display=${display}`;
        const isPreload = eagerGroup.some((f) => f.strategy === "preload") || options.strategy === "preload";
        if (isPreload) {
          headLinks.push({ rel: "preload", as: "style", href });
        }
        headLinks.push({ rel: "stylesheet", href });
      }
    }

    if (lazyGroup.length > 0) {
      const lazyNormalized = lazyGroup
        .map((f) => normalizeFamily(f))
        .filter((f): f is string => Boolean(f));
      if (lazyNormalized.length > 0) {
        const display = lazyGroup.find((f) => f.display)?.display ?? "swap";
        const href = `https://fonts.googleapis.com/css2?${lazyNormalized.join("&")}&display=${display}`;
        headLinks.push({ rel: "preload", as: "style", href });
        headScripts.push({
          innerHTML: `(function(){function loadFonts(){var l=document.createElement('link');l.rel='stylesheet';l.href='${href}';document.head.appendChild(l);}if(document.readyState==='complete'){loadFonts();}else{window.addEventListener('load',loadFonts);}})();`
        });
      }
    }

    if (headLinks.length > 0 || headScripts.length > 0) {
      resux.addHead({
        link: headLinks,
        ...(headScripts.length > 0 ? { script: headScripts } : {})
      });
    }

    resux.extendRuntimeConfig({
      public: {
        fonts: {
          provider: "google",
          families: googleFamilies.map((family) => family.name),
          familyConfigs: googleFamilies.map((family) => ({
            name: family.name,
            strategy: family.strategy || options.strategy || "eager",
            deferUntilPageLoad: isLazyFamily(family, options)
          })),
          strategy: options.strategy || "eager",
          deferUntilPageLoad: options.deferUntilPageLoad ?? false
        }
      }
    });
  }
});

