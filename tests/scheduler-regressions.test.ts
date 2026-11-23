import { describe, expect, it, vi } from "vitest";
import { nextTick, ref, watch } from "resuxjs/reactivity";

describe("scheduler flush error handling", () => {
  it("does not raise an unhandled rejection when a flushed watcher throws", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      const source = ref(1);
      watch(source, () => {
        throw new Error("watcher failure");
      });
      source.value = 2;
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).toEqual([]);
    } finally {
      process.removeListener("unhandledRejection", onUnhandled);
    }
  });

  it("still surfaces flush errors to nextTick awaiters", async () => {
    const source = ref(1);
    watch(source, () => {
      throw new Error("flush failure");
    });
    source.value = 2;
    await expect(nextTick()).rejects.toThrow("flush failure");
  });

  it("continues draining later jobs after an error", async () => {
    const source = ref(1);
    const after = vi.fn();
    watch(source, () => {
      throw new Error("first job failure");
    });
    watch(source, () => after());
    source.value = 2;
    await expect(nextTick()).rejects.toThrow("first job failure");
    expect(after).toHaveBeenCalledTimes(1);
  });
});
