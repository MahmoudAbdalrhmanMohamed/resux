import { describe, expect, it, vi } from "vitest";
import { createResumeHandlerRegistry } from "../src/runtime/resume.js";

describe("lazy resumable handlers", () => {
  it("loads an exact handler only on first use and reuses it", async () => {
    const load = vi.fn(async () => ({ increment: (value: unknown) => Number(value) + 1 }));
    const registry = createResumeHandlerRegistry([
      { id: "counter:increment", module: "/counter.increment.js", exportName: "increment", load },
    ]);

    expect(load).not.toHaveBeenCalled();
    expect(await registry.run("counter:increment", 2)).toBe(3);
    expect(await registry.run("counter:increment", 4)).toBe(5);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent module loads", async () => {
    let resolveModule!: (module: Record<string, unknown>) => void;
    const load = vi.fn(() => new Promise<Record<string, unknown>>((resolve) => {
      resolveModule = resolve;
    }));
    const registry = createResumeHandlerRegistry([
      { id: "menu:open", module: "/menu.js", exportName: "open", load },
    ]);

    const first = registry.load("menu:open");
    const second = registry.load("menu:open");
    resolveModule({ open: () => "ok" });
    expect(await first).toBe(await second);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("fails clearly for missing handlers or exports", async () => {
    const registry = createResumeHandlerRegistry([
      { id: "bad", module: "/bad.js", exportName: "missing", load: async () => ({}) },
    ]);
    await expect(registry.load("unknown")).rejects.toThrow("Unknown resumable handler unknown");
    await expect(registry.load("bad")).rejects.toThrow("expected function export missing");
  });
});
