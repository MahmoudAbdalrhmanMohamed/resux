# Resux Icons v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `resuxjs/icons` from the ground up as a modular, high-performance icon system with full `@nuxt/icon` parity (CSS mask mode, `@iconify-json` offline bundling, `i-` prefix syntax, local SVGs) and Resux-first performance (build-time inlining for 0kB client JS, granular `:ssr` control).

**Architecture:** Decompose the icon system into focused, single-responsibility modules adhering to SOLID principles: separate types, constants, normalization, caching, offline loading, API fetching, resolution pipeline, CSS/SVG rendering, Vue component with `:ssr` controls, and build-time static AST inlining.

**Tech Stack:** TypeScript, Vue 3, Vite, Nitropack, Vitest.

## Global Constraints

- Never write monolithic or large single-file implementations; keep each module concise (<100 lines where practical), strictly typed, and independently tested.
- Adhere to the new project rule in `.agents/AGENTS.md`.
- Static icons compile to pure HTML/CSS without client JavaScript overhead when `ssr !== false`.
- Dynamic or deferred icons (`:ssr="false"`) render a lightweight placeholder during SSR and resume on client via IntersectionObserver.
- Maintain backwards compatibility with existing `resuxjs/icons` consumers and pass all existing regressions in `tests/icons-regressions.test.ts`.

---

### Task 1: Core Types & Constants

**Files:**
- Create: `src/icons/types.ts`
- Create: `src/icons/constants.ts`
- Test: `tests/icons/types.test.ts`

**Interfaces:**
- Produces: `IconData`, `IconPathData`, `IconProps`, `ResuxIconsConfig`, `IconMode`, `ResolvedIcon`, default constants.

- [ ] **Step 1: Write type verification test**
- [ ] **Step 2: Implement `src/icons/types.ts`**
- [ ] **Step 3: Implement `src/icons/constants.ts`**
- [ ] **Step 4: Verify typecheck passes with `npm run typecheck`**
- [ ] **Step 5: Commit changes**

---

### Task 2: Normalization & Aliases Module

**Files:**
- Create: `src/icons/normalize.ts`
- Test: `tests/icons/normalize.test.ts`

**Interfaces:**
- Consumes: `ResuxIconsConfig` from `types.ts`
- Produces: `parseIconName(raw: string, aliases?: Record<string, string>): { prefix: string; name: string } | null`
- Produces: `normalizeApiProvider(provider: unknown): string`

- [ ] **Step 1: Write test covering `i-collection-name`, `collection:name`, slash formats, and alias mappings**
- [ ] **Step 2: Run test to confirm it fails**
- [ ] **Step 3: Implement `src/icons/normalize.ts`**
- [ ] **Step 4: Run test to verify all cases pass**
- [ ] **Step 5: Commit changes**

---

### Task 3: Bounded Cache & In-Flight Queue Module

**Files:**
- Create: `src/icons/cache.ts`
- Test: `tests/icons/cache.test.ts`

**Interfaces:**
- Consumes: `IconData` from `types.ts`, cache limits from `constants.ts`
- Produces: `IconMemoryCache` class with bounded LRU eviction and in-flight fetch deduplication

- [ ] **Step 1: Write test for LRU eviction and concurrency throttling**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement `src/icons/cache.ts`**
- [ ] **Step 4: Run test and verify pass**
- [ ] **Step 5: Commit changes**

---

### Task 4: Static Fallback Registry Module

**Files:**
- Create: `src/icons/registry.ts`
- Test: `tests/icons/registry.test.ts`

**Interfaces:**
- Consumes: `IconData` from `types.ts`
- Produces: `iconRegistry: Record<string, IconData>`, `iconAliases: Record<string, string>`

- [ ] **Step 1: Write test ensuring built-in core icons and aliases resolve**
- [ ] **Step 2: Implement `src/icons/registry.ts` with clean, tree-shakeable icons**
- [ ] **Step 3: Run test and verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 5: Local Custom SVG Loader Module

**Files:**
- Create: `src/icons/local-svg.ts`
- Test: `tests/icons/local-svg.test.ts`

**Interfaces:**
- Consumes: `IconData` from `types.ts`
- Produces: `loadLocalSvgIcon(name: string, dir?: string): Promise<IconData | null>` and synchronous variant `loadLocalSvgIconSync`

- [ ] **Step 1: Write test loading a sample `.svg` file from test fixtures**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement `src/icons/local-svg.ts`**
- [ ] **Step 4: Run test and verify pass**
- [ ] **Step 5: Commit changes**

---

### Task 6: Offline `@iconify-json` Package Resolver Module

**Files:**
- Create: `src/icons/offline-loader.ts`
- Test: `tests/icons/offline-loader.test.ts`

**Interfaces:**
- Consumes: `IconData` from `types.ts`
- Produces: `loadOfflineIcon(prefix: string, name: string): IconData | null`

- [ ] **Step 1: Write test mocking installed collection JSON and resolving icon data**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement `src/icons/offline-loader.ts`**
- [ ] **Step 4: Run test and verify pass**
- [ ] **Step 5: Commit changes**

---

### Task 7: Client-Side Bounded API Fetcher Module

**Files:**
- Create: `src/icons/api-fetcher.ts`
- Test: `tests/icons/api-fetcher.test.ts`

**Interfaces:**
- Consumes: `IconData`, `normalizeApiProvider`, `IconMemoryCache`
- Produces: `fetchIconifyIcon(name: string, apiProvider?: string): Promise<IconData | null>`, `parseFetchedIconSvg(svgText: string): IconData | null`

- [ ] **Step 1: Write test verifying streaming limits, timeouts, attribute inheritance, and error handling**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement `src/icons/api-fetcher.ts`**
- [ ] **Step 4: Run test and verify pass**
- [ ] **Step 5: Commit changes**

---

### Task 8: Unified Icon Resolver Pipeline

**Files:**
- Create: `src/icons/resolver.ts`
- Test: `tests/icons/resolver.test.ts`

**Interfaces:**
- Consumes: `local-svg.ts`, `offline-loader.ts`, `registry.ts`, `api-fetcher.ts`
- Produces: `resolveIconSync(name: string, config?: ResuxIconsConfig): IconData | null`, `resolveIconAsync(name: string, config?: ResuxIconsConfig): Promise<IconData | null>`

- [ ] **Step 1: Write test asserting resolution precedence (Local -> Offline -> Registry -> API)**
- [ ] **Step 2: Implement `src/icons/resolver.ts`**
- [ ] **Step 3: Run test and verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 9: CSS Mask Mode Renderer Module

**Files:**
- Create: `src/icons/css-mode.ts`
- Test: `tests/icons/css-mode.test.ts`

**Interfaces:**
- Consumes: `IconData`, size and class props
- Produces: `renderCssMaskIcon(data: IconData, props: IconProps): VNode`

- [ ] **Step 1: Write test verifying generated mask CSS style, data URI escaping, and single span element**
- [ ] **Step 2: Implement `src/icons/css-mode.ts`**
- [ ] **Step 3: Run test and verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 10: SVG Mode Renderer Module

**Files:**
- Create: `src/icons/svg-mode.ts`
- Test: `tests/icons/svg-mode.test.ts`

**Interfaces:**
- Consumes: `IconData`, size, presentation attributes, class props
- Produces: `renderSvgIcon(data: IconData, props: IconProps, ref?: Ref): VNode`

- [ ] **Step 1: Write test verifying SVG VNode, multiple paths, stroke/fill presentation inheritance**
- [ ] **Step 2: Implement `src/icons/svg-mode.ts`**
- [ ] **Step 3: Run test and verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 11: Vue Icon Component (`component.ts`)

**Files:**
- Create: `src/icons/component.ts`
- Test: `tests/icons/component.test.ts`

**Interfaces:**
- Consumes: `resolver.ts`, `css-mode.ts`, `svg-mode.ts`
- Produces: `Icon` and `ResuxIcon` Vue components with `:ssr`, `mode`, `lazy`, `loading`, and IntersectionObserver support

- [ ] **Step 1: Write test for `:ssr="false"`, `:ssr="true"`, mode switching, and lazy loading**
- [ ] **Step 2: Implement `src/icons/component.ts`**
- [ ] **Step 3: Run test and verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 12: Build-Time Static Inlining Transform (`transform.ts`)

**Files:**
- Create: `src/icons/transform.ts`
- Test: `tests/icons/transform.test.ts`

**Interfaces:**
- Consumes: `resolver.ts`, `css-mode.ts`, `svg-mode.ts`
- Produces: Vite/Resux compiler transform function for static `<Icon name="...">` inlining

- [ ] **Step 1: Write test verifying static icon inlining into pure HTML/CSS**
- [ ] **Step 2: Implement `src/icons/transform.ts`**
- [ ] **Step 3: Run test and verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 13: Public Module Entry Point & Registration (`index.ts`)

**Files:**
- Modify: `src/icons/index.ts`
- Test: `tests/icons-regressions.test.ts`

**Interfaces:**
- Exposes: all public types, `defineResuxModule`, `Icon`, `ResuxIcon`, `iconRegistry`, `fetchIconifyIcon`, `resolveIconSync`, `resolveIconAsync`

- [ ] **Step 1: Re-export public API cleanly from modular sub-files**
- [ ] **Step 2: Define Resux module setup extending runtimeConfig & auto-registering components & transform**
- [ ] **Step 3: Run existing `tests/icons-regressions.test.ts` and verify 100% pass**
- [ ] **Step 4: Commit changes**

---

### Task 14: Quality Suite, Mandatory Reviews & Pull Request

**Files:**
- All touched files

- [ ] **Step 1: Run full quality suite (`npm run quality`)**
- [ ] **Step 2: Run mandatory code reviews (`frontend-code-review`, `code-review`, `open-code-review`)**
- [ ] **Step 3: Address any findings across all touched files**
- [ ] **Step 4: Push `feat/icons-v1` to `origin`**
- [ ] **Step 5: Create Pull Request targeting `main`**
