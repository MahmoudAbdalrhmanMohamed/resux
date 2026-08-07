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

  it("preserves array shape in generated toRefs", async () => {
    const runtime = await importGeneratedRuntime();
    const list = runtime.reactive([1, 2]);
    const refs = runtime.toRefs(list);

    expect(Array.isArray(refs)).toBe(true);
    expect(refs).toHaveLength(2);
    refs[0].value = 7;
    expect(list[0]).toBe(7);
  });

  it("tracks enumerable symbol keys and property iteration in deep watches", async () => {
    const runtime = await importGeneratedRuntime();
    const symbolKey = Symbol("count");
    const state = runtime.reactive<Record<PropertyKey, any>>({
      [symbolKey]: { value: 0 },
    });
    let runs = 0;

    const stop = runtime.watch(state, () => {
      runs += 1;
    }, { flush: "sync", deep: true });

    state[symbolKey].value += 1;
    state.added = 1;
    delete state.added;
    stop();

    expect(runs).toBe(3);
  });

  it("notifies deep generated watchers when a new property is added as undefined", async () => {
    const runtime = await importGeneratedRuntime();
    const state = runtime.reactive<Record<string, unknown>>({});
    let runs = 0;

    const stop = runtime.watch(state, () => {
      runs += 1;
    }, { flush: "sync", deep: true });

    state.added = undefined;
    stop();

    expect(runs).toBe(1);
  });

  it("continues generated queued watchers after one callback throws", async () => {
    const runtime = await importGeneratedRuntime();
    const failing = runtime.ref(0);
    const healthy = runtime.ref(0);
    const seen: number[] = [];

    const stopFailing = runtime.watch(failing, () => {
      throw new Error("generated watch failed");
    });
    const stopHealthy = runtime.watch(healthy, (value: number) => {
      seen.push(value);
    });

    failing.value = 1;
    healthy.value = 2;

    await expect(runtime.nextTick()).rejects.toThrow("generated watch failed");
    expect(seen).toEqual([2]);
    stopFailing();
    stopHealthy();
  });

  it("caps recursively queued generated watchers instead of hanging", async () => {
    const runtime = await importGeneratedRuntime();
    const count = runtime.ref(0);
    const stop = runtime.watch(count, () => {
      count.value += 1;
    });

    count.value = 1;
    await expect(runtime.nextTick()).rejects.toThrow("recursively queued job");
    stop();
    expect(count.value).toBeGreaterThan(1);
  });

  it("keeps native internal-slot objects usable in the generated runtime", async () => {
    const runtime = await importGeneratedRuntime();
    const date = new Date("2026-08-07T00:00:00.000Z");
    const map = new Map<string, number>([["count", 1]]);
    const set = new Set<string>(["ready"]);
    const regexp = /resux/i;
    const state = runtime.reactive({ date, map, set, regexp });

    expect(state.date).toBe(date);
    expect(state.date.getUTCFullYear()).toBe(2026);
    expect(state.map.get("count")).toBe(1);
    expect(state.set.has("ready")).toBe(true);
    expect(state.regexp.test("Resux")).toBe(true);
  });

  it("evicts rejected generated lazy-package promises so a later call retries", async () => {
    const runtime = await importGeneratedRuntime();
    let errorEvents = 0;
    window.addEventListener("resux:package:error", () => {
      errorEvents += 1;
    });

    const packageName = "resux-definitely-missing-generated-audit-package";
    await expect(runtime.useLazyPackage(packageName, { mode: "clientOnly" })).rejects.toThrow();
    await expect(runtime.useLazyPackage(packageName, { mode: "clientOnly" })).rejects.toThrow();

    expect(errorEvents).toBe(2);
  });
});

async function importGeneratedRuntime(): Promise<{
  effect: (fn: () => void) => unknown;
  reactive: <T extends object>(value: T) => T;
  ref: <T>(value: T) => { value: T };
  toRefs: <T extends object>(value: T) => any;
  nextTick: () => Promise<void>;
  watch: (
    source: any,
    callback: (...args: any[]) => void,
    options?: { flush?: "sync" | "post"; deep?: boolean },
  ) => () => void;
  useLazyPackage: (name: string, options?: Record<string, unknown>) => Promise<unknown>;
}> {
  importCounter += 1;
  const root = path.join(os.tmpdir(), `resux-generated-reactivity-${Date.now()}-${importCounter}`);
  tempRoots.push(root);
  await mkdir(root, { recursive: true });
  const runtimeFile = path.join(root, "runtime-client.mjs");
  await writeFile(
    runtimeFile,
    `${getClientRuntimeSource()}\nexport { effect, reactive, ref, toRefs, watch, nextTick, useLazyPackage };\n`,
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
