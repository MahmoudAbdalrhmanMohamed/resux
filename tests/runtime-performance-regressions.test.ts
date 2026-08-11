import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "../src/runtime/index.js";

describe("runtime performance regressions", () => {
  it("registers resumable event delegates from rendered DOM instead of an eager fixed event set", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("registerDelegatedEventsFromDom(document);");
    expect(source).toContain('if (!eventName || eventName === "click")');
    expect(source).not.toContain('for (const eventName of ["input", "change", "submit", "keydown", "keyup", "keypress", "mousedown", "mouseup", "blur", "focusout"])');
    expect(source).not.toContain('for (const eventName of ["load", "error", "loadstart", "loadedmetadata", "loadeddata", "canplay", "lazy-load-start", "lazy-load-complete"])');
  });

  it("preserves capture mode for non-bubbling resumable media events", () => {
    const source = getClientRuntimeSource();

    for (const eventName of [
      "loadstart",
      "loadedmetadata",
      "loadeddata",
      "canplay",
      "lazy-load-start",
      "lazy-load-complete",
    ]) {
      expect(source).toContain(`eventName === "${eventName}"`);
    }
  });
});
