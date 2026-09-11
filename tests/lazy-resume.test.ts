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
