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

const VALID_DISPLAYS = new Set(["auto", "block", "swap", "fallback", "optional"]);

function normalizeFamily(input: ResuxFontFamilyInput): string | null {
  const name = String(input.name || "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!name) {
    return null;
  }
  const encodedName = encodeURIComponent(name)
    .replace(/%20/g, "+")
    .replace(/'/g, "%27");
  const weights = Array.isArray(input.weights)
    ? input.weights
      .map(normalizeWeight)
      .filter((weight): weight is string => Boolean(weight))
    : [];
  if (!weights.length) {
    return encodedName;
  }
  return `${encodedName}:wght@${[...new Set(weights)].join(";")}`;
}

function normalizeWeight(value: number | string): string | null {
  const normalized = String(value).trim();
  const match = /^(\d{1,4})(?:\.\.(\d{1,4}))?$/.exec(normalized);
  if (!match) {
    return null;
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (start < 1 || start > 1000 || (end !== undefined && (end < start || end > 1000))) {
    return null;
  }
  return end === undefined ? String(start) : `${start}..${end}`;
}

function normalizeDisplay(value: unknown): string {
  return typeof value === "string" && VALID_DISPLAYS.has(value) ? value : "swap";
}

function buildGoogleFontsHref(families: string[], display: unknown): string {
  const familyQuery = families.map((family) => `family=${family}`).join("&");
  return `https://fonts.googleapis.com/css2?${familyQuery}&display=${normalizeDisplay(display)}`;
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
    deferUntilPageLoad: false,
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
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      );
    }

    if (eagerGroup.length > 0) {
      const eagerNormalized = eagerGroup
        .map((family) => normalizeFamily(family))
        .filter((family): family is string => Boolean(family));
      if (eagerNormalized.length > 0) {
        const href = buildGoogleFontsHref(
          eagerNormalized,
          eagerGroup.find((family) => family.display)?.display,
        );
        const isPreload = eagerGroup.some((family) => family.strategy === "preload")
          || options.strategy === "preload";
        if (isPreload) {
          headLinks.push({ rel: "preload", as: "style", href });
        }
        headLinks.push({ rel: "stylesheet", href });
      }
    }

    if (lazyGroup.length > 0) {
      const lazyNormalized = lazyGroup
        .map((family) => normalizeFamily(family))
        .filter((family): family is string => Boolean(family));
      if (lazyNormalized.length > 0) {
        const href = buildGoogleFontsHref(
          lazyNormalized,
          lazyGroup.find((family) => family.display)?.display,
        );
        headLinks.push({ rel: "preload", as: "style", href });
        headScripts.push({
          innerHTML: `(function(){function loadFonts(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(href)};document.head.appendChild(l);}if(document.readyState==='complete'){loadFonts();}else{window.addEventListener('load',loadFonts);}})();`,
        });
      }
    }

    if (headLinks.length > 0 || headScripts.length > 0) {
      resux.addHead({
        link: headLinks,
        ...(headScripts.length > 0 ? { script: headScripts } : {}),
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
            deferUntilPageLoad: isLazyFamily(family, options),
          })),
          strategy: options.strategy || "eager",
          deferUntilPageLoad: options.deferUntilPageLoad ?? false,
        },
      },
    });
  },
});
