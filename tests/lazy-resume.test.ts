import { describe, expect, it, vi } from "vitest";
import {
  createResumeHandlerRegistry,
  ResuxResumeLoadTimeoutError,
} from "../src/runtime/resume.js";

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

  it("invalidates cached handlers when a registration is replaced", async () => {
    const oldLoad = vi.fn(async () => ({ open: () => "old" }));
    const newLoad = vi.fn(async () => ({ open: () => "new" }));
    const registry = createResumeHandlerRegistry([
      { id: "menu:open", module: "/menu-old.js", exportName: "open", load: oldLoad },
    ]);

    expect(await registry.run("menu:open")).toBe("old");
    registry.register({
      id: "menu:open",
      module: "/menu-new.js",
      exportName: "open",
      load: newLoad,
    });

    expect(await registry.run("menu:open")).toBe("new");
    expect(oldLoad).toHaveBeenCalledTimes(1);
    expect(newLoad).toHaveBeenCalledTimes(1);
  });

  it("does not let an old in-flight load overwrite a replacement", async () => {
    let resolveOld!: (module: Record<string, unknown>) => void;
    let resolveNew!: (module: Record<string, unknown>) => void;
    const registry = createResumeHandlerRegistry([
      {
        id: "menu:open",
        module: "/menu-old.js",
        exportName: "open",
        load: () => new Promise<Record<string, unknown>>((resolve) => {
          resolveOld = resolve;
        }),
      },
    ]);

    const oldLoad = registry.load("menu:open");
    registry.register({
      id: "menu:open",
      module: "/menu-new.js",
      exportName: "open",
      load: () => new Promise<Record<string, unknown>>((resolve) => {
        resolveNew = resolve;
      }),
    });
    const newLoad = registry.load("menu:open");

    resolveOld({ open: () => "old" });
    expect((await oldLoad)()).toBe("old");
    resolveNew({ open: () => "new" });
    expect((await newLoad)()).toBe("new");
    expect(await registry.run("menu:open")).toBe("new");
  });

  it("invalidates an old in-flight load when the same registration object is replayed", async () => {
    const resolvers: Array<(module: Record<string, unknown>) => void> = [];
    const entry = {
      id: "menu:open",
      module: "/menu.js",
      exportName: "open",
      load: () => new Promise<Record<string, unknown>>((resolve) => {
        resolvers.push(resolve);
      }),
    };
    const registry = createResumeHandlerRegistry([entry]);

    const oldLoad = registry.load("menu:open");
    registry.register(entry);
    const newLoad = registry.load("menu:open");

    resolvers[1]?.({ open: () => "new" });
    expect((await newLoad)()).toBe("new");
    resolvers[0]?.({ open: () => "old" });
    expect((await oldLoad)()).toBe("old");
    expect(await registry.run("menu:open")).toBe("new");
  });

  it("snapshots registration metadata before a pending load can observe later mutation", async () => {
    let resolveOld!: (module: Record<string, unknown>) => void;
    const entry = {
      id: "menu:open",
      module: "/menu-old.js",
      exportName: "openOld",
      load: () => new Promise<Record<string, unknown>>((resolve) => {
        resolveOld = resolve;
      }),
    };
    const registry = createResumeHandlerRegistry([entry]);

    const oldLoad = registry.load("menu:open");
    entry.module = "/menu-new.js";
    entry.exportName = "openNew";
    entry.load = async () => ({ openNew: () => "new" });
    registry.register(entry);

    resolveOld({ openOld: () => "old" });
    expect((await oldLoad)()).toBe("old");
    expect(await registry.run("menu:open")).toBe("new");
  });

  it("does not publish an obsolete pending load after reentrant replacement", async () => {
    let resolveOld!: (module: Record<string, unknown>) => void;
    const registry = createResumeHandlerRegistry();
    const newLoad = vi.fn(async () => ({ open: () => "new" }));
    const replacement = {
      id: "menu:open",
      module: "/menu-new.js",
      exportName: "open",
      load: newLoad,
    };

    registry.register({
      id: "menu:open",
      module: "/menu-old.js",
      exportName: "open",
      load: () => new Promise<Record<string, unknown>>((resolve) => {
        resolveOld = resolve;
        registry.register(replacement);
      }),
    });

    const oldLoad = registry.load("menu:open");
    const newHandler = registry.load("menu:open");
    resolveOld({ open: () => "old" });

    expect(newLoad).toHaveBeenCalledTimes(1);
    expect((await oldLoad)()).toBe("old");
    expect((await newHandler)()).toBe("new");
    expect(await registry.run("menu:open")).toBe("new");
  });

  it("preloads a handler without executing it", async () => {
    const handler = vi.fn(() => "ran");
    const load = vi.fn(async () => ({ open: handler }));
    const registry = createResumeHandlerRegistry([
      { id: "menu:open", module: "/menu.js", exportName: "open", load },
    ]);

    await registry.preload("menu:open");
    expect(load).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();

    expect(await registry.run("menu:open")).toBe("ran");
    expect(load).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("bounds a stalled handler load and aborts cooperative loaders", async () => {
    vi.useFakeTimers();
    try {
      let observedSignal: AbortSignal | undefined;
      const registry = createResumeHandlerRegistry([
        {
          id: "slow:open",
          module: "/slow.js",
          exportName: "open",
          load: ({ signal } = { signal: new AbortController().signal }) => {
            observedSignal = signal;
            return new Promise<Record<string, unknown>>(() => {});
          },
        },
      ], { loadTimeoutMs: 25 });

      const loadPromise = registry.load("slow:open");
      const rejection = expect(loadPromise).rejects.toMatchObject({
        name: "ResuxResumeLoadTimeoutError",
        handlerId: "slow:open",
        timeoutMs: 25,
      });

      await vi.advanceTimersByTimeAsync(25);
      await rejection;
      expect(observedSignal?.aborted).toBe(true);
      expect(observedSignal?.reason).toBeInstanceOf(ResuxResumeLoadTimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries cleanly after a timeout and ignores the late obsolete module", async () => {
    vi.useFakeTimers();
    try {
      const resolvers: Array<(module: Record<string, unknown>) => void> = [];
      const registry = createResumeHandlerRegistry([
        {
          id: "menu:open",
          module: "/menu.js",
          exportName: "open",
          load: () => new Promise<Record<string, unknown>>((resolve) => {
            resolvers.push(resolve);
          }),
        },
      ], { loadTimeoutMs: 10 });

      const first = registry.load("menu:open");
      const firstRejection = expect(first).rejects.toBeInstanceOf(ResuxResumeLoadTimeoutError);
      await vi.advanceTimersByTimeAsync(10);
      await firstRejection;

      const second = registry.load("menu:open");
      await Promise.resolve();
      expect(resolvers).toHaveLength(2);
      resolvers[1]?.({ open: () => "new" });
      expect((await second)()).toBe("new");

      resolvers[0]?.({ open: () => "old" });
      await Promise.resolve();
      expect(await registry.run("menu:open")).toBe("new");
    } finally {
      vi.useRealTimers();
    }
  });

  it("can explicitly disable the load deadline", async () => {
    vi.useFakeTimers();
    try {
      let resolveModule!: (module: Record<string, unknown>) => void;
      const registry = createResumeHandlerRegistry([
        {
          id: "slow:open",
          module: "/slow.js",
          exportName: "open",
          load: () => new Promise<Record<string, unknown>>((resolve) => {
            resolveModule = resolve;
          }),
        },
      ], { loadTimeoutMs: 0 });

      const pending = registry.load("slow:open");
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(60_000);
      resolveModule({ open: () => "ok" });
      expect((await pending)()).toBe("ok");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects invalid load deadlines", () => {
    expect(() => createResumeHandlerRegistry([], { loadTimeoutMs: -1 })).toThrow(
      "loadTimeoutMs must be a finite non-negative number",
    );
    expect(() => createResumeHandlerRegistry([], { loadTimeoutMs: Number.NaN })).toThrow(
      "loadTimeoutMs must be a finite non-negative number",
    );
  });

  it("fails clearly for invalid registrations, missing handlers, or missing exports", async () => {
    const registry = createResumeHandlerRegistry();
    expect(() => registry.register({
      id: "",
      module: "/bad.js",
      exportName: "run",
      load: async () => ({ run: () => undefined }),
    })).toThrow("Resume handler id must not be empty");
    expect(() => registry.register({
      id: "bad",
      module: "/bad.js",
      exportName: "",
      load: async () => ({ run: () => undefined }),
    })).toThrow("must declare an export name");

    registry.register({ id: "bad", module: "/bad.js", exportName: "missing", load: async () => ({}) });
    await expect(registry.load("unknown")).rejects.toThrow("Unknown resumable handler unknown");
    await expect(registry.load("bad")).rejects.toThrow("expected function export missing");
  });

  it("rejects inherited function names that are not module exports", async () => {
    const registry = createResumeHandlerRegistry([
      { id: "bad", module: "/bad.js", exportName: "constructor", load: async () => ({}) },
    ]);

    await expect(registry.load("bad")).rejects.toThrow("expected function export constructor");
  });
});
