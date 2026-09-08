import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isLocalClientNavigation, normalizeClientPath } from "../src/runtime/router.js";
import { ref, computed } from "../src/runtime/reactivity.js";

describe("split browser runtime", () => {
  it("keeps lightweight entries independent from the monolithic runtime and optional features", async () => {
    for (const file of ["core.ts", "router.ts", "reactivity.ts"]) {
      const source = await readFile(new URL(`../src/runtime/${file}`, import.meta.url), "utf8");
      expect(source).not.toContain('from "./index.js"');
      expect(source).not.toContain("../i18n/");
      expect(source).not.toContain("../ui/");
      expect(source).not.toContain("../icons/");
      expect(source).not.toContain("../fonts/");
    }
  });

  it("keeps navigation helpers small and origin-safe", () => {
    expect(isLocalClientNavigation("/docs", "https://resux.dev")).toBe(true);
    expect(isLocalClientNavigation("https://example.com", "https://resux.dev")).toBe(false);
    expect(normalizeClientPath("/docs?q=1#api", "https://resux.dev")).toBe("/docs?q=1#api");
  });

  it("exposes reactivity without importing the full runtime", () => {
    const count = ref(2);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(4);
  });
});
