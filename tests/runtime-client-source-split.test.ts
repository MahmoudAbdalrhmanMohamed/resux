import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "../src/runtime/index.js";

const runtimeDir = new URL("../src/runtime/", import.meta.url);
const partsDir = new URL("client-source/", runtimeDir);

describe("client runtime source is split into parts", () => {
  it("keeps the runtime entry small and each part under 80 KB", async () => {
    const entry = await readFile(new URL("index.ts", runtimeDir), "utf8");
    expect(entry.split("\n").length).toBeLessThan(12000);
    const parts = (await readdir(partsDir)).filter((name) => /^part-\d+\.ts$/.test(name));
    expect(parts.length).toBeGreaterThanOrEqual(8);
    for (const name of parts) {
      const source = await readFile(new URL(name, partsDir), "utf8");
      expect(source.length, name).toBeLessThan(80_000);
    }
  });

  it("joins the parts into one script with the package registry and transition tags filled in", () => {
    const source = getClientRuntimeSource();
    expect(source.startsWith("\nconst scopeCache = new Map();")).toBe(true);
    expect(source.endsWith("installResux();\n")).toBe(true);
    expect(source).toContain("const resuxPackageImporters = ");
    expect(source).toMatch(/const unsafeClientTransitionContainerTags = new Set\(\[.*\]\);/);
    expect(source).not.toContain("${");
  });
});
