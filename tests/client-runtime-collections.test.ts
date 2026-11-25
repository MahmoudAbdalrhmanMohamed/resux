import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";

// Behavioral regression coverage for the *client* runtime's reactive engine
// (the plain-JS copy inside getClientRuntimeSource()). The server engine in
// src/reactivity is covered by reactive-ref-unwrap-collections.test.ts; this
// suite guards the browser copy against the two copies drifting apart again.

type ProbeResult = { name: string; pass: boolean; detail: string };

async function runClientEngineProbe(probeBody: string): Promise<ProbeResult[]> {
  const window = new Window({ url: "http://localhost/" });
  try {
    const source = getClientRuntimeSource()
      .replaceAll("import.meta", "({env:{DEV:false}})")
      .replace(/^export \{[^}]*\};?\s*$/gm, "")
      .replace(/^export (?=(async )?(function|const|let|var|class))/gm, "");
    window.eval(source);
    const body = probeBody.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
    const script = "(() => { const out = []; const t = (name, pass, detail) => out.push({ name, pass: !!pass, detail: String(detail) }); "
      + body + "; return out; })()";
    return window.eval(script) as ProbeResult[];
  } finally {
    await window.happyDOM.close();
  }
}

function expectAllPass(results: ProbeResult[]) {
  const failures = results.filter((r) => !r.pass);
  expect(
    failures.map((f) => `${f.name} :: ${f.detail}`),
    `client engine probe failures: ${failures.map((f) => f.name).join(", ")}`,
  ).toEqual([]);
}

describe("client runtime collection reactivity", () => {
  it("tracks Map get/set/add/delete/clear with server-equivalent semantics", async () => {
    const results = await runClientEngineProbe(`
      const map = reactive(new Map([["a", 1]]));
      let runs = 0; let last = "";
      effect(() => { runs++; last = [...map.entries()].map(([k, v]) => k + "=" + v).join(","); });
      map.set("a", 2);
      t("value-only set re-runs entries() effects", runs === 2 && last === "a=2", runs + " " + last);

      let keyRuns = 0;
      effect(() => { keyRuns++; [...map.keys()].length; });
      map.set("a", 3);
      t("value-only set does NOT re-run keys() effects", keyRuns === 1, keyRuns);

      map.set("b", 1);
      t("add re-runs keys() effects", keyRuns === 2, keyRuns);

      let sizeRuns = 0;
      effect(() => { sizeRuns++; map.size; });
      map.set("c", 9);
      t("add re-runs size effects", sizeRuns === 2, sizeRuns);

      map.delete("a");
      t("delete re-runs iteration effects", runs === 6, runs);

      const m2 = reactive(new Map([["x", 1]]));
      let getRuns = 0;
      effect(() => { getRuns++; m2.get("x"); });
      m2.clear();
      t("clear invalidates per-key effects", getRuns === 2, getRuns);
    `);
    expectAllPass(results);
  });

  it("tracks Set and WeakMap mutations", async () => {
    const results = await runClientEngineProbe(`
      const set = reactive(new Set([1]));
      let runs = 0;
      effect(() => { runs++; set.size; });
      set.add(2);
      t("set.add triggers effects", runs === 2, runs);
      set.add(2);
      t("set.add of existing value does not re-trigger", runs === 2, runs);
      set.delete(1);
      t("set.delete triggers effects", runs === 3, runs);

      const wm = reactive(new WeakMap());
      const key = {};
      let wRuns = 0; let observed = "";
      effect(() => { wRuns++; observed = wm.get(key); });
      wm.set(key, "v1");
      t("weakmap set triggers effects", wRuns === 2 && observed === "v1", wRuns + " " + observed);
      wm.delete(key);
      t("weakmap delete triggers effects", wRuns === 3, wRuns);
    `);
    expectAllPass(results);
  });

  it("matches server ref-unwrapping semantics", async () => {
    const results = await runClientEngineProbe(`
      const count = ref(0);
      const state = reactive({ count });
      t("plain object property unwraps ref on read", state.count === 0, state.count);
      state.count = 42;
      t("plain value assignment writes through to the stored ref", count.value === 42, count.value);

      const holder = reactive({ list: [ref(7)] });
      t("array indices do NOT unwrap refs", isRef(holder.list[0]), typeof holder.list[0]);

      const refInMap = ref("wrapped");
      const map = reactive(new Map([["w", refInMap]]));
      const viaGet = map.get("w");
      t("Map.get keeps refs wrapped (docs: refs read from collections are proxied, not unwrapped)", isRef(viaGet), typeof viaGet);
      t("proxied ref from a collection still exposes .value", viaGet.value === "wrapped", viaGet.value);
    `);
    expectAllPass(results);
  });

  it("supports toRaw, isReactive, and readonly collections", async () => {
    const results = await runClientEngineProbe(`
      const map = reactive(new Map([["a", 1]]));
      t("toRaw returns the raw collection", toRaw(map) instanceof Map && !isReactive(toRaw(map)), "");
      t("isReactive detects collection proxies", isReactive(map), "");
      const ro = readonly(new Map([["a", 1]]));
      ro.set("b", 2);
      t("readonly collection ignores set", ro.size === 1, ro.size);
      t("isReadonly detects readonly collections", isReadonly(ro), "");
    `);
    expectAllPass(results);
  });

  it("ships the collection instrumentation inside the generated client runtime", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain("__rxCreateCollectionInstrumentations");
    expect(source).toContain("__rxMapKeyIterateKey");
    expect(source).toContain('"[object WeakMap]"');
    expect(source).toContain("function toRaw(");
  });
});
