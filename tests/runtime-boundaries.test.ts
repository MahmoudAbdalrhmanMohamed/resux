import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as root from "resuxjs";
import * as reactivity from "resuxjs/reactivity";
import * as runtime from "resuxjs/runtime";
import { checkRuntimeBudgets } from "../scripts/report-runtime-metrics.mjs";

describe("runtime package boundaries", () => {
  it("keeps the documented root and runtime exports available", () => {
    for (const exportName of [
      "renderApp",
      "getClientRuntimeSource",
      "defineComponent",
      "ref",
      "reactive"
    ]) {
      expect(exportName in root, `root export ${exportName}`).toBe(true);
      expect(exportName in runtime, `runtime export ${exportName}`).toBe(true);
    }

    const rootRef = root.ref(1);
    const runtimeRef = runtime.ref(2);
    const focusedRef = reactivity.ref(3);

    expect(root.isRef(rootRef)).toBe(true);
    expect(runtime.isRef(runtimeRef)).toBe(true);
    expect(reactivity.isRef(focusedRef)).toBe(true);
    expect([rootRef.value, runtimeRef.value, focusedRef.value]).toEqual([1, 2, 3]);
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
