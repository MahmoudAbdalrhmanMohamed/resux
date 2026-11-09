# Resux Icons v1: Modular Architecture & Nuxt Icon Parity Design

- **Date**: 2026-10-19
- **Author**: Antigravity & User
- **Status**: Approved (Brainstorming Complete)
- **Target Branch**: `feat/icons-v1`

---

## 1. Executive Summary & Goals

This document specifies the complete ground-up rebuild of the Resux Icons package (`resuxjs/icons`), bringing full parity with `@nuxt/icon` while prioritizing **resumability**, **compile-time optimization**, and **extreme runtime performance**.

### Key Objectives
1. **Full `@nuxt/icon` Parity**:
   - Universal naming formats: `collection:icon`, `i-collection-icon`, and custom aliases.
   - Offline icon sets via `@iconify-json/*` packages for instant, zero-network SSR.
   - Local custom SVGs from `assets/icons/` (e.g. `<Icon name="custom:logo" />`).
   - Two distinct rendering modes: `mode="svg"` (inline vector paths) and `mode="css"` (CSS `mask-image` / `background-image`).
   - Global config in `resux.config.ts` (`icons: { ... }`) and auto-registered `<Icon>` / `<ResuxIcon>` components.
2. **Resumability & Performance First**:
   - **Build-Time Inlining**: Static `<Icon name="...">` calls compile directly to pure HTML/CSS markup at build time. For static icons, **0 bytes of client JavaScript** are shipped!
   - **Granular SSR Control**: Controllable globally via `resux.config.ts` (`icons: { ssr: boolean }`) and on a per-component level (`<Icon name="..." :ssr="false" />`).
   - **Resumable Client Fetching**: For dynamic names or `:ssr="false"` icons, lazy loading via `IntersectionObserver` defers fetching until the icon enters the viewport.
3. **Clean Code & Modular Architecture**:
   - In accordance with the new project rule in `.agents/AGENTS.md`, avoid large monolithic files.
   - Every file has a single responsibility, strict TypeScript types, concise implementation (<100 lines per module where possible), and independent testability.

---

## 2. Modular Architecture & Directory Structure

`src/icons/` is completely reorganized into focused, single-responsibility files:

```text
src/icons/
├── types.ts           # Type definitions (IconData, IconPathData, IconProps, ResuxIconsConfig, RenderMode)
├── constants.ts       # Constants (default sizes, timeouts, byte limits, regexes, API endpoints)
├── normalize.ts       # Name parser (parses "i-lucide-home", "mdi:account", alias mapping)
├── cache.ts           # Bounded LRU cache and in-flight fetch deduplication queue
├── registry.ts        # Built-in essential fallback icons and core aliases
├── local-svg.ts       # File-system loader for local SVGs in `assets/icons/*.svg`
├── offline-loader.ts  # Synchronous resolver for `@iconify-json/*` packages during build/SSR
├── api-fetcher.ts     # Client-side Iconify API fetcher with stream/size limits and SVG parser
├── resolver.ts        # Unified resolution pipeline: Local -> Offline -> Registry -> API
├── css-mode.ts        # CSS mask & background data URI generator for CSS mode
├── svg-mode.ts        # SVG element and path VNode builder with presentation attribute inheritance
├── component.ts       # Vue component (<Icon> / <ResuxIcon>) with :ssr prop & IntersectionObserver
├── transform.ts       # Vite/compiler transform plugin for static build-time icon inlining
└── index.ts           # Public API entry point and Resux module definition
```

---

## 3. Detailed Component & Pipeline Design

### 3.1 Normalization & Aliases (`normalize.ts`)
- Parses icon names into `{ prefix, name }`:
  - Standard format: `lucide:home` -> `{ prefix: "lucide", name: "home" }`
  - UnoCSS/Nuxt Icon format: `i-lucide-home` -> `{ prefix: "lucide", name: "home" }`
  - Slashed format: `lucide/home` -> `{ prefix: "lucide", name: "home" }`
- Resolves aliases: If `aliases[rawName]` exists in config or built-in aliases, map to the target name before resolution.

### 3.2 Resolution Pipeline (`resolver.ts`)
When resolving an icon by `(prefix, name)`:
1. **Local SVGs (`local-svg.ts`)**: If prefix is `custom` or matches a local collection, read SVG from `assets/icons/{name}.svg`.
2. **Offline Iconify Packages (`offline-loader.ts`)**: Check if `@iconify-json/{prefix}` is installed in the project. If present, synchronously load the icon definition from the package JSON without network calls.
3. **Static Fallback Registry (`registry.ts`)**: Check built-in fallback definitions.
4. **API Fetcher (`api-fetcher.ts`)**: On client runtime (or server if configured), fetch SVG from Iconify API (`https://api.iconify.design` or custom `apiProvider`).

### 3.3 SSR & Build-Time Optimization (`transform.ts` & `component.ts`)
- **Global Config (`resux.config.ts`)**:
  ```ts
  export default defineResuxConfig({
    icons: {
      ssr: true,            // Enable/disable SSR icon rendering globally
      mode: 'svg',          // 'svg' | 'css'
      defaultSize: '1.25rem',
      aliases: { 'my-icon': 'lucide:sparkles' },
      collections: ['lucide', 'material-symbols'],
      apiProvider: 'https://api.iconify.design',
      customCollectionsDir: 'assets/icons'
    }
  })
  ```
- **Component Prop `:ssr`**:
  - `<Icon name="lucide:user" />` inherits global `icons.ssr` (default `true`).
  - `<Icon name="lucide:user" :ssr="false" />` forces client-only rendering:
    - Server emits: `<span class="resux-icon-placeholder" style="width: 1.25rem; height: 1.25rem; display: inline-block;" data-icon-name="lucide:user" data-icon-ssr="false"></span>`
    - Client resumes on mount or when visible, fetching and replacing the placeholder.
  - `<Icon name="lucide:user" :ssr="true" />` forces SSR even if global `icons.ssr` is `false`.

### 3.4 CSS Mode (`css-mode.ts`)
- Nuxt Icon's CSS mode renders a `<span>` with CSS `mask`:
  ```html
  <span
    class="resux-icon resux-icon--css inline-block shrink-0 align-middle"
    style="
      width: 1.25rem;
      height: 1.25rem;
      mask: url(&quot;data:image/svg+xml;utf8,...&quot;) no-repeat 50% 50%;
      -webkit-mask: url(&quot;data:image/svg+xml;utf8,...&quot;) no-repeat 50% 50%;
      mask-size: 100% 100%;
      -webkit-mask-size: 100% 100%;
      background-color: currentColor;
    "
    aria-hidden="true"
  ></span>
  ```
- Benefits:
  - Minimal DOM weight (single element, no nested `<path>` tags).
  - Perfect color inheritance with `background-color: currentColor`.
  - Zero hydration overhead.

### 3.5 SVG Mode (`svg-mode.ts`)
- Renders `<svg>` tag with all presentation attributes (`stroke`, `fill`, `viewBox`, `stroke-width`, `stroke-linecap`, etc.) and child `<path>` elements.
- Supports multi-path icons, groups, opacity, and filled vs outline styles.

---

## 4. Error Handling & Guardrails

- **Bounded Network Requests**: Max 256 KB per SVG payload, 10-second timeout, max 32 concurrent fetches, max 512 queued requests.
- **LRU Cache**: Max 256 cached icon definitions with LRU eviction to prevent memory leaks.
- **Sanitization**: Safe parsing of SVG markup, preventing script execution or malicious SVG attributes.
- **Fallback Display**: If an icon fails to load, render an unobtrusive fallback indicator (or configured fallback icon) without breaking layout or throwing fatal errors.

---

## 5. Verification Plan

1. **Unit Tests**:
   - `normalize.test.ts`: test `i-`, `:` syntax, and aliases.
   - `offline-loader.test.ts`: test resolution of `@iconify-json/*` packages.
   - `css-mode.test.ts`: test CSS mask styling and SVG data URI escaping.
   - `local-svg.test.ts`: test custom SVG loading.
   - `component.test.ts`: test `<Icon :ssr="false">`, `:ssr="true"`, modes, and lazy loading.
   - `transform.test.ts`: test compile-time static inlining.
2. **Regression Tests**:
   - Verify `tests/icons-regressions.test.ts` passes completely.
3. **Full Framework Quality Suite**:
   - `npm run quality`: typechecking, bundle metrics, vitest, fixtures, and templates.
