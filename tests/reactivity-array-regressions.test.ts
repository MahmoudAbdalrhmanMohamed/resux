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
