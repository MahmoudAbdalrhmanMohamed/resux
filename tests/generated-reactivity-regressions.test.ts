import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { afterEach, describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";

const tempRoots: string[] = [];
let importCounter = 0;

afterEach(async () => {
  for (const key of [
    "window",
    "document",
    "location",
    "history",
    "__RESUX__",
    "__RESUX_INSTALLED__",
  ]) {
    delete (globalThis as Record<string, unknown>)[key];
  }
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("generated browser reactivity regressions", () => {
  it("cleans conditional dependencies and avoids self-recursion", async () => {
    const runtime = await importGeneratedRuntime();
    const state = runtime.reactive({ useLeft: true, left: 1, right: 10 });
    let runs = 0;
    let value = 0;

    runtime.effect(() => {
      runs += 1;
      value = state.useLeft ? state.left : state.right;
    });

    state.useLeft = false;
    expect(value).toBe(10);
    expect(runs).toBe(2);

    state.left = 2;
    expect(runs).toBe(2);

    const count = runtime.ref(0);
    let selfRuns = 0;
    runtime.effect(() => {
      selfRuns += 1;
      if (count.value === 0) {
        count.value = 1;
      }
    });

    expect(count.value).toBe(1);
    expect(selfRuns).toBe(1);
  });

  it("tracks nested reactive objects passed directly to watch", async () => {
    const runtime = await importGeneratedRuntime();
    const state = runtime.reactive({ nested: { count: 0 } });
    let runs = 0;

    const stop = runtime.watch(state, () => {
      runs += 1;
    }, { flush: "sync" });

    state.nested.count += 1;
    stop();
    state.nested.count += 1;

    expect(runs).toBe(1);
  });

  it("updates array length effects when an index grows the array", async () => {
    const runtime = await importGeneratedRuntime();
    const list = runtime.reactive<number[]>([]);
    let length = -1;
    let runs = 0;

    runtime.effect(() => {
      runs += 1;
      length = list.length;
    });

    list.push(1);
    expect(length).toBe(1);
    expect(runs).toBe(2);

    list[3] = 4;
    expect(length).toBe(4);
    expect(runs).toBe(3);
  });
});

async function importGeneratedRuntime(): Promise<{
  effect: (fn: () => void) => unknown;
  reactive: <T extends object>(value: T) => T;
  ref: <T>(value: T) => { value: T };
  watch: (
    source: object,
    callback: () => void,
    options?: { flush?: "sync" | "post" },
  ) => () => void;
}> {
  importCounter += 1;
  const root = path.join(os.tmpdir(), `resux-generated-reactivity-${Date.now()}-${importCounter}`);
  tempRoots.push(root);
  await mkdir(root, { recursive: true });
  const runtimeFile = path.join(root, "runtime-client.mjs");
  await writeFile(
    runtimeFile,
    `${getClientRuntimeSource()}\nexport { effect, reactive, ref, watch };\n`,
    "utf8",
  );

  const window = new Window({ url: "http://localhost/" });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    history: window.history,
    __RESUX__: {
      route: { path: "/", params: {}, query: {} },
      scopes: {},
      modules: {},
    },
    __RESUX_INSTALLED__: true,
  });

  return import(`${pathToFileURL(runtimeFile).href}?test=${importCounter}`) as Promise<any>;
}
