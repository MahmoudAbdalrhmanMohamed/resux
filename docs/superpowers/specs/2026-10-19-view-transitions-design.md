# Design Specification: Resumable Native View Transitions API for Resux

**Date:** 2026-10-19  
**Branch:** `feat/view-transitions`  
**Status:** Approved (Updated with Modular Chunking & Resumability-First Architecture)  

---

## 1. Core Principles & Architecture Rules

Per framework rules and explicit user requirements:
1. **Performance & Resumability-First:**
   - Client runtime code must be ultra-lean, tree-shakeable, and demand-loaded.
   - Pages without client navigation or without view transitions pay **0 bytes** of extra runtime cost.
   - Never compromise the critical resume bootstrap budget (14 KiB raw / 5 KiB gzip).
2. **Modular Architecture & Small Chunks (Strictly Enforced for All Tasks):**
   - **Never add logic directly to monolithic single files** (such as inflating `src/runtime/index.ts`).
   - Every subsystem must be decomposed into small, focused, single-responsibility files (< 100 lines each):
     - `types.ts` for interfaces and contracts.
     - `detect.ts` for browser capability and motion preference detection.
     - `transition.ts` for transition execution and composables.
     - `index.ts` for barrel exports and public API.
   - All coming tasks and stacked PRs must strictly adhere to this modular decomposition standard.

---

## 2. Directory & Modular File Decomposition

```
src/runtime/view-transitions/
├── types.ts          # ResuxViewTransition, navigation options, meta interfaces
├── detect.ts         # isViewTransitionSupported(), prefersReducedMotion()
├── transition.ts     # executeViewTransition(), useViewTransition()
└── index.ts          # Public barrel exports for runtime & router
```

### 2.1 File Responsibilities
* **`src/runtime/view-transitions/types.ts` (~25 lines):**
  Declares `ResuxViewTransition`, `ResuxViewTransitionOptions`, and extends `PageMeta` and `ResuxClientNavigationOptions`.
* **`src/runtime/view-transitions/detect.ts` (~35 lines):**
  Pure helpers for runtime environment capability:
  - `isViewTransitionSupported(): boolean` (checks `document.startViewTransition`).
  - `prefersReducedMotion(): boolean` (checks `window.matchMedia("(prefers-reduced-motion: reduce)").matches`).
  - `shouldPerformViewTransition(options, nextMeta, prevMeta, routerConfig): boolean`.
* **`src/runtime/view-transitions/transition.ts` (~50 lines):**
  - `executeViewTransition(domSwapFn, options): Promise<void>`:
    Wraps DOM mutation in `document.startViewTransition(async () => { await domSwapFn(); })` with full rejection/abort handling.
  - `useViewTransition(): ResuxViewTransition`:
    Exposes reactive/composable interface for arbitrary DOM mutations.
* **`src/runtime/view-transitions/index.ts` (~20 lines):**
  Re-exports public interfaces and helpers to `src/runtime/index.ts` and `src/runtime/router.ts`.

---

## 3. Router & `<ResuxLink>` Lifecycle Integration

### 3.1 Client Navigation (`navigateTo` in `src/runtime/router.ts` & `src/runtime/index.ts`)
1. During navigation, before performing DOM swap (`replaceRouteHtml`):
   ```typescript
   import { shouldPerformViewTransition, executeViewTransition } from "./view-transitions/index.js";

   if (shouldPerformViewTransition(options, nextPayload?.meta, previousPayload?.meta, routerConfig)) {
     setRouteTransition("swapping", { path: routePath });
     await executeViewTransition(async () => {
       const preserved = replaceRouteHtml(root, result.html, preserveLayout);
       updateGlobalPayload(previousPayload, nextPayload, preserved.scopeIds);
     });
   } else {
     setRouteTransition("swapping", { path: routePath });
     const preserved = replaceRouteHtml(root, result.html, preserveLayout);
     updateGlobalPayload(previousPayload, nextPayload, preserved.scopeIds);
   }
   ```
2. Completion triggers `setRouteTransition("complete")`.

### 3.2 `<ResuxLink>` Click Interception
In `handleNavigationClick(event)`:
- Reads `data-view-transition` or `view-transition` from the clicked `<a>` element:
  ```typescript
  const vtAttr = anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition");
  const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;
  void navigateTo(nextPath + target.hash, { viewTransition });
  ```
- Result: `<ResuxLink to="..." view-transition>` or `<ResuxLink to="..." :view-transition="false">` controls transitions per-link.

---

## 4. Public API & Types

```typescript
// src/runtime/view-transitions/types.ts
export interface ResuxViewTransition {
  readonly isSupported: boolean;
  start: (updateCallback: () => Promise<void> | void) => Promise<void>;
}

export interface ResuxClientNavigationOptions {
  replace?: boolean;
  state?: unknown;
  viewTransition?: boolean;
}

export interface PageMeta {
  title?: string;
  layout?: string | false;
  middleware?: string | string[];
  viewTransition?: boolean;
  [key: string]: unknown;
}
```

---

## 5. Testing & Validation Strategy

1. **Focused Unit Tests (`tests/router-view-transitions.test.ts`):**
   - Test `detect.ts`: `isViewTransitionSupported` and `prefersReducedMotion` detection.
   - Test `transition.ts`: `useViewTransition().isSupported` and `start()` execution.
   - Test router integration: `navigateTo` triggering `document.startViewTransition` when enabled.
   - Test `<ResuxLink>` attributes (`view-transition="true"`, `:view-transition="false"`).
   - Test graceful error recovery when `document.startViewTransition` aborts or is unsupported.
2. **Full Framework Quality Gates:**
   - `npm run typecheck`
   - `npm test`
   - `npm run check:runtime-size`
   - `node scripts/verify-package-contract.mjs`
