import { describe, expect, it } from "vitest";
import {
  computed,
  isReactive,
  isReadonly,
  isRef,
  nextTick,
  reactive,
  readonly,
  ref,
  toRef,
  toRefs,
  unref,
  watch,
  watchEffect
} from "resuxjs/reactivity";

describe("resux reactivity", () => {
  it("supports ref, isRef, and unref", () => {
    const count = ref(1);
    expect(isRef(count)).toBe(true);
    expect(unref(count)).toBe(1);
    count.value = 2;
    expect(unref(count)).toBe(2);
  });

  it("supports reactive objects and reactive checks", () => {
    const state = reactive({ count: 1, nested: { value: 2 } });
    expect(isReactive(state)).toBe(true);
    expect(isReactive(state.nested)).toBe(true);
    state.count++;
    expect(state.count).toBe(2);
  });

  it("supports computed caching and invalidation", () => {
    const count = ref(2);
    let runs = 0;
    const doubled = computed(() => {
      runs++;
      return count.value * 2;
    });

    expect(doubled.value).toBe(4);
    expect(doubled.value).toBe(4);
    expect(runs).toBe(1);

    count.value = 3;
    expect(doubled.value).toBe(6);
    expect(runs).toBe(2);
  });

  it("supports watch with immediate and sync flush", () => {
    const count = ref(0);
    const seen: Array<{ next: number; previous: number | undefined }> = [];
    const stop = watch(
      count,
      (next, previous) => {
        seen.push({ next, previous });
      },
      { immediate: true, flush: "sync" }
    );

    count.value = 1;
    count.value = 2;
    stop();
    count.value = 3;

    expect(seen).toEqual([
      { next: 0, previous: undefined },
      { next: 1, previous: 0 },
      { next: 2, previous: 1 }
    ]);
  });

  it("supports deep watch for reactive trees", () => {
    const state = reactive({ nested: { count: 0 } });
    let runs = 0;
    const stop = watch(
      state,
      () => {
        runs++;
      },
      { deep: true, flush: "sync" }
    );

    state.nested.count++;
    stop();
    state.nested.count++;

    expect(runs).toBe(1);
  });

  it("supports watchEffect and cleanup", () => {
    const flag = ref(true);
    let cleanupCalls = 0;
    let runs = 0;

    const stop = watchEffect((onCleanup) => {
      runs++;
      if (flag.value) {
        onCleanup(() => {
          cleanupCalls++;
        });
      }
    }, { flush: "sync" });

    flag.value = false;
    stop();

    expect(runs).toBe(2);
    expect(cleanupCalls).toBe(1);
  });

  it("supports readonly proxies and readonly checks", () => {
    const source = reactive({ count: 1 });
    const locked = readonly(source);

    expect(isReadonly(locked)).toBe(true);
    locked.count = 9;
    expect(source.count).toBe(1);
  });

  it("supports toRef and toRefs", () => {
    const state = reactive({ a: 1, b: 2 });
    const a = toRef(state, "a");
    const refs = toRefs(state);

    a.value = 5;
    refs.b.value = 8;

    expect(state.a).toBe(5);
    expect(state.b).toBe(8);
    state.a = 6;
    expect(a.value).toBe(6);
  });

  it("supports nextTick scheduling", async () => {
    const order: string[] = [];
    order.push("sync");
    const task = nextTick(() => {
      order.push("tick");
    });
    order.push("after");
    await task;
    expect(order).toEqual(["sync", "after", "tick"]);
  });

  it("waits for queued watch jobs in nextTick", async () => {
    const count = ref(0);
    const seen: number[] = [];

    watch(count, (value) => {
      seen.push(value);
    }, { flush: "post" });

    count.value = 1;
    expect(seen).toEqual([]);

    await nextTick();
    expect(seen).toEqual([1]);
  });
});
