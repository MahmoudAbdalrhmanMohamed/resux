import { defineResuxModule } from "../kit/index.js";

export type ResuxFontStrategy = "eager" | "preload" | "lazy";
export type ResuxFontDisplay = "auto" | "block" | "swap" | "fallback" | "optional";
export type ResuxFontProvider = "google" | "local" | "remote";

export interface ResuxFontSourceInput {
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype" | "embedded-opentype";
}

export interface ResuxFontFaceInput {
  src: string | ResuxFontSourceInput | Array<string | ResuxFontSourceInput>;
  weight?: number | string;
  style?: "normal" | "italic" | "oblique";
  display?: ResuxFontDisplay;
  unicodeRange?: string;
  preload?: boolean;
}

export interface ResuxFontFamilyInput {
  name: string;
  provider?: ResuxFontProvider;
  weights?: Array<number | string>;
  display?: ResuxFontDisplay;
  strategy?: ResuxFontStrategy;
  deferUntilPageLoad?: boolean;
  src?: string | ResuxFontSourceInput | Array<string | ResuxFontSourceInput>;
  faces?: ResuxFontFaceInput[];
  weight?: number | string;
  style?: "normal" | "italic" | "oblique";
  unicodeRange?: string;
  preload?: boolean;
  variable?: string;
}

export interface ResuxFontsModuleOptions {
  /** Backward-compatible Google Fonts declaration. */
  google?: ResuxFontFamilyInput[];
  /** Provider-aware families. Local/remote families can provide src/faces; Google families use weights. */
  families?: ResuxFontFamilyInput[];
  preconnect?: boolean;
  strategy?: ResuxFontStrategy;
  deferUntilPageLoad?: boolean;
}

const VALID_DISPLAYS = new Set(["auto", "block", "swap", "fallback", "optional"]);
const VALID_STYLES = new Set(["normal", "italic", "oblique"]);
const VALID_FORMATS = new Set(["woff2", "woff", "truetype", "opentype", "embedded-opentype"]);

function normalizeFamily(input: ResuxFontFamilyInput): string | null {
  const name = sanitizeFontFamilyName(input.name);
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

function sanitizeFontFamilyName(value: unknown): string {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
}

function normalizeWeight(value: number | string): string | null {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "normal") return "400";
  if (normalized === "bold") return "700";
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

function normalizeCssWeight(value: number | string | undefined): string {
  const normalized = value === undefined ? null : normalizeWeight(value);
  if (!normalized) return "400";
  return normalized.replace("..", " ");
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

function normalizeDisplay(value: unknown): ResuxFontDisplay {
  return typeof value === "string" && VALID_DISPLAYS.has(value)
    ? value as ResuxFontDisplay
    : "swap";
}

function normalizeStyle(value: unknown): "normal" | "italic" | "oblique" {
  return typeof value === "string" && VALID_STYLES.has(value)
    ? value as "normal" | "italic" | "oblique"
    : "normal";
}

function buildGoogleFontsHref(families: string[], display: unknown): string {
  const familyQuery = families.map((family) => `family=${family}`).join("&");
  return `https://fonts.googleapis.com/css2?${familyQuery}&display=${normalizeDisplay(display)}`;
}

export function googleFont(input: ResuxFontFamilyInput): ResuxFontFamilyInput {
  return { ...input, provider: "google" };
}

export function localFont(input: ResuxFontFamilyInput): ResuxFontFamilyInput {
  return { ...input, provider: "local" };
}

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

function resolveProvider(input: ResuxFontFamilyInput): ResuxFontProvider {
  if (input.provider === "local" || input.provider === "remote" || input.provider === "google") {
    return input.provider;
  }
  const urls = fontFamilySourceUrls(input);
  if (urls.length > 0) {
    return urls.every((url) => /^https?:\/\//i.test(url.trim())) ? "remote" : "local";
  }
  return "google";
}

function fontFamilySourceUrls(input: ResuxFontFamilyInput): string[] {
  const faces = Array.isArray(input.faces) && input.faces.length > 0
    ? input.faces
    : input.src ? [{ src: input.src }] : [];
  const urls: string[] = [];
  for (const face of faces) {
    const entries = Array.isArray(face.src) ? face.src : [face.src];
    for (const entry of entries) {
      const url = typeof entry === "string" ? entry : entry?.url;
      if (typeof url === "string" && url.trim()) {
        urls.push(url.trim());
      }
    }
  }
  return urls;
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

function normalizeSourceUrl(value: unknown): string | null {
  const url = String(value || "").trim();
  if (!url || /[\u0000-\u001F\u007F]/.test(url) || /^(?:javascript|vbscript):/i.test(url)) {
    return null;
  }
  if (
    url.startsWith("/")
    || url.startsWith("./")
    || url.startsWith("../")
    || /^https?:\/\//i.test(url)
    || /^data:font\//i.test(url)
  ) {
    return url.replace(/[\r\n"'()\\]/g, (character) => encodeURIComponent(character));
  }
  return null;
}

function inferFontFormat(url: string): ResuxFontSourceInput["format"] | undefined {
  const path = url.split(/[?#]/, 1)[0].toLowerCase();
  if (path.endsWith(".woff2")) return "woff2";
  if (path.endsWith(".woff")) return "woff";
  if (path.endsWith(".ttf")) return "truetype";
  if (path.endsWith(".otf")) return "opentype";
  if (path.endsWith(".eot")) return "embedded-opentype";
  return undefined;
}

function normalizeSources(
  input: string | ResuxFontSourceInput | Array<string | ResuxFontSourceInput>,
): ResuxFontSourceInput[] {
  const entries = Array.isArray(input) ? input : [input];
  const sources: ResuxFontSourceInput[] = [];
  for (const entry of entries) {
    const source = typeof entry === "string" ? { url: entry } : entry;
    const url = normalizeSourceUrl(source?.url);
    if (!url) continue;
    const format = source?.format && VALID_FORMATS.has(source.format)
      ? source.format
      : inferFontFormat(url);
    sources.push({ url, ...(format ? { format } : {}) });
  }
  return sources.sort((left, right) => fontSourcePriority(left.format) - fontSourcePriority(right.format));
}

function fontSourcePriority(format: ResuxFontSourceInput["format"]): number {
  if (format === "woff2") return 0;
  if (format === "woff") return 1;
  if (format === "opentype") return 2;
  if (format === "truetype") return 3;
  if (format === "embedded-opentype") return 4;
  return 5;
}

function normalizeFaces(family: ResuxFontFamilyInput): ResuxFontFaceInput[] {
  if (Array.isArray(family.faces) && family.faces.length > 0) {
    return family.faces.filter((face) => Boolean(face?.src));
  }
  if (!family.src) {
    return [];
  }
  return [{
    src: family.src,
    weight: family.weight,
    style: family.style,
    display: family.display,
    unicodeRange: family.unicodeRange,
    preload: family.preload,
  }];
}

function escapeCssString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function normalizeUnicodeRange(value: unknown): string | null {
  const range = String(value || "").trim();
  if (!range) return null;
  const tokens = range.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) return null;

  const normalized: string[] = [];
  for (const token of tokens) {
    const wildcard = /^U\+([0-9A-F]{0,5})(\?{1,6})$/i.exec(token);
    if (wildcard) {
      const prefix = wildcard[1];
      const wildcards = wildcard[2];
      if (prefix.length + wildcards.length > 6) return null;
      const min = Number.parseInt((prefix + "0".repeat(wildcards.length)) || "0", 16);
      const max = Number.parseInt((prefix + "F".repeat(wildcards.length)) || "0", 16);
      if (max > 0x10FFFF || min > max) return null;
      normalized.push(`U+${prefix.toUpperCase()}${wildcards}`);
      continue;
    }

    const explicit = /^U\+([0-9A-F]{1,6})(?:-([0-9A-F]{1,6}))?$/i.exec(token);
    if (!explicit) return null;
    const start = Number.parseInt(explicit[1], 16);
    const end = explicit[2] ? Number.parseInt(explicit[2], 16) : start;
    if (start > 0x10FFFF || end > 0x10FFFF || start > end) return null;
    normalized.push(explicit[2]
      ? `U+${explicit[1].toUpperCase()}-${explicit[2].toUpperCase()}`
      : `U+${explicit[1].toUpperCase()}`);
  }
  return normalized.join(", ");
}

function sourceCss(sources: ResuxFontSourceInput[]): string {
  return sources.map((source) => {
    const format = source.format ? ` format("${source.format}")` : "";
    return `url("${escapeCssString(source.url)}")${format}`;
  }).join(", ");
}

function fontMimeType(format: ResuxFontSourceInput["format"]): string | undefined {
  if (format === "woff2") return "font/woff2";
  if (format === "woff") return "font/woff";
  if (format === "truetype") return "font/ttf";
  if (format === "opentype") return "font/otf";
  if (format === "embedded-opentype") return "application/vnd.ms-fontobject";
  return undefined;
}

function normalizeCssVariable(value: unknown): string | null {
  const variable = String(value || "").trim();
  if (!variable) return null;
  return /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(variable) ? variable : null;
}

function buildCustomFontStyles(
  families: ResuxFontFamilyInput[],
  options: ResuxFontsModuleOptions,
  headLinks: Array<Record<string, string>>,
): { initialCss: string; lazyCss: string } {
  const initialRules: string[] = [];
  const lazyRules: string[] = [];
  const variables: string[] = [];
  const preloaded = new Set<string>();

  for (const family of families) {
    const familyName = sanitizeFontFamilyName(family.name);
    if (!familyName) continue;
    const strategy = resolveFamilyStrategy(family, options);
    const familyDisplay = normalizeDisplay(family.display);
    const variable = normalizeCssVariable(family.variable);
    if (variable) {
      variables.push(`${variable}: "${escapeCssString(familyName)}";`);
    }

    for (const face of normalizeFaces(family)) {
      const sources = normalizeSources(face.src);
      if (!sources.length) continue;
      const display = normalizeDisplay(face.display ?? familyDisplay);
      const weight = normalizeCssWeight(face.weight ?? family.weight);
      const style = normalizeStyle(face.style ?? family.style);
      const rawUnicodeRange = face.unicodeRange ?? family.unicodeRange;
      const unicodeRange = normalizeUnicodeRange(rawUnicodeRange);
      if (rawUnicodeRange != null && String(rawUnicodeRange).trim() && !unicodeRange) {
        continue;
      }
      const declarations = [
        `font-family: "${escapeCssString(familyName)}"`,
        `src: ${sourceCss(sources)}`,
        `font-weight: ${weight}`,
        `font-style: ${style}`,
        `font-display: ${display}`,
      ];
      if (unicodeRange) {
        declarations.push(`unicode-range: ${unicodeRange}`);
      }
      const rule = `@font-face { ${declarations.join("; ")}; }`;
      (strategy === "lazy" ? lazyRules : initialRules).push(rule);

      const shouldPreload = face.preload ?? family.preload ?? strategy === "preload";
      if (!shouldPreload || strategy === "lazy") continue;
      const preferred = sources[0];
      if (!preferred || preloaded.has(preferred.url)) continue;
      preloaded.add(preferred.url);
      const type = fontMimeType(preferred.format);
      headLinks.push({
        rel: "preload",
        as: "font",
        href: preferred.url,
        crossorigin: "",
        ...(type ? { type } : {}),
      });
    }
  }

  if (variables.length > 0) {
    initialRules.push(`:root { ${variables.join(" ")} }`);
  }
  return {
    initialCss: initialRules.join("\n"),
    lazyCss: lazyRules.join("\n"),
  };
}

function createLazyCustomFontLoader(css: string): string {
  const serializedCss = JSON.stringify(css);
  return `(function(){var css=${serializedCss};function load(){if(!css||document.querySelector('style[data-resux-font-lazy-runtime="true"]'))return;var style=document.createElement('style');style.setAttribute('data-resux-font-lazy-runtime','true');style.textContent=css;document.head.appendChild(style);}if(document.readyState==='complete'){load();}else{window.addEventListener('load',load,{once:true});}})();`;
}

export default defineResuxModule<ResuxFontsModuleOptions>({
  defaults: {
    google: [],
    families: [],
    preconnect: true,
    strategy: "preload",
    deferUntilPageLoad: false,
  },
  setup(options, resux) {
    const legacyGoogleFamilies = Array.isArray(options.google) ? options.google : [];
    const configuredFamilies = Array.isArray(options.families) ? options.families : [];
    const googleFamilies = [
      ...legacyGoogleFamilies,
      ...configuredFamilies.filter((family) => resolveProvider(family) === "google"),
    ];
    const customFamilies = configuredFamilies.filter((family) => resolveProvider(family) !== "google");

    if (!googleFamilies.length && !customFamilies.length) {
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

    if (googleFamilies.length > 0 && options.preconnect !== false) {
      headLinks.push(
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      );
    }

    addGoogleFontGroup(groups.eager, "eager", headLinks, headScripts, headNoscripts);
    addGoogleFontGroup(groups.preload, "preload", headLinks, headScripts, headNoscripts);
    addGoogleFontGroup(groups.lazy, "lazy", headLinks, headScripts, headNoscripts);

    const customStyles = buildCustomFontStyles(customFamilies, options, headLinks);
    if (customStyles.lazyCss) {
      headScripts.push({
        "data-resux-font-lazy-custom-loader": "true",
        innerHTML: createLazyCustomFontLoader(customStyles.lazyCss),
      });
    }

    if (
      headLinks.length > 0
      || headScripts.length > 0
      || headNoscripts.length > 0
      || customStyles.initialCss
    ) {
      resux.addHead({
        link: headLinks,
        ...(customStyles.initialCss ? {
          style: [{
            id: "resux-custom-font-faces",
            css: customStyles.initialCss,
            children: customStyles.initialCss,
            "data-resux-font-faces": "true",
          }],
        } : {}),
        ...(headScripts.length > 0 ? { script: headScripts } : {}),
        ...(headNoscripts.length > 0 ? { noscript: headNoscripts } : {}),
      });
    }

    const allFamilies = [...legacyGoogleFamilies, ...configuredFamilies];
    const providers = [...new Set(allFamilies.map((family) =>
      legacyGoogleFamilies.includes(family) ? "google" : resolveProvider(family)
    ))];

    resux.extendRuntimeConfig({
      public: {
        fonts: {
          provider: providers.length === 1 ? providers[0] : "mixed",
          providers,
          families: allFamilies.map((family) => family.name),
          familyConfigs: allFamilies.map((family) => ({
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
