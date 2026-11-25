import { describe, expect, it } from "vitest";
import {
  effect,
  isReactive,
  reactive,
  readonly,
  ref,
  toRaw
} from "resuxjs/reactivity";

describe("reactive() ref unwrapping", () => {
  it("unwraps refs on plain object property access", () => {
    const count = ref(0);
    const state = reactive({ count });
    expect(state.count).toBe(0);
    count.value = 5;
    expect(state.count).toBe(5);
  });

  it("writes through to an existing ref instead of replacing it", () => {
    const count = ref(1);
    const state = reactive({ count });
    state.count = 42;
    expect(count.value).toBe(42);
    expect(toRaw(state).count).toBe(count);
  });

  it("stores a newly assigned ref as a ref and unwraps it on read", () => {
    const state = reactive<{ value?: unknown }>({});
    const value = ref("x");
    state.value = value;
    expect(toRaw(state).value).toBe(value);
    expect(state.value).toBe("x");
  });

  it("does not unwrap refs at array indices", () => {
    const count = ref(7);
    const state = reactive({ list: [count] });
    expect(state.list[0]).toBe(count);
  });

  it("tracks effects through the unwrapped value", () => {
    const count = ref(0);
    const state = reactive({ count });
    let observed = -1;
    effect(() => {
      observed = state.count;
    });
    count.value = 3;
    expect(observed).toBe(3);
    state.count = 9;
    expect(observed).toBe(9);
  });

  it("readonly() also unwraps refs", () => {
    const count = ref("ro");
    const state = readonly({ count });
    expect(state.count).toBe("ro");
  });
});

describe("reactive() Map instrumentation", () => {
  it("tracks get() and re-runs on set()", () => {
    const map = reactive(new Map<string, number>());
    let observed: number | undefined;
    effect(() => {
      observed = map.get("a");
    });
    expect(observed).toBeUndefined();
    map.set("a", 1);
    expect(observed).toBe(1);
    map.set("a", 2);
    expect(observed).toBe(2);
  });

  it("tracks has() and size", () => {
    const map = reactive(new Map<string, number>());
    let hasA = false;
    let size = -1;
    effect(() => {
      hasA = map.has("a");
    });
    effect(() => {
      size = map.size;
    });
    map.set("a", 1);
    expect(hasA).toBe(true);
    expect(size).toBe(1);
    map.delete("a");
    expect(hasA).toBe(false);
    expect(size).toBe(0);
  });

  it("does not re-run value effects when an existing key is set to the same value", () => {
    const map = reactive(new Map([["a", 1]]));
    let runs = 0;
    effect(() => {
      map.get("a");
      runs++;
    });
    expect(runs).toBe(1);
    map.set("a", 1);
    expect(runs).toBe(1);
    map.set("a", 2);
    expect(runs).toBe(2);
  });

  it("clear() invalidates per-key and iteration dependencies", () => {
    const map = reactive(new Map([["a", 1]]));
    let observed: number | undefined;
    let size = -1;
    effect(() => {
      observed = map.get("a");
    });
    effect(() => {
      size = map.size;
    });
    map.clear();
    expect(observed).toBeUndefined();
    expect(size).toBe(0);
  });

  it("iterates entries/keys/values reactively and wraps object values", () => {
    const map = reactive(new Map<string, { n: number }>([["k", { n: 1 }]]));
    const entry = [...map.entries()][0];
    expect(isReactive(entry[1])).toBe(true);
    expect(entry[1].n).toBe(1);

    let keysSeen = 0;
    let entriesSeen = 0;
    effect(() => {
      keysSeen = [...map.keys()].length;
    });
    effect(() => {
      entriesSeen = [...map].length;
    });
    map.set("k", { n: 2 });
    // value-only change: keys() iteration untouched, entries() re-runs
    expect(keysSeen).toBe(1);
    expect(entriesSeen).toBe(1);
    map.set("k2", { n: 3 });
    expect(keysSeen).toBe(2);
    expect(entriesSeen).toBe(2);
  });

  it("forEach wraps values and keys and tracks iteration", () => {
    const map = reactive(new Map([["a", { n: 1 }]]));
    const seen: unknown[] = [];
    map.forEach((value, key) => {
      seen.push(key, value);
    });
    expect(seen[0]).toBe("a");
    expect(isReactive(seen[1])).toBe(true);

    let count = 0;
    effect(() => {
      map.forEach(() => {
        count++;
      });
    });
    expect(count).toBe(1);
    map.set("b", { n: 2 });
    expect(count).toBe(3); // re-ran: 2 entries + initial 1
  });

  it("stores keys and values raw (identity round-trip)", () => {
    const inner = { n: 1 };
    const map = reactive(new Map());
    const proxyInner = reactive(inner);
    map.set(proxyInner, proxyInner);
    const raw = toRaw(map);
    expect(raw.has(inner)).toBe(true);
    // lookups work with both raw and proxied keys
    expect(map.has(inner)).toBe(true);
    expect(map.has(proxyInner)).toBe(true);
    expect(map.get(inner)).toBe(map.get(proxyInner));
  });
});

describe("reactive() Set instrumentation", () => {
  it("tracks has() and size across add/delete", () => {
    const set = reactive(new Set<number>());
    let hasOne = false;
    let size = -1;
    effect(() => {
      hasOne = set.has(1);
    });
    effect(() => {
      size = set.size;
    });
    set.add(1);
    expect(hasOne).toBe(true);
    expect(size).toBe(1);
    set.add(1);
    expect(size).toBe(1);
    set.delete(1);
    expect(hasOne).toBe(false);
    expect(size).toBe(0);
  });

  it("iterates values reactively", () => {
    const set = reactive(new Set([{ n: 1 }]));
    const first = [...set][0];
    expect(isReactive(first)).toBe(true);

    let count = 0;
    effect(() => {
      count = [...set].length;
    });
    set.add({ n: 2 });
    expect(count).toBe(2);
  });

  it("stores values raw so identity lookups work both ways", () => {
    const inner = { n: 1 };
    const proxyInner = reactive(inner);
    const set = reactive(new Set<unknown>());
    set.add(proxyInner);
    expect(set.has(inner)).toBe(true);
    expect(set.has(proxyInner)).toBe(true);
    expect(toRaw(set).has(inner)).toBe(true);
  });

  it("clear() invalidates iteration dependencies", () => {
    const set = reactive(new Set([1, 2]));
    let size = -1;
    effect(() => {
      size = set.size;
    });
    set.clear();
    expect(size).toBe(0);
  });
});

describe("reactive() collection identity", () => {
  it("returns the same proxy for the same target", () => {
    const map = new Map();
    expect(reactive(map)).toBe(reactive(map));
  });

  it("isReactive and toRaw work on collections", () => {
    const map = reactive(new Map());
    expect(isReactive(map)).toBe(true);
    expect(toRaw(map) instanceof Map).toBe(true);
  });

  it("readonly collections reject writes silently and wrap values readonly", () => {
    const map = readonly(new Map([["a", { n: 1 }]]));
    map.set("b", 2);
    expect(toRaw(map).has("b")).toBe(false);
    expect(map.size).toBe(1);
    const value = map.get("a");
    expect(isReactive(value)).toBe(false);
  });
});
