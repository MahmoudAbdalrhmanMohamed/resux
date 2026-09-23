import { describe, expect, it } from "vitest";
import {
  getResumeBootstrapSource,
  RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH,
  RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES,
} from "../src/runtime/resume.js";

describe("resume-first interaction bootstrap", () => {
  it("registers only declared resumable event types and imports the runtime lazily", () => {
    const source = getResumeBootstrapSource({
      eventNames: ["click", "submit", "click", "bad event"],
    });

    expect(source).toContain('const __rxEvents=["click","submit"]');
    expect(source).toContain('const __rxRuntime="/__resux/runtime-client.mjs"');
    expect(source).toContain("const request=__rxRuntimeRequest();");
    expect(source).toContain("import(request)");
    expect(source).toContain('__RESUX_DISPATCH_RESUMED_EVENT__');
    expect(source).not.toContain("bad event");
  });

  it("preserves synchronous prevent and stop semantics before the runtime arrives", () => {
    const source = getResumeBootstrapSource({ eventNames: ["submit"] });

    expect(source).toContain('name==="submit" || mods.includes("prevent")');
    expect(source).toContain('mods.includes("passive")');
    expect(source).toContain('mods.includes("stop")');
    expect(source).toContain("const useCapture=__rxCapture(name);");
    expect(source).toContain('name==="focus"');
    expect(source).toContain('name==="error"');
  });

  it("checks conditional modifiers before cancelling native behavior or loading", () => {
    const source = getResumeBootstrapSource({ eventNames: ["keydown", "click"] });

    expect(source).toContain('mods.includes("self") && event.target!==target');
    expect(source).toContain('mods.includes("exact")');
    expect(source).toContain('__rxKeyMatches(event,mods)');
    expect(source).toContain('__rxMouseMatches(event,mods)');
    expect(source.indexOf("if(!__rxMatches(event,mods,name,target)) return;"))
      .toBeLessThan(source.indexOf("event.preventDefault();"));
    expect(source.indexOf("if(!__rxMatches(event,mods,name,target)) return;"))
      .toBeLessThan(source.indexOf("void __rxLoad().then(()=>{"));
  });

  it("allows a later interaction to retry after a rejected runtime import", () => {
    const source = getResumeBootstrapSource({ eventNames: ["click"] });

    expect(source).toContain("__rxRuntimePromise=undefined;");
    expect(source).toContain("__rxRuntimeAttempt+=1;");
    expect(source).toContain('"rx_retry="+__rxRuntimeAttempt');
    expect(source).toContain("}).catch((error)=>{");
    expect(source).toContain("}).catch(()=>{});");
  });

  it("matches strict runtime exact-modifier semantics for event classes without system keys", () => {
    const source = getResumeBootstrapSource({ eventNames: ["submit"] });

    expect(source).toContain('if(event.ctrlKey!==expected.has("ctrl")) return false;');
    expect(source).toContain('if(event.shiftKey!==expected.has("shift")) return false;');
    expect(source).not.toContain('Boolean(event.ctrlKey)!==expected.has("ctrl")');
  });

  it("re-arms deferred targets after a failed runtime import and activates the original target", () => {
    const source = getResumeBootstrapSource({
      eventNames: [],
      deferEnhancements: true,
      deferVueIslands: true,
    });

    expect(source).toContain(".then(()=>__rxActivateTarget(target))");
    expect(source).toContain("if(!disposed && __rxActive && target.isConnected) arm();");
    expect(source).toContain("__RESUX_ACTIVATE_DEFERRED__=__rxActivateManual");
  });

  it("bounds serialized event metadata used by the inline bootstrap", () => {
    const maxNames = Array.from(
      { length: RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES },
      (_, index) => `event-${index}`,
    );
    expect(() => getResumeBootstrapSource({ eventNames: maxNames })).not.toThrow();

    expect(() => getResumeBootstrapSource({
      eventNames: [...maxNames, "one-more-event"],
    })).toThrow("at most");

    expect(() => getResumeBootstrapSource({
      eventNames: ["x".repeat(RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH + 1)],
    })).toThrow("at most");
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
