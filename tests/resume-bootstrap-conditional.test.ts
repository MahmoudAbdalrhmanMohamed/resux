import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { getResumeBootstrapSource } from "../src/runtime/resume.js";

// Pages with no deferred enhancement or Vue island targets do not need the trigger scheduling code
// (visible, idle, interaction, manual), so the bootstrap leaves it out. Pages with such targets get it.

const runtimeSrc = "data:text/javascript,globalThis.__rxProbeLoaded=(globalThis.__rxProbeLoaded||0)+1;globalThis.__RESUX_DISPATCH_RESUMED_EVENT__=(name)=>{globalThis.__rxProbeDispatched=name;};";

describe("resume bootstrap: deferred code is conditional", () => {
  it("leaves the deferred trigger code out of a plain resumable page", () => {
    const source = getResumeBootstrapSource({ eventNames: ["click", "input"] });
    expect(source).not.toContain("__rxScheduleTarget");
    expect(source).not.toContain("__rxFindInteractionBoundary");
    expect(source).not.toContain("__RESUX_ACTIVATE_DEFERRED__");
    expect(Buffer.byteLength(source)).toBeLessThan(6000);
  });

  it("keeps it when enhancements or Vue islands are deferred", () => {
    for (const options of [{ deferEnhancements: true }, { deferVueIslands: true }, { deferEnhancements: true, deferVueIslands: true }]) {
      const source = getResumeBootstrapSource({ eventNames: ["click"], ...options });
      expect(source).toContain("__rxScheduleDeferredTargets();");
      expect(source).toContain("__rxFindInteractionBoundary(event.target)");
      expect(source).toContain("__RESUX_ACTIVATE_DEFERRED__=__rxActivateManual");
    }
  });

  it("still loads the runtime and dispatches the first event on a plain page", () => {
    const source = getResumeBootstrapSource({ eventNames: ["click"], runtimeSrc });
    // Run in plain Node so the bootstrap's dynamic import() is the real one.
    const script = `
      const listeners = {};
      const button = { nodeType: 1, parentElement: null, hasAttribute: (n) => n === "data-rx-on-click", getAttribute: () => "" };
      const fakeDocument = { addEventListener: (n, l) => { listeners[n] = l; }, removeEventListener() {}, querySelectorAll: () => [] };
      new Function("document", "window", ${JSON.stringify(source)})(fakeDocument, {});
      listeners.click({ target: button, type: "click", cancelable: true, preventDefault() {}, stopPropagation() {} });
      await new Promise((resolve) => setTimeout(resolve, 150));
      console.log(JSON.stringify({ events: Object.keys(listeners), loaded: globalThis.__rxProbeLoaded, dispatched: globalThis.__rxProbeDispatched }));
    `;
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
    expect(JSON.parse(out.trim())).toEqual({ events: ["click"], loaded: 1, dispatched: "click" });
  });
});
