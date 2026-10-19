# Design Specification: Resumable Native View Transitions API for Resux

**Date:** 2026-10-19  
**Branch:** `feat/view-transitions`  
**Status:** Approved  

---

## 1. Overview & Goals

Resux is an HTML-first, resumability-first web framework designed for minimal runtime footprint. Modern web applications often require smooth, cinematic page transitions and shared element morphing without incurring large JavaScript animation library costs.

This specification introduces the **Native View Transitions API** to Resux's client router:
1. **Zero Runtime Overhead:** Leverages browser-native `document.startViewTransition()` directly during route DOM swaps (`replaceRouteHtml`), adding fewer than ~40 lines of code to the runtime bundle with zero external dependencies.
2. **Hybrid Activation Hierarchy:**
   - **Global:** `router: { viewTransition: true }` in `resux.config.ts`.
   - **Per-Page:** `definePageMeta({ viewTransition: true | false })`.
   - **Per-Navigation:** `navigateTo(url, { viewTransition: true | false })`.
   - **Per-Link:** `<ResuxLink to="..." view-transition>` or `<ResuxLink to="..." :view-transition="false">`.
3. **Accessibility by Default:** Automatically respects `prefers-reduced-motion` media queries, executing an instant DOM swap without animation when motion reduction is requested.
4. **Resumable Composable:** Exposes `useViewTransition()` returning `{ isSupported, start }` for arbitrary component-level transitions.
5. **Shared Element Transitions:** Native support for CSS `view-transition-name` across route changes.

---

## 2. Architecture & Lifecycle Integration

### 2.1 Router Navigation Lifecycle (`navigateTo`)
In `src/runtime/index.ts`, when client navigation proceeds to the DOM swap stage:
1. **Transition Determination:**
   ```typescript
   const shouldTransition =
     options.viewTransition ??
     nextPayload?.meta?.viewTransition ??
     previousPayload?.meta?.viewTransition ??
     globalThis.__RESUX__?.config?.router?.viewTransition ??
     false;
   ```
2. **Capability & Accessibility Check:**
   ```typescript
   const supportsTransition =
     typeof document !== "undefined" &&
     typeof document.startViewTransition === "function" &&
     !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
   ```
3. **DOM Swap Execution:**
   - If `shouldTransition && supportsTransition`:
     ```typescript
     setRouteTransition("swapping", { path: routePath });
     const transition = document.startViewTransition(async () => {
       const preserved = replaceRouteHtml(root, result.html, preserveLayout);
       updateGlobalPayload(previousPayload, nextPayload, preserved.scopeIds);
     });
     try {
       await transition.finished;
     } catch {
       // Transition error or cancellation handled gracefully
     }
     ```
   - If disabled or unsupported:
     ```typescript
     setRouteTransition("swapping", { path: routePath });
     const preserved = replaceRouteHtml(root, result.html, preserveLayout);
     updateGlobalPayload(previousPayload, nextPayload, preserved.scopeIds);
     ```
4. **Completion:** State transition finishes with `setRouteTransition("complete")`.

### 2.2 `<ResuxLink>` Click Interception
In `handleNavigationClick(event)` in `src/runtime/index.ts`:
- Check for `data-view-transition` or `view-transition` attribute on the clicked `<a>` anchor:
  ```typescript
  const vtAttr = anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition");
  const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;
  void navigateTo(nextPath + target.hash, { viewTransition });
  ```

---

## 3. Public API & Types

### 3.1 Type Definitions
```typescript
// in src/runtime/router.ts
export interface ResuxClientNavigationOptions {
  replace?: boolean;
  state?: unknown;
  /** Explicitly opt in or out of browser native View Transitions for this navigation */
  viewTransition?: boolean;
}

// in src/runtime/index.ts
export interface PageMeta {
  title?: string;
  layout?: string | false;
  middleware?: string | string[];
  /** Enable or disable View Transitions for this route */
  viewTransition?: boolean;
  [key: string]: unknown;
}

export interface ResuxViewTransition {
  /** True if document.startViewTransition is supported by the current browser */
  readonly isSupported: boolean;
  /** Execute an arbitrary DOM update within a view transition */
  start: (callback: () => Promise<void> | void) => Promise<void>;
}

export function useViewTransition(): ResuxViewTransition;
```

---

## 4. Error Handling & Security

1. **Rejection Safety:** If `document.startViewTransition` rejects or is aborted (e.g. by another rapid navigation or browser tab switch), Resux catches the error and ensures the DOM is left in the target route state without throwing unhandled promise rejections.
2. **Reduced Motion Safety:** Users who require reduced motion have their preference honored by default.
3. **No External Dependencies:** Employs strictly web-standard browser APIs.

---

## 5. Testing & Validation

1. **Unit & Integration Tests (`tests/router-view-transitions.test.ts`):**
   * Verification of `useViewTransition().isSupported` in supported vs unsupported environments.
   * Verification of `useViewTransition().start(callback)` awaiting callback and transition finish.
   * Verification of `navigateTo` wrapping DOM swap in `startViewTransition` when enabled.
   * Verification that `options.viewTransition: false` skips transition even when global config is true.
   * Verification that `<ResuxLink view-transition="false">` passes `viewTransition: false` to `navigateTo`.
   * Verification of `prefers-reduced-motion` bypass.
2. **Full Framework Quality Gates:**
   * `npm run typecheck`
   * `npm test`
   * `npm run check:runtime-size`
   * `node scripts/verify-package-contract.mjs`
