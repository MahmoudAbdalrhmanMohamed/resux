# Resux Fonts Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Resux's font subsystem into an automated, zero-config, zero-CLS font engine inspired by Nuxt Fonts v1 with named weights, variable axes, Fontaine-powered fallback font metrics, and `fontless` Vite integration.

**Architecture:** Extend `src/fonts/index.ts` with comprehensive semantic named weights and arbitrary variable axes. Generate `@font-face` fallback rules with metric overrides (`ascent-override`, `descent-override`, `size-adjust`) to cut Cumulative Layout Shift (CLS). Integrate the `fontless` Vite plugin via `resux.addVitePlugin()` for automatic CSS font detection, provider resolution, and local asset self-hosting while maintaining 100% backward compatibility with existing Resux font tests.

**Tech Stack:** TypeScript, Vite, Vitest, Resux Kit, Fontless, Unifont, Fontaine.

## Global Constraints

- Preserve 100% backward compatibility for existing manual `google` and `families` configurations and tests.
- Keep client runtime JavaScript additions strictly at 0 bytes to protect the 14 KiB raw / 5 KiB gzip resume bootstrap budget.
- Direct dependencies in `package.json` must follow stable semver ranges (`^x.y.z` or `~x.y.z`) matching `scripts/verify-dependency-baseline.mjs`.
- All font family names and URLs must be sanitized and CSS-escaped to prevent injection vulnerabilities.
- Work on branch `feat/fonts-v1` created from `main`.

---

### Task 1: Add Font Dependencies & Verify Baseline

**Files:**
- Modify: `package.json:88-100`
- Modify: `scripts/verify-dependency-baseline.mjs:34-47`
- Test: `scripts/verify-dependency-baseline.mjs`

**Interfaces:**
- Consumes: npm registry packages `fontless`, `fontaine`, `unifont`.
- Produces: Installed dependencies with verified production baseline.

- [ ] **Step 1: Inspect dependency requirements in scripts/verify-dependency-baseline.mjs**

Run: `node scripts/verify-dependency-baseline.mjs`
Expected: Output showing stable baseline verified.

- [ ] **Step 2: Add fontless, fontaine, and unifont to dependencies in package.json**

Add to `package.json` `dependencies`:
```json
    "fontless": "^1.3.2",
    "fontaine": "^1.0.1",
    "unifont": "^1.0.3"
```
And add expected majors to `scripts/verify-dependency-baseline.mjs`:
```javascript
  ["fontless", 1],
  ["fontaine", 1],
  ["unifont", 1],
```

- [ ] **Step 3: Run npm install and verify baseline**

Run: `npm.cmd install && node scripts/verify-dependency-baseline.mjs`
Expected: PASS with stable baseline verified including fontless, fontaine, and unifont.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/verify-dependency-baseline.mjs
git commit -m "build(fonts): add fontless, fontaine, and unifont dependencies"
```

---

### Task 2: Implement Semantic Named Weights & Arbitrary Variable Axes

**Files:**
- Modify: `src/fonts/index.ts:20-115`
- Test: `tests/fonts.test.ts`

**Interfaces:**
- Consumes: `ResuxFontWeightName`, `ResuxFontWeight`, `normalizeWeight(value)`.
- Produces: CSS weight strings (e.g. `"500"`, `"600"`, `"400 700"`) and variable axis rules.

- [ ] **Step 1: Write failing tests for named weights and variable axes**

Add tests to `tests/fonts.test.ts`:
```typescript
it("supports semantic named font weights", () => {
  const { headList, resux } = createMockResux();
  fontsModule.setup(
    {
      google: [
        { name: "Inter", weights: ["medium", "semibold", "bold"] }
      ]
    },
    resux as any
  );
  expect(headList[0].link?.[2]?.href).toContain("family=Inter:wght@500;600;700");
});

it("supports arbitrary variable axes in custom families", () => {
  const { headList, resux } = createMockResux();
  fontsModule.setup(
    {
      families: [
        {
          name: "Inter Variable",
          src: "/fonts/inter-var.woff2",
          axes: { opsz: [14, 32], wdth: 100 }
        }
      ]
    },
    resux as any
  );
  const style = headList[0].style?.[0]?.css;
  expect(style).toContain('font-family: "Inter Variable"');
  expect(style).toContain("font-variation-settings: \"opsz\" 14 32, \"wdth\" 100");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run tests/fonts.test.ts -t "supports semantic named font weights"`
Expected: FAIL because `medium` and `semibold` return null from `normalizeWeight`.

- [ ] **Step 3: Implement named weight mapping & variable axes in src/fonts/index.ts**

Update `normalizeWeight` in `src/fonts/index.ts`:
```typescript
const NAMED_WEIGHTS: Record<string, string> = {
  thin: "100",
  hairline: "100",
  extralight: "200",
  "extra-light": "200",
  ultralight: "200",
  light: "300",
  normal: "400",
  regular: "400",
  medium: "500",
  semibold: "600",
  "semi-bold": "600",
  demibold: "600",
  bold: "700",
  extrabold: "800",
  "extra-bold": "800",
  ultrabold: "800",
  black: "900",
  heavy: "900"
};

function normalizeWeight(value: number | string): string | null {
  const normalized = String(value).trim().toLowerCase();
  if (NAMED_WEIGHTS[normalized]) return NAMED_WEIGHTS[normalized];
  const match = /^(\d{1,4})(?:\.\.(\d{1,4}))?$/.exec(normalized);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (start < 1 || start > 1000 || (end !== undefined && (end < start || end > 1000))) {
    return null;
  }
  return end === undefined ? String(start) : `${start}..${end}`;
}
```
And handle `axes` formatting into `font-variation-settings` when building `@font-face` rules.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run tests/fonts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fonts/index.ts tests/fonts.test.ts
git commit -m "feat(fonts): support semantic named weights and variable axes"
```

---

### Task 3: Fontaine-Style Zero-CLS Metric Overrides

**Files:**
- Modify: `src/fonts/index.ts:370-440`
- Test: `tests/fonts.test.ts`

**Interfaces:**
- Consumes: `fontaine` library / font metric calculations.
- Produces: Fallback `@font-face` definitions with `ascent-override`, `descent-override`, `size-adjust`.

- [ ] **Step 1: Write failing test for font metric override generation**

Add test to `tests/fonts.test.ts`:
```typescript
it("generates fallback font metric overrides to eliminate layout shift", () => {
  const { headList, resux } = createMockResux();
  fontsModule.setup(
    {
      families: [
        {
          name: "Inter",
          src: "/fonts/inter.woff2",
          fallbacks: ["system-ui", "Arial", "sans-serif"]
        }
      ]
    },
    resux as any
  );
  const style = headList[0].style?.[0]?.css;
  expect(style).toContain('font-family: "Inter fallback: Arial"');
  expect(style).toContain("src: local(\"Arial\")");
  expect(style).toContain("ascent-override:");
  expect(style).toContain("descent-override:");
  expect(style).toContain("size-adjust:");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/fonts.test.ts -t "generates fallback font metric overrides"`
Expected: FAIL with fallback font-face not generated.

- [ ] **Step 3: Implement fallback font metric override generation using fontaine**

Integrate `generateFontFace` from `fontaine` or compute standard system fallback metrics for `Arial`, `system-ui`, `Helvetica`, `Times New Roman`, and `sans-serif` using fontaine's metric resolver in `buildCustomFontStyles`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run tests/fonts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fonts/index.ts tests/fonts.test.ts
git commit -m "feat(fonts): generate zero-CLS fallback font metric overrides"
```

---

### Task 4: Vite Plugin Integration (Fontless) & Zero-Config Scanning

**Files:**
- Modify: `src/fonts/index.ts:445-540`
- Test: `tests/fonts.test.ts`

**Interfaces:**
- Consumes: `fontless` Vite plugin, `resux.addVitePlugin()`.
- Produces: Integrated Vite plugin in Resux module pipeline, preloads, and SSR inlining.

- [ ] **Step 1: Write failing test for Vite plugin autoScan registration**

Add test to `tests/fonts.test.ts`:
```typescript
it("registers fontless Vite plugin when autoScan is enabled", () => {
  const plugins: any[] = [];
  const resux = {
    addVitePlugin(plugin: any) { plugins.push(plugin); },
    addHead() {},
    extendRuntimeConfig() {}
  };
  fontsModule.setup({ autoScan: true }, resux as any);
  expect(plugins.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/fonts.test.ts -t "registers fontless Vite plugin"`
Expected: FAIL because `addVitePlugin` is not called yet in `setup()`.

- [ ] **Step 3: Implement fontless registration in setup()**

In `src/fonts/index.ts`:
Import `fontless` from `"fontless"` and conditionally register `resux.addVitePlugin(fontless(fontlessOptions))` when `options.autoScan !== false`. Ensure legacy manual families and tests continue to work flawlessly.

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `npx.cmd vitest run tests/fonts.test.ts`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/fonts/index.ts tests/fonts.test.ts
git commit -m "feat(fonts): register fontless Vite plugin for zero-config scanning"
```

---

### Task 5: Full Quality Gates & Build Validation

**Files:**
- Test all: `npm run typecheck`, `npm test`, `npm run check:runtime-size`, `npm run verify:package`

- [ ] **Step 1: Run TypeScript typecheck**

Run: `npm.cmd run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 2: Run all unit tests**

Run: `npm.cmd test`
Expected: PASS with all tests passing.

- [ ] **Step 3: Run runtime size budget check**

Run: `npm.cmd run check:runtime-size`
Expected: PASS with all runtime byte budgets respected.

- [ ] **Step 4: Run package contract verification**

Run: `node scripts/verify-package-contract.mjs`
Expected: PASS

---

### Task 6: Triage & Make Open PRs Mergeable

**Files:**
- GitHub PRs: #115, #101, #109, #114, #113, #117

- [ ] **Step 1: Check mergeability and conflicts on open PR branches**

Run: `gh pr view 115`, `gh pr view 101`, `gh pr view 109` to verify their latest head SHAs and statuses.

- [ ] **Step 2: Rebase / retrigger CI on unstable PRs**

Rebase PR #115 and #101 against `main` if behind, or trigger a rerun on GitHub Actions to clear any transient network or duplicate job instabilities.

- [ ] **Step 3: Report status of each PR and mergeability confirmation**
