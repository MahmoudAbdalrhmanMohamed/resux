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
    .replaceAll("%20", "+")
    .replaceAll("'", "%27");
  const weights = Array.isArray(input.weights)
    ? input.weights
      .map(normalizeWeight)
      .filter((weight): weight is string => Boolean(weight))
    : [];
  if (!weights.length) {
    return encodedName;
  }
  const normalizedWeights = [...new Set(weights)].sort(compareNormalizedWeights);
  return `${encodedName}:wght@${normalizedWeights.join(";")}`;
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

function compareNormalizedWeights(left: string, right: string): number {
  const leftRange = readWeightRange(left);
  const rightRange = readWeightRange(right);
  return leftRange.start - rightRange.start
    || leftRange.end - rightRange.end
    || compareCodeUnits(left, right);
}

function readWeightRange(value: string): { start: number; end: number } {
  const separator = value.indexOf("..");
  const start = Number(separator < 0 ? value : value.slice(0, separator));
  const end = separator < 0 ? start : Number(value.slice(separator + 2));
  return { start, end };
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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

type ResuxFontStrategy = "eager" | "preload" | "lazy";

function resolveFamilyStrategy(
  input: ResuxFontFamilyInput,
  options: ResuxFontsModuleOptions,
): ResuxFontStrategy {
  if (input.deferUntilPageLoad === true) {
    return "lazy";
  }
  if (input.deferUntilPageLoad === false) {
    if (input.strategy) {
      return input.strategy;
    }
    return options.strategy === "lazy" ? "eager" : (options.strategy ?? "preload");
  }
  if (input.strategy) {
    return input.strategy;
  }
  if (options.deferUntilPageLoad === true) {
    return "lazy";
  }
  return options.strategy ?? "preload";
}

function addGoogleFontGroup(
  families: ResuxFontFamilyInput[],
  strategy: ResuxFontStrategy,
  headLinks: Array<Record<string, string>>,
  headScripts: Array<Record<string, string>>,
  headNoscripts: Array<Record<string, unknown>>,
): void {
  const normalized = families
    .map((family) => normalizeFamily(family))
    .filter((family): family is string => Boolean(family));
  if (!normalized.length) {
    return;
  }

  const href = buildGoogleFontsHref(
    normalized,
    families.find((family) => family.display)?.display,
  );

  if (strategy === "eager") {
    headLinks.push({ rel: "stylesheet", href });
    return;
  }

  headLinks.push({ rel: "preload", as: "style", href });
  headNoscripts.push({
    link: [{ rel: "stylesheet", href }],
  });

  if (strategy === "preload") {
    headLinks.push({
      rel: "stylesheet",
      href,
      media: "print",
      onload: "this.media='all'",
      "data-resux-font-async": "true",
    });
    return;
  }

  headLinks.push({
    rel: "stylesheet",
    href,
    media: "print",
    "data-resux-font-lazy": "true",
  });
  headScripts.push({
    "data-resux-font-loader": "true",
    innerHTML: "(function(){function loadFonts(){document.querySelectorAll('link[data-resux-font-lazy=\"true\"]').forEach(function(link){link.media='all';});}if(document.readyState==='complete'){loadFonts();}else{window.addEventListener('load',loadFonts,{once:true});}})();",
  });
}

export default defineResuxModule<ResuxFontsModuleOptions>({
  defaults: {
    google: [],
    preconnect: true,
    strategy: "preload",
    deferUntilPageLoad: false,
  },
  setup(options, resux) {
    const googleFamilies = Array.isArray(options.google) ? options.google : [];
    if (!googleFamilies.length) {
      return;
    }

    const groups: Record<ResuxFontStrategy, ResuxFontFamilyInput[]> = {
      eager: [],
      preload: [],
      lazy: [],
    };

    for (const family of googleFamilies) {
      groups[resolveFamilyStrategy(family, options)].push(family);
    }

    const headLinks: Array<Record<string, string>> = [];
    const headScripts: Array<Record<string, string>> = [];
    const headNoscripts: Array<Record<string, unknown>> = [];

    if (options.preconnect !== false) {
      headLinks.push(
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      );
    }

    addGoogleFontGroup(groups.eager, "eager", headLinks, headScripts, headNoscripts);
    addGoogleFontGroup(groups.preload, "preload", headLinks, headScripts, headNoscripts);
    addGoogleFontGroup(groups.lazy, "lazy", headLinks, headScripts, headNoscripts);

    if (headLinks.length > 0 || headScripts.length > 0 || headNoscripts.length > 0) {
      resux.addHead({
        link: headLinks,
        ...(headScripts.length > 0 ? { script: headScripts } : {}),
        ...(headNoscripts.length > 0 ? { noscript: headNoscripts } : {}),
      });
    }

    resux.extendRuntimeConfig({
      public: {
        fonts: {
          provider: "google",
          families: googleFamilies.map((family) => family.name),
          familyConfigs: googleFamilies.map((family) => ({
            name: family.name,
            strategy: resolveFamilyStrategy(family, options),
            deferUntilPageLoad: resolveFamilyStrategy(family, options) === "lazy",
          })),
          strategy: options.strategy || "preload",
          deferUntilPageLoad: options.deferUntilPageLoad ?? false,
        },
      },
    });
  },
});
