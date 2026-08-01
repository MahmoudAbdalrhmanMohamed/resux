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
