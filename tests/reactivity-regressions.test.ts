import { describe, expect, it } from "vitest";
import { effect, reactive, ref, watch } from "resuxjs/reactivity";

describe("reactivity regression coverage", () => {
  it("removes dependencies that are no longer read by a conditional effect", () => {
    const state = reactive({ useLeft: true, left: 1, right: 10 });
    let runs = 0;
    let value = 0;

    effect(() => {
      runs += 1;
      value = state.useLeft ? state.left : state.right;
    });

    expect(value).toBe(1);
    state.useLeft = false;
    expect(value).toBe(10);
    expect(runs).toBe(2);

    state.left = 2;
    expect(runs).toBe(2);

    state.right = 11;
    expect(value).toBe(11);
    expect(runs).toBe(3);
  });

  it("does not recursively execute an effect that mutates its own dependency", () => {
    const count = ref(0);
    let runs = 0;

    effect(() => {
      runs += 1;
      if (count.value === 0) {
        count.value = 1;
      }
    });

    expect(count.value).toBe(1);
    expect(runs).toBe(1);
  });

  it("tracks nested mutations when watching a reactive object", () => {
    const state = reactive({ nested: { count: 0 } });
    let runs = 0;

    const stop = watch(state, () => {
      runs += 1;
    }, { flush: "sync" });

    state.nested.count += 1;
    stop();
    state.nested.count += 1;

    expect(runs).toBe(1);
  });

  it("tracks reactive entries inside an array of watch sources", () => {
    const state = reactive({ count: 0 });
    let runs = 0;

    const stop = watch([state], () => {
      runs += 1;
    }, { flush: "sync" });

    state.count += 1;
    stop();

    expect(runs).toBe(1);
  });
});
