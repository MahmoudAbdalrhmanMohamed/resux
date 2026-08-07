import { describe, expect, it } from "vitest";
import {
  isReactive,
  nextTick,
  reactive,
  ref,
  toRefs,
  watch
} from "resuxjs/reactivity";

describe("resux reactivity edge cases", () => {
  it("preserves array shape in toRefs", () => {
    const values = reactive([1, 2]);
    const refs = toRefs(values);

    expect(Array.isArray(refs)).toBe(true);
    expect(refs).toHaveLength(2);

    refs[0].value = 3;
    expect(values[0]).toBe(3);
  });

  it("leaves native internal-slot objects usable instead of wrapping them with plain handlers", () => {
    const date = new Date("2026-08-07T00:00:00.000Z");
    const map = new Map<string, number>([["count", 1]]);
    const set = new Set<string>(["ready"]);
    const regexp = /resux/i;
    const state = reactive({ date, map, set, regexp });

    expect(state.date).toBe(date);
    expect(state.date.getUTCFullYear()).toBe(2026);
    expect(state.map).toBe(map);
    expect(state.map.get("count")).toBe(1);
    expect(state.set).toBe(set);
    expect(state.set.has("ready")).toBe(true);
    expect(state.regexp).toBe(regexp);
    expect(state.regexp.test("Resux")).toBe(true);
    expect(isReactive(state.date)).toBe(false);
    expect(isReactive(state.map)).toBe(false);
  });

  it("tracks enumerable symbol keys in deep watches", () => {
    const countKey = Symbol("count");
    const state = reactive({
      [countKey]: { value: 0 }
    });
    let runs = 0;

    const stop = watch(
      state,
      () => {
        runs++;
      },
      { deep: true, flush: "sync" }
    );

    state[countKey].value++;
    stop();

    expect(runs).toBe(1);
  });

  it("continues queued watch jobs after one callback throws", async () => {
    const failing = ref(0);
    const healthy = ref(0);
    const seen: number[] = [];

    watch(failing, () => {
      throw new Error("watch failed");
    });
    watch(healthy, (value) => {
      seen.push(value);
    });

    failing.value = 1;
    healthy.value = 2;

    await expect(nextTick()).rejects.toThrow("watch failed");
    expect(seen).toEqual([2]);
  });
});
