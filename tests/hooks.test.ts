import { describe, expect, it } from "vitest";
import { createResuxHooks } from "../src/core/hooks.js";

describe("resux hooks", () => {
  it("runs hooks in registration order", async () => {
    const hooks = createResuxHooks();
    const calls: string[] = [];

    hooks.hook("build:before", () => {
      calls.push("a");
    });
    hooks.hook("build:before", () => {
      calls.push("b");
    });
    await hooks.callHook("build:before", {
      appRoot: "/tmp/app",
      outDir: "/tmp/app/.resux",
      mode: "build",
    });

    expect(calls).toEqual(["a", "b"]);
  });

  it("wraps hook errors with hook name", async () => {
    const hooks = createResuxHooks();
    hooks.hook("build:before", () => {
      throw new Error("explode");
    });

    await expect(
      hooks.callHook("build:before", {
        appRoot: "/tmp/app",
        outDir: "/tmp/app/.resux",
        mode: "build",
      }),
    ).rejects.toThrow('Resux hook "build:before" failed: explode');
  });
});
