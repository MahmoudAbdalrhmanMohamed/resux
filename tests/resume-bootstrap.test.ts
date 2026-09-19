import { describe, expect, it } from "vitest";
import { getResumeBootstrapSource } from "../src/runtime/resume.js";

describe("resume-first interaction bootstrap", () => {
  it("registers only declared resumable event types and imports the runtime lazily", () => {
    const source = getResumeBootstrapSource({
      eventNames: ["click", "submit", "click", "bad event"],
    });

    expect(source).toContain('const __rxEvents=["click","submit"]');
    expect(source).toContain('const __rxRuntime="/__resux/runtime-client.mjs"');
    expect(source).toContain("import(__rxRuntime)");
    expect(source).toContain('__RESUX_DISPATCH_RESUMED_EVENT__');
    expect(source).not.toContain("bad event");
  });

  it("preserves synchronous prevent and stop semantics before the runtime arrives", () => {
    const source = getResumeBootstrapSource({ eventNames: ["submit"] });

    expect(source).toContain('name==="submit" || mods.includes("prevent")');
    expect(source).toContain('mods.includes("passive")');
    expect(source).toContain('mods.includes("stop")');
  });

  it("allows a custom runtime source without interpolating event payload values", () => {
    const source = getResumeBootstrapSource({
      eventNames: ["keydown"],
      runtimeSrc: "/assets/resux-runtime.mjs",
    });

    expect(source).toContain('const __rxRuntime="/assets/resux-runtime.mjs"');
    expect(source).toContain('const __rxEvents=["keydown"]');
  });
});
