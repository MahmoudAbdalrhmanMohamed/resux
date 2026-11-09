# Design Specification: Modernized Resux Font Engine (Nuxt Fonts v1 & Fontaine Integration)

**Date:** 2026-10-18  
**Branch:** `feat/fonts-v1`  
**Status:** Approved  

---

## 1. Overview & Goals

Resux is an HTML-first, resumability-first web framework ("Resumability + UX") designed for minimal client runtime overhead. Web fonts have historically required either manual configuration in Resux (`google: [...]` or manual `@font-face` definitions) or external stylesheet requests that introduce Cumulative Layout Shift (CLS) and extra network hops.

Inspired by **Nuxt Fonts v1** and powered by the Vite ecosystem libraries (`fontless`, `unifont`, and `fontaine`), this specification modernizes Resux fonts to provide:
1. **Zero-Config CSS Font Detection:** Simply using a `font-family` or Tailwind utility class in `.vue` templates or CSS stylesheets automatically resolves and self-hosts the font.
2. **Zero-CLS Font Metric Overrides:** Automatically generated fallback `@font-face` definitions containing `ascent-override`, `descent-override`, `size-adjust`, and `line-gap-override` prevent layout shifts during font loading.
3. **Semantic Named Weights:** Full support for `'thin'`, `'extralight'`, `'light'`, `'regular'`, `'medium'`, `'semibold'`, `'bold'`, `'extrabold'`, and `'black'`.
4. **Arbitrary Variable Font Axes:** Support for `opsz`, `wdth`, `slnt`, `ital`, and custom font variation axes.
5. **Self-Hosting & Preload Injection:** Automated local asset downloading into build assets with SSR `<link rel="preload">` inlining without incurring client runtime JavaScript overhead.
6. **100% Backward Compatibility:** Full support for legacy `google: [...]` and manual `families: [...]` arrays and strategies.

---

## 2. Architecture & Integration Points

### 2.1 Resux Kit & Vite Plugin Registration
The Resux fonts module (`src/fonts/index.ts`) connects to the framework build pipeline via Resux Kit:
* In `setup(options, resux)`:
  * When `autoScan !== false`, the `fontless` Vite plugin is instantiated with user-defined options and added to the Vite build via `resux.addVitePlugin(fontless(...))`.
  * The plugin intercepts `.vue` files, stylesheets (`.css`), and templates, detecting declared font families.
  * `unifont` resolves font family metadata, available weights, styles, and file URLs across providers (Google Fonts, Bunny, Fontshare, Local).
  * `fontaine` computes font metrics for fallback system fonts (`system-ui`, `Arial`, `sans-serif`) to match the primary font's bounding box.
  * Font binary files are downloaded and placed into the Vite asset build directory (`dist/`).

### 2.2 SSR Head Generation & Zero-Client Cost
* During SSR, font preload tags (`<link rel="preload" as="font" ...>`) and metric override fallback styles are gathered and injected via `resux.addHead()`.
* **Resume-First Principle:** Fonts do not add any client-side JavaScript. All font optimizations execute at build time and during SSR HTML generation, keeping the client bootstrap size strictly within the 14 KiB raw / 5 KiB gzip budget.

---

## 3. Configuration & Types

### 3.1 Named Weights Normalization
`normalizeWeight(value)` in `src/fonts/index.ts` is expanded to map semantic string names to numeric CSS font-weight values:
* `'thin'` / `'hairline'` $\to$ `100`
* `'extralight'` / `'extra-light'` / `'ultralight'` $\to$ `200`
* `'light'` $\to$ `300`
* `'normal'` / `'regular'` $\to$ `400`
* `'medium'` $\to$ `500`
* `'semibold'` / `'semi-bold'` / `'demibold'` $\to$ `600`
* `'bold'` $\to$ `700`
* `'extrabold'` / `'extra-bold'` / `'ultrabold'` $\to$ `800`
* `'black'` / `'heavy'` $\to$ `900`
* Numeric values ($1$ to $1000$) and range strings (e.g. `'400..700'`) remain supported.

### 3.2 Types Definition
```ts
export type ResuxFontWeightName =
  | "thin"
  | "hairline"
  | "extralight"
  | "extra-light"
  | "ultralight"
  | "light"
  | "normal"
  | "regular"
  | "medium"
  | "semibold"
  | "semi-bold"
  | "demibold"
  | "bold"
  | "extrabold"
  | "extra-bold"
  | "ultrabold"
  | "black"
  | "heavy";

export type ResuxFontWeight = number | string | ResuxFontWeightName;

export interface ResuxFontFamilyInput {
  name: string;
  provider?: ResuxFontProvider;
  weights?: ResuxFontWeight[];
  display?: ResuxFontDisplay;
  strategy?: ResuxFontStrategy;
  deferUntilPageLoad?: boolean;
  src?: string | ResuxFontSourceInput | Array<string | ResuxFontSourceInput>;
  faces?: ResuxFontFaceInput[];
  weight?: ResuxFontWeight;
  style?: "normal" | "italic" | "oblique";
  unicodeRange?: string;
  subsets?: string[];
  axes?: Record<string, number | [number, number]>;
  fallbacks?: string[];
  preload?: boolean;
  variable?: string;
  global?: boolean;
}

export interface ResuxFontsModuleOptions {
  /** Enable automatic CSS/template font scanning via fontless. Defaults to true. */
  autoScan?: boolean;

  /** Global font defaults across all resolved families */
  defaults?: {
    preload?: boolean;
    subsets?: string[];
    weights?: ResuxFontWeight[];
    styles?: Array<"normal" | "italic" | "oblique">;
    fallbacks?: string[];
  };

  /** Provider configurations (google, bunny, fontshare, fontsource, local) */
  providers?: {
    google?: boolean | Record<string, unknown>;
    bunny?: boolean | Record<string, unknown>;
    fontshare?: boolean | Record<string, unknown>;
    fontsource?: boolean | Record<string, unknown>;
    local?: boolean | Record<string, unknown>;
  };

  /** Devtools panel toggle during development (defaults to true) */
  devtools?: boolean;

  /** Backward-compatible manual declarations */
  google?: ResuxFontFamilyInput[];
  families?: ResuxFontFamilyInput[];
  preconnect?: boolean;
  strategy?: ResuxFontStrategy;
  deferUntilPageLoad?: boolean;
}
```

---

## 4. Error Handling & Security

1. **Sanitization:** All font family names and URLs continue to pass through `sanitizeFontFamilyName()` and `escapeCssString()` to prevent CSS injection.
2. **Provider Fallbacks:** If remote provider lookups fail (e.g. network disconnect or unregistered font), the build warns cleanly and preserves native fallback system fonts without failing the build or dropping page rendering.
3. **Valid Variable Axes & Ranges:** Axes values are validated against CSS specification limits before emission.

---

## 5. Testing & Validation

1. **Unit Testing (`tests/fonts.test.ts`):**
   * Verification of named weight normalization (`'thin'`, `'medium'`, `'semibold'`, etc.).
   * Verification of variable font axes declarations in generated styles.
   * Verification of fallback font metric override generation (`ascent-override`, `descent-override`, `size-adjust`).
   * Verification that all existing legacy test suites pass without modification.
2. **Framework Quality Gates:**
   * `npm run typecheck`
   * `npm test tests/fonts.test.ts`
   * `npm run verify:dependencies`
   * `npm run check:runtime-size`
