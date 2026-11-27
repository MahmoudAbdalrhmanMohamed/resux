import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("benchmark script", () => {
  it("is wired to npm run bench and shares the browser harness", async () => {
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.bench).toBe("node scripts/benchmark.mjs");
    const bench = await readFile(new URL("../scripts/benchmark.mjs", import.meta.url), "utf8");
    expect(bench).toContain('from "./browser-harness.mjs"');
    const browserTests = await readFile(new URL("../scripts/test-browser.mjs", import.meta.url), "utf8");
    expect(browserTests).toContain('from "./browser-harness.mjs"');
  });
});
