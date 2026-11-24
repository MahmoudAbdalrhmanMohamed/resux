import { describe, expect, it } from "vitest";
import { effect, reactive } from "resuxjs/reactivity";

describe("reactive array regressions", () => {
  it("updates length effects when an index grows the array", () => {
    const list = reactive<number[]>([]);
    let length = -1;
    let runs = 0;

    effect(() => {
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

  it("does not trigger length effects for an existing index assignment", () => {
    const list = reactive([1]);
    let runs = 0;

    effect(() => {
      runs += 1;
      void list.length;
    });

    list[0] = 2;
    expect(runs).toBe(1);
  });
});

describe("reactive array identity methods", () => {
  it("finds raw object arguments stored in a reactive array", () => {
    const item = { id: 1 };
    const list = reactive([item]);

    expect(list.includes(item)).toBe(true);
    expect(list.indexOf(item)).toBe(0);
    expect(list.lastIndexOf(item)).toBe(0);
  });

  it("finds proxy arguments against raw stored elements", () => {
    const item = { id: 1 };
    const list = reactive([item]);
    const proxy = list[0];

    expect(list.includes(proxy)).toBe(true);
    expect(list.indexOf(proxy)).toBe(0);
    expect(list.lastIndexOf(proxy)).toBe(0);
  });

  it("finds objects in nested reactive arrays", () => {
    const item = { id: 1 };
    const state = reactive({ list: [item] });

    expect(state.list.includes(item)).toBe(true);
    expect(state.list.indexOf(item)).toBe(0);
  });

  it("still reports misses for values that are not present", () => {
    const list = reactive([{ id: 1 }]);

    expect(list.includes({ id: 1 })).toBe(false);
    expect(list.indexOf({ id: 1 })).toBe(-1);
    expect(list.lastIndexOf({ id: 1 })).toBe(-1);
  });

  it("keeps primitive identity semantics", () => {
    const list = reactive([1, 2, 2, NaN]);

    expect(list.includes(2)).toBe(true);
    expect(list.indexOf(2)).toBe(1);
    expect(list.lastIndexOf(2)).toBe(2);
    expect(list.includes(NaN)).toBe(true);
    // Native semantics: indexOf uses strict equality, so NaN is never found.
    expect(list.indexOf(NaN)).toBe(-1);
  });

  it("re-runs identity effects when membership changes", () => {
    const item = { id: 1 };
    const list = reactive<Record<string, number>[]>([]);
    let present = false;

    effect(() => {
      present = list.includes(item);
    });

    expect(present).toBe(false);
    list.push(item);
    expect(present).toBe(true);
    list.splice(0, 1);
    expect(present).toBe(false);
  });
});

describe("identity method review follow-ups", () => {
  it("prefers the earliest equivalent element across raw/proxy mixes", () => {
    const item = { id: 1 };
    const proxy = reactive(item);
    const list = reactive([item, proxy]);

    expect(list.indexOf(proxy)).toBe(0);
    expect(list.lastIndexOf(proxy)).toBe(1);
    expect(list.includes(proxy)).toBe(true);
    expect(list.indexOf(list[0])).toBe(0);
  });

  it("respects fromIndex in the normalized traversal", () => {
    const item = { id: 1 };
    const proxy = reactive(item);
    const list = reactive([item, proxy]);

    expect(list.indexOf(proxy, 1)).toBe(1);
    expect(list.indexOf(proxy, -1)).toBe(1);
    expect(list.lastIndexOf(proxy, 0)).toBe(0);
    expect(list.includes(proxy, 2)).toBe(false);
  });

  it("does not re-read elements when the search argument needs no unwrapping", () => {
    let reads = 0;
    const arr = [0, 0, 0];
    Object.defineProperty(arr, "0", {
      configurable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    const list = reactive(arr);

    expect(list.includes(2)).toBe(false);
    expect(reads).toBe(1);
  });

  it("preserves own-property overrides of instrumented methods", () => {
    const arr = [1, 2, 3];
    Object.defineProperty(arr, "includes", { value: () => false });

    expect(reactive(arr).includes(1)).toBe(false);
  });

  it("preserves inherited overrides of instrumented methods", () => {
    const arr: number[] = [1, 2, 3];
    Object.setPrototypeOf(arr, Object.assign(Object.create(Array.prototype), { indexOf: () => 42 }));

    expect(reactive(arr).indexOf(1)).toBe(42);
  });
});

describe("array identity method instrumentation follow-ups", () => {
  it("reruns effects when an identity method is overridden", () => {
    const list = reactive([1, 2, 3]);
    let runs = 0;
    let result: boolean | undefined;

    effect(() => {
      runs += 1;
      result = list.includes(2);
    });

    expect(result).toBe(true);
    list.includes = (() => false) as unknown as typeof list.includes;
    expect(runs).toBe(2);
    expect(result).toBe(false);
  });

  it("tracks accessor element reads during includes", () => {
    const raw: { needle?: number } = [] as unknown as { needle?: number };
    Object.defineProperty(raw, "0", {
      get(this: { needle?: number }) {
        return this.needle;
      },
      configurable: true,
      enumerable: true
    });
    raw.needle = 1;
    const list = reactive(raw as unknown as number[]);
    let runs = 0;
    let result: boolean | undefined;

    effect(() => {
      runs += 1;
      result = list.includes(1);
    });

    expect(result).toBe(true);
    list.needle = 2;
    expect(runs).toBe(2);
    expect(result).toBe(false);
  });

  it("reads accessor elements at most once per lookup", () => {
    let reads = 0;
    const raw: number[] = [];
    Object.defineProperty(raw, "0", {
      get() {
        reads += 1;
        return 7;
      },
      configurable: true,
      enumerable: true
    });
    const list = reactive(raw);

    expect(list.includes(7)).toBe(true);
    expect(reads).toBe(1);
    reads = 0;
    expect(list.indexOf(7)).toBe(0);
    expect(reads).toBe(1);
  });

  it("keeps native NaN and fromIndex semantics", () => {
    const list = reactive([1, Number.NaN, 3]);

    expect(list.includes(Number.NaN)).toBe(true);
    expect(list.indexOf(Number.NaN)).toBe(-1);
    expect(list.indexOf(3, -1)).toBe(2);
    expect(list.lastIndexOf(1, -3)).toBe(0);
    expect(list.includes(1, 1)).toBe(false);
  });
});
