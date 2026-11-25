import { describe, expect, it } from "vitest";
import { resolveVercelNodeRuntime } from "../src/deploy/vercel.js";

// Vercel retired Node 18 (Sep 2025) and Node 20 (Oct 2026): the only
// available function runtimes are nodejs22.x, nodejs24.x and nodejs26.x.
// https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
describe("resolveVercelNodeRuntime", () => {
  it("maps retired system majors to the oldest available runtime", () => {
    expect(resolveVercelNodeRuntime("16.20.2")).toBe("nodejs22.x");
    expect(resolveVercelNodeRuntime("18.20.4")).toBe("nodejs22.x");
    expect(resolveVercelNodeRuntime("20.19.0")).toBe("nodejs22.x");
  });

  it("maps supported system majors to their matching runtime", () => {
    expect(resolveVercelNodeRuntime("22.11.0")).toBe("nodejs22.x");
    expect(resolveVercelNodeRuntime("24.0.0")).toBe("nodejs24.x");
    expect(resolveVercelNodeRuntime("26.1.5")).toBe("nodejs26.x");
  });

  it("clamps newer-than-known majors to the newest available runtime", () => {
    expect(resolveVercelNodeRuntime("28.0.0")).toBe("nodejs26.x");
  });

  it("falls back to the oldest available runtime for unparsable versions", () => {
    expect(resolveVercelNodeRuntime("v20.1.0")).toBe("nodejs22.x");
    expect(resolveVercelNodeRuntime("")).toBe("nodejs22.x");
  });
});
