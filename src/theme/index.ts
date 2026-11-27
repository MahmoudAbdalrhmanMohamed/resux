import { defineResuxModule } from "../kit/index.js";

export type ResuxThemeName = "light" | "dark";
export type ResuxThemePreference = ResuxThemeName | "system";
export type ResuxThemeAttribute = "class" | "data-theme";

export interface ResuxThemeColors {
  /** CSS custom properties for light mode. Keys without a leading `--` get one. */
  light?: Record<string, string>;
  /** CSS custom properties for dark mode. Keys without a leading `--` get one. */
  dark?: Record<string, string>;
}

export interface ResuxThemeColor {
  light?: string;
  dark?: string;
}

export interface ResuxThemeModuleOptions {
  /** Preference used when the visitor has not chosen one. Defaults to "system". */
  defaultTheme?: ResuxThemePreference;
  /** Mode used when the preference is "system" and the browser reports none. Defaults to "light". */
  fallback?: ResuxThemeName;
  /** localStorage key holding the visitor's choice. Defaults to "resux-theme". */
  storageKey?: string;
  /**
   * How the active mode is exposed on <html>. "class" toggles the `dark` class
   * (Tailwind `darkMode: "selector"` and the v4 `.dark` custom variant). "data-theme"
   * sets `data-theme="light|dark"`. Defaults to "class".
   */
  attribute?: ResuxThemeAttribute;
  /** CSS variables per mode, emitted as one inline <style>. */
  colors?: ResuxThemeColors;
  /** Browser UI color per mode, emitted as <meta name="theme-color">. */
  themeColor?: ResuxThemeColor;
  /** Set the `color-scheme` CSS property on <html>. Defaults to true. */
  colorScheme?: boolean;
  /** Suppress CSS transitions for one frame while the mode switches. Defaults to false. */
  disableTransition?: boolean;
}

export interface ResuxThemeState {
  /** What the visitor chose: "light", "dark" or "system". */
  preference: ResuxThemePreference;
  /** The mode that is applied right now. */
  resolved: ResuxThemeName;
  /** The mode forced by the current page, or null. */
  forced: ResuxThemeName | null;
}

export interface ResuxThemeController extends ResuxThemeState {
  set(preference: ResuxThemePreference): void;
  toggle(): void;
  /** Calls `listener` after every change. Returns an unsubscribe function. */
  subscribe(listener: (state: ResuxThemeState) => void): () => void;
}

const DEFAULT_STORAGE_KEY = "resux-theme";
const FORCED_ATTRIBUTE = "data-theme-forced";
const THEME_EVENT = "resux:theme";

interface ResolvedThemeConfig {
  defaultTheme: ResuxThemePreference;
  fallback: ResuxThemeName;
  storageKey: string;
  attribute: ResuxThemeAttribute;
  colorScheme: boolean;
  disableTransition: boolean;
  themeColor: ResuxThemeColor;
  colors: ResuxThemeColors;
}

function isPreference(value: unknown): value is ResuxThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isMode(value: unknown): value is ResuxThemeName {
  return value === "light" || value === "dark";
}

export function resolveThemeConfig(options: ResuxThemeModuleOptions = {}): ResolvedThemeConfig {
  return {
    defaultTheme: isPreference(options.defaultTheme) ? options.defaultTheme : "system",
    fallback: isMode(options.fallback) ? options.fallback : "light",
    storageKey: typeof options.storageKey === "string" && options.storageKey.trim()
      ? options.storageKey.trim()
      : DEFAULT_STORAGE_KEY,
    attribute: options.attribute === "data-theme" ? "data-theme" : "class",
    colorScheme: options.colorScheme !== false,
    disableTransition: options.disableTransition === true,
    themeColor: options.themeColor && typeof options.themeColor === "object" ? options.themeColor : {},
    colors: options.colors && typeof options.colors === "object" ? options.colors : {},
  };
}

function sanitizeCssName(name: string): string | null {
  const trimmed = name.trim().replace(/^--/, "");
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(trimmed) ? `--${trimmed}` : null;
}

function sanitizeCssValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const text = String(value).trim();
  // Values land inside an inline <style>: refuse anything that could close it or the rule.
  if (!text || /[{}<>;]|\/\*|\*\//.test(text)) {
    return null;
  }
  return text;
}

function renderVariables(vars: Record<string, string> | undefined): string {
  if (!vars) {
    return "";
  }
  const declarations: string[] = [];
  for (const [name, value] of Object.entries(vars)) {
    const cssName = sanitizeCssName(name);
    const cssValue = sanitizeCssValue(value);
    if (cssName && cssValue) {
      declarations.push(`${cssName}:${cssValue}`);
    }
  }
  return declarations.join(";");
}

/** Builds the CSS-variable block. Light values live on :root, dark values on the dark selector. */
export function createThemeCss(config: ResolvedThemeConfig): string {
  const light = renderVariables(config.colors.light);
  const dark = renderVariables(config.colors.dark);
  const darkSelector = config.attribute === "class" ? ":root.dark" : ':root[data-theme="dark"]';
  const parts: string[] = [];
  if (light) {
    parts.push(`:root{${light}}`);
  }
  if (dark) {
    parts.push(`${darkSelector}{${dark}}`);
  }
  return parts.join("\n");
}

function sanitizeThemeColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  return text && /^[#A-Za-z0-9(),.%\s/-]+$/.test(text) ? text : null;
}

/** Builds the theme-color metas. Each carries its own media query so system mode works without JS. */
export function createThemeColorMetas(config: ResolvedThemeConfig): Array<Record<string, string>> {
  const metas: Array<Record<string, string>> = [];
  for (const mode of ["light", "dark"] as const) {
    const color = sanitizeThemeColor(config.themeColor[mode]);
    if (color) {
      metas.push({
        name: "theme-color",
        content: color,
        media: `(prefers-color-scheme: ${mode})`,
        "data-resux-theme-color": mode,
      });
    }
  }
  return metas;
}

/**
 * The pre-paint script. It runs synchronously in <head>, sets the mode before first paint,
 * keeps it in sync (system change, other tabs, forced pages after client navigation) and
 * exposes `window.__RESUX_THEME__` for useTheme(). It is a plain inline string, so the client
 * bootstrap is untouched.
 */
export function createThemeScript(config: ResolvedThemeConfig): string {
  const settings = JSON.stringify({
    k: config.storageKey,
    a: config.attribute,
    d: config.defaultTheme,
    f: config.fallback,
    c: config.colorScheme,
    t: config.disableTransition,
    e: THEME_EVENT,
    x: FORCED_ATTRIBUTE,
  });
  return `(function(){var S=${settings},d=document.documentElement,N=document.currentScript&&document.currentScript.nonce,mq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null,last=null,mem=null;`
    + `function ok(v){return v==="light"||v==="dark"||v==="system"}`
    + `function get(){try{var v=localStorage.getItem(S.k);return ok(v)?v:S.d}catch(e){return mem||S.d}}`
    + `function forced(){var f=d.getAttribute(S.x);return f==="light"||f==="dark"?f:null}`
    + `function sys(){return mq?(mq.matches?"dark":"light"):S.f}`
    + `function state(){var p=get(),f=forced();return{preference:p,resolved:f||(p==="system"?sys():p),forced:f}}`
    + `function metas(r,explicit){var m=document.querySelectorAll("meta[data-resux-theme-color]");for(var i=0;i<m.length;i++){var e=m[i];if(!e.hasAttribute("data-media"))e.setAttribute("data-media",e.getAttribute("media")||"");`
    + `e.setAttribute("media",explicit?(e.getAttribute("data-resux-theme-color")===r?"all":"not all"):e.getAttribute("data-media"))}}`
    + `function paint(s,quiet){var r=s.resolved,style;`
    + `if(S.t&&!quiet){style=document.createElement("style");if(N)style.setAttribute("nonce",N);style.textContent="*,*::before,*::after{transition:none!important}";document.head.appendChild(style)}`
    + `if(S.a==="class"){d.classList.toggle("dark",r==="dark");d.classList.toggle("light",r==="light")}else d.setAttribute("data-theme",r);`
    + `if(S.c)d.style.colorScheme=r;metas(r,s.preference!=="system"||!!s.forced);`
    + `if(style){void d.offsetHeight;setTimeout(function(){style.remove()},0)}}`
    + `function apply(quiet){var s=state();paint(s,quiet);var key=s.preference+"|"+s.resolved+"|"+s.forced;if(last!==null&&key!==last)d.dispatchEvent(new CustomEvent(S.e,{detail:s}));last=key;return s}`
    + `window.__RESUX_THEME__={state:state,apply:apply,set:function(p){if(!ok(p))return;mem=p;try{localStorage.setItem(S.k,p)}catch(e){}apply(false)},key:S.k,event:S.e,forcedAttribute:S.x};`
    + `apply(true);`
    + `if(mq){var h=function(){if(get()==="system"&&!forced())apply(false)};if(mq.addEventListener)mq.addEventListener("change",h);else if(mq.addListener)mq.addListener(h)}`
    + `window.addEventListener("storage",function(e){if(e.key===S.k||e.key===null)apply(false)});`
    + `if(window.MutationObserver)new MutationObserver(function(){apply(false)}).observe(d,{attributes:true,attributeFilter:[S.x]});`
    + `})();`;
}

/** A bootstrap-free view over the pre-paint script. On the server it returns fixed values (system, light, not forced), so do not render its state into SSR output. */
export function useTheme(): ResuxThemeController {
  const bridge = typeof window !== "undefined" ? (window as any).__RESUX_THEME__ : undefined;
  const read = (): ResuxThemeState => bridge
    ? bridge.state()
    : { preference: "system", resolved: "light", forced: null };
  const controller: ResuxThemeController = {
    get preference() { return read().preference; },
    get resolved() { return read().resolved; },
    get forced() { return read().forced; },
    set(preference) { bridge?.set(preference); },
    toggle() {
      const state = read();
      if (state.forced) {
        return;
      }
      bridge?.set(state.resolved === "dark" ? "light" : "dark");
    },
    subscribe(listener) {
      if (typeof document === "undefined") {
        return () => {};
      }
      const handler = (event: Event) => listener((event as CustomEvent<ResuxThemeState>).detail);
      document.documentElement.addEventListener(bridge?.event ?? THEME_EVENT, handler);
      return () => document.documentElement.removeEventListener(bridge?.event ?? THEME_EVENT, handler);
    },
  };
  return controller;
}

/**
 * Head entry for a page that forces one mode. Pass it to `useHead(...)`:
 * `useHead(forceTheme("light"))`. The visitor's saved choice is not changed.
 */
export function forceTheme(mode: ResuxThemeName): { htmlAttrs: Record<string, string> } {
  return { htmlAttrs: { [FORCED_ATTRIBUTE]: isMode(mode) ? mode : "light" } };
}

export default /* @__PURE__ */ defineResuxModule<ResuxThemeModuleOptions>({
  defaults: {
    defaultTheme: "system",
    fallback: "light",
    storageKey: DEFAULT_STORAGE_KEY,
    attribute: "class",
    colorScheme: true,
    disableTransition: false,
  },
  setup(options, resux) {
    const config = resolveThemeConfig(options);
    const css = createThemeCss(config);
    const metas = createThemeColorMetas(config);

    resux.addHead({
      ...(metas.length > 0 ? { meta: metas } : {}),
      ...(css ? {
        style: [{
          id: "resux-theme-vars",
          css,
          children: css,
          "data-resux-theme-vars": "true",
        }],
      } : {}),
      script: [{
        "data-resux-theme": "true",
        innerHTML: createThemeScript(config),
      }],
    });

    resux.extendRuntimeConfig({
      public: {
        theme: {
          defaultTheme: config.defaultTheme,
          fallback: config.fallback,
          storage: config.storageKey,
          attribute: config.attribute,
        },
      },
    });
  },
});
