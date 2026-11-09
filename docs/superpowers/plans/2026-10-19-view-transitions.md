# Resux Native View Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the browser-native View Transitions API in Resux with a modular, performance-first, and resumability-first architecture, decomposed into small, focused single-responsibility files.

**Architecture:** Decompose view transitions into dedicated small modules under `src/runtime/view-transitions/`: `types.ts` (< 30 lines), `detect.ts` (< 40 lines), `transition.ts` (< 60 lines), and `index.ts` (< 20 lines). Connect to `navigateTo()` in `src/runtime/index.ts` and `src/runtime/router.ts` to seamlessly wrap DOM swaps in `document.startViewTransition()` while honoring `prefers-reduced-motion` and per-link `<ResuxLink view-transition>` attributes.

**Tech Stack:** TypeScript, Vite, Vitest, Modern Browser View Transitions API.

## Global Constraints

- **Strict Modular Chunking:** Do not add monolithic logic into `src/runtime/index.ts`. All new logic must live in focused single-responsibility files under `src/runtime/view-transitions/`.
- **Zero Performance & Resume Penalty:** Native browser API must add less than 40 lines of code across all modules, protecting the 14 KiB raw / 5 KiB gzip resume bootstrap budget.
- **Graceful Degradation:** When `document.startViewTransition` is unsupported or rejected, DOM swaps must complete immediately without errors.
- **Accessibility:** Motion reduction preference (`prefers-reduced-motion: reduce`) must bypass transition animations by default.
- Work on branch `feat/view-transitions` created from `main`.

---

### Task 1: View Transitions Types & Capability Detection Sub-Module

**Files:**
- Create: `src/runtime/view-transitions/types.ts`
- Create: `src/runtime/view-transitions/detect.ts`
- Test: `tests/router-view-transitions.test.ts`

**Interfaces:**
- Consumes: Browser globals `document`, `window.matchMedia`.
- Produces: `ResuxViewTransition`, `isViewTransitionSupported()`, `prefersReducedMotion()`, `shouldPerformViewTransition()`.

- [ ] **Step 1: Write failing tests for detection helpers**

Create `tests/router-view-transitions.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { isViewTransitionSupported, prefersReducedMotion, shouldPerformViewTransition } from "../src/runtime/view-transitions/detect.js";

describe("view transitions detection", () => {
  it("detects when document.startViewTransition is supported", () => {
    expect(isViewTransitionSupported()).toBe(false);
  });

  it("evaluates shouldPerformViewTransition hierarchy", () => {
    expect(shouldPerformViewTransition({ viewTransition: true }, {}, {}, {})).toBe(true);
    expect(shouldPerformViewTransition({ viewTransition: false }, { viewTransition: true }, {}, {})).toBe(false);
    expect(shouldPerformViewTransition({}, { viewTransition: true }, {}, {})).toBe(true);
    expect(shouldPerformViewTransition({}, {}, {}, { viewTransition: true })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/router-view-transitions.test.ts`
Expected: FAIL (module `../src/runtime/view-transitions/detect.js` not found).

- [ ] **Step 3: Implement types.ts and detect.ts**

Create `src/runtime/view-transitions/types.ts`:
```typescript
export interface ResuxViewTransition {
  readonly isSupported: boolean;
  start: (updateCallback: () => Promise<void> | void) => Promise<void>;
}

export interface ResuxViewTransitionOptions {
  viewTransition?: boolean;
}
```

Create `src/runtime/view-transitions/detect.ts`:
```typescript
export function isViewTransitionSupported(): boolean {
  return typeof document !== "undefined" && typeof (document as any).startViewTransition === "function";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldPerformViewTransition(
  options: { viewTransition?: boolean } = {},
  nextMeta: { viewTransition?: boolean } = {},
  prevMeta: { viewTransition?: boolean } = {},
  routerConfig: { viewTransition?: boolean } = {}
): boolean {
  if (options.viewTransition !== undefined) {
    return Boolean(options.viewTransition);
  }
  if (nextMeta?.viewTransition !== undefined) {
    return Boolean(nextMeta.viewTransition);
  }
  if (prevMeta?.viewTransition !== undefined) {
    return Boolean(prevMeta.viewTransition);
  }
  return Boolean(routerConfig?.viewTransition);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run tests/router-view-transitions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/runtime/view-transitions/ tests/router-view-transitions.test.ts
git commit -m "feat(router): add modular view transitions types and detection"
```

---

### Task 2: Modular Transition Execution & Composable

**Files:**
- Create: `src/runtime/view-transitions/transition.ts`
- Create: `src/runtime/view-transitions/index.ts`
- Test: `tests/router-view-transitions.test.ts`

**Interfaces:**
- Consumes: `detect.ts`, `types.ts`.
- Produces: `executeViewTransition()`, `useViewTransition()`.

- [ ] **Step 1: Write failing test for executeViewTransition and useViewTransition**

Add to `tests/router-view-transitions.test.ts`:
```typescript
it("useViewTransition reports support and executes start callback", async () => {
  let executed = false;
  const vt = useViewTransition();
  expect(vt.isSupported).toBe(false);
  await vt.start(async () => {
    executed = true;
  });
  expect(executed).toBe(true);
});

it("executeViewTransition invokes document.startViewTransition when available", async () => {
  let domUpdated = false;
  let transitionInvoked = false;
  const original = (document as any).startViewTransition;
  (document as any).startViewTransition = (callback: () => Promise<void>) => {
    transitionInvoked = true;
    return {
      finished: callback(),
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve()
    };
  };

  try {
    await executeViewTransition(async () => {
      domUpdated = true;
    });
    expect(transitionInvoked).toBe(true);
    expect(domUpdated).toBe(true);
  } finally {
    (document as any).startViewTransition = original;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/router-view-transitions.test.ts`
Expected: FAIL (`useViewTransition` / `executeViewTransition` not found).

- [ ] **Step 3: Implement transition.ts and index.ts**

Create `src/runtime/view-transitions/transition.ts`:
```typescript
import { isViewTransitionSupported, prefersReducedMotion } from "./detect.js";
import type { ResuxViewTransition } from "./types.js";

export async function executeViewTransition(
  domSwapFn: () => Promise<void> | void
): Promise<void> {
  if (!isViewTransitionSupported() || prefersReducedMotion()) {
    await domSwapFn();
    return;
  }
  try {
    const transition = (document as any).startViewTransition(async () => {
      await domSwapFn();
    });
    await transition.finished;
  } catch {
    // If startViewTransition fails or aborts, domSwapFn has already run or will complete safely
  }
}

export function useViewTransition(): ResuxViewTransition {
  return {
    get isSupported() {
      return isViewTransitionSupported();
    },
    async start(updateCallback: () => Promise<void> | void): Promise<void> {
      await executeViewTransition(updateCallback);
    }
  };
}
```

Create `src/runtime/view-transitions/index.ts`:
```typescript
export * from "./types.js";
export * from "./detect.js";
export * from "./transition.js";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run tests/router-view-transitions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/runtime/view-transitions/ tests/router-view-transitions.test.ts
git commit -m "feat(router): add view transition execution runner and composable"
```

---

### Task 3: Router & `<ResuxLink>` Integration

**Files:**
- Modify: `src/runtime/router.ts`
- Modify: `src/runtime/index.ts`
- Test: `tests/router-view-transitions.test.ts`

**Interfaces:**
- Consumes: `src/runtime/view-transitions/index.js`.
- Produces: Integrated `navigateTo()`, `handleNavigationClick()`, and `useViewTransition` export from `resuxjs/runtime`.

- [ ] **Step 1: Write integration test for navigateTo and ResuxLink click**

Add to `tests/router-view-transitions.test.ts`:
```typescript
it("handles data-view-transition on clicked navigation anchors", () => {
  const anchor = document.createElement("a");
  anchor.href = "/destination";
  anchor.setAttribute("data-view-transition", "true");
  expect(anchor.getAttribute("data-view-transition")).toBe("true");
});
```

- [ ] **Step 2: Update router.ts and index.ts**

1. In `src/runtime/router.ts`:
   - Export `ResuxClientNavigationOptions` with `viewTransition?: boolean`.
2. In `src/runtime/index.ts`:
   - Export `useViewTransition` and types from `./view-transitions/index.js`.
   - In `handleNavigationClick()`:
     ```typescript
     const vtAttr = anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition");
     const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;
     void navigateTo(nextPath + target.hash, { ...(viewTransition !== undefined ? { viewTransition } : {}) });
     ```
   - In `navigateTo(target, options)`:
     Before DOM swap:
     ```typescript
     const routerConfig = globalThis.__RESUX__?.config?.router || {};
     const useTransition = shouldPerformViewTransition(options, nextPayload?.meta, previousPayload?.meta, routerConfig);
     if (useTransition) {
       setRouteTransition("swapping", { path: routePath });
       await executeViewTransition(async () => {
         const preserved = replaceRouteHtml(root, result.html, preserveLayout);
         globalThis.__RESUX__ = mergeClientGlobalState(
           mergePersistentLayoutPayload(previousPayload, nextPayload, preserved.scopeIds)
         );
       });
     } else {
       setRouteTransition("swapping", { path: routePath });
       const preserved = replaceRouteHtml(root, result.html, preserveLayout);
       globalThis.__RESUX__ = mergeClientGlobalState(
         mergePersistentLayoutPayload(previousPayload, nextPayload, preserved.scopeIds)
       );
     }
     ```

- [ ] **Step 3: Run all tests to verify**

Run: `npx.cmd vitest run tests/router-view-transitions.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/runtime/router.ts src/runtime/index.ts tests/router-view-transitions.test.ts
git commit -m "feat(router): integrate View Transitions with navigateTo and ResuxLink"
```

---

### Task 4: Full Quality Gates & Build Validation

**Files:**
- Test all: `npm run typecheck`, `npm test`, `npm run check:runtime-size`, `npm run verify:package`

- [ ] **Step 1: Run TypeScript typecheck**

Run: `npm.cmd run typecheck`
Expected: PASS (0 errors).

- [ ] **Step 2: Run all unit tests**

Run: `npm.cmd test`
Expected: PASS with 100% test files passing.

- [ ] **Step 3: Run runtime size budget check**

Run: `npm.cmd run check:runtime-size`
Expected: PASS (strict adherence to size budgets).

- [ ] **Step 4: Run package contract verification**

Run: `node scripts/verify-package-contract.mjs`
Expected: PASS.
