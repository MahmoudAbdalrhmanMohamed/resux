import { describe, expect, it } from "vitest";
import {
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
