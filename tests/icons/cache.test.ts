import { describe, it, expect, vi } from "vitest";
import { IconCacheManager } from "../../src/icons/cache.js";
import type { IconData } from "../../src/icons/types.js";

describe("icons cache manager", () => {
  it("stores and retrieves items correctly", () => {
    const cache = new IconCacheManager({ maxEntries: 3 });
    const dummy: IconData = { path: "M0 0h24v24H0z", viewBox: "0 0 24 24" };

    cache.set("a", dummy);
    expect(cache.get("a")).toBe(dummy);
    expect(cache.size).toBe(1);
  });

  it("evicts oldest accessed items when exceeding maxEntries", () => {
    const cache = new IconCacheManager({ maxEntries: 2 });
    const dummyA: IconData = { path: "A" };
    const dummyB: IconData = { path: "B" };
    const dummyC: IconData = { path: "C" };

    cache.set("a", dummyA);
    cache.set("b", dummyB);
    // Access "a" to make it more recently used
    expect(cache.get("a")).toBe(dummyA);

    // Insert "c", should evict "b"
    cache.set("c", dummyC);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(dummyA);
    expect(cache.get("c")).toBe(dummyC);
    expect(cache.size).toBe(2);
  });

  it("deduplicates in-flight promises", async () => {
    const cache = new IconCacheManager();
    const promise = Promise.resolve({ path: "M0 0" } as IconData);

    cache.setPending("test-key", promise);
    expect(cache.getPending("test-key")).toBe(promise);

    cache.deletePending("test-key");
    expect(cache.getPending("test-key")).toBeUndefined();
  });

  it("limits concurrency and processes queue", async () => {
    const cache = new IconCacheManager({ maxInFlight: 2, maxQueue: 10 });
    let running = 0;
    let maxObserved = 0;

    const runTask = () =>
      cache.runWithSlot(async () => {
        running += 1;
        maxObserved = Math.max(maxObserved, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running -= 1;
        return "done";
      });

    const results = await Promise.all([runTask(), runTask(), runTask(), runTask()]);
    expect(results).toEqual(["done", "done", "done", "done"]);
    expect(maxObserved).toBeLessThanOrEqual(2);
  });
});
