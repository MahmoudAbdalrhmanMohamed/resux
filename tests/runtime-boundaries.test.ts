import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as root from "resuxjs";
import * as reactivity from "resuxjs/reactivity";
import * as runtime from "resuxjs/runtime";
import { checkRuntimeBudgets } from "../scripts/report-runtime-metrics.mjs";

describe("runtime package boundaries", () => {
  it("keeps root and runtime exports aligned", () => {
    expect(root.renderApp).toBe(runtime.renderApp);
    expect(root.getClientRuntimeSource).toBe(runtime.getClientRuntimeSource);
    expect(root.ref).toBe(runtime.ref);
    expect(runtime.ref).toBe(reactivity.ref);
    expect(runtime.reactive).toBe(reactivity.reactive);
  });

  it("keeps the focused reactivity entry free of runtime rendering APIs", () => {
    expect("renderApp" in reactivity).toBe(false);
    expect("getClientRuntimeSource" in reactivity).toBe(false);
    expect("defineComponent" in reactivity).toBe(false);
  });

  it("prevents the reactivity layer from depending on runtime or compiler code", async () => {
    const reactivityDir = path.resolve("src/reactivity");
    const files = (await readdir(reactivityDir))
      .filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      const source = await readFile(path.join(reactivityDir, file), "utf8");
      expect(source, `${file} imports the runtime`).not.toMatch(/from\s+["'][^"']*runtime\//);
      expect(source, `${file} imports the compiler`).not.toMatch(/from\s+["'][^"']*compiler\//);
    }
  });

  it("reports every size-budget failure without stopping at the first one", () => {
    const failures = checkRuntimeBudgets(
      {
        sourceRuntimeBytes: 12,
        generatedClientRuntimeBytes: 30
      },
      {
        sourceRuntimeBytes: 10,
        generatedClientRuntimeBytes: 20
      }
    );

    expect(failures).toEqual([
      "sourceRuntimeBytes: 12 bytes exceeds 10 bytes",
      "generatedClientRuntimeBytes: 30 bytes exceeds 20 bytes"
    ]);
  });
});
