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

  it("shares an in-flight route payload request across prefetch and navigation", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("const routePayloadRequests = new Map();");
    expect(source).toContain("routePayloadRequests.has(routePath)");
    expect(source).toContain("routePayloadRequests.set(routePath, request);");
    expect(source).toContain("routePayloadRequests.delete(routePath);");
    expect(source).toContain("return routePayloadRequests.get(routePath);");
  });

  it("does not let stale in-flight payloads repopulate the cache after dev invalidation", () => {
    const source = getClientRuntimeSource();
    const uncachedStart = source.indexOf("async function fetchRoutePayloadUncached(routePath)");
    const uncachedEnd = source.indexOf("function applyHtmlAttrs(attrs)", uncachedStart);
    const uncachedSource = source.slice(uncachedStart, uncachedEnd);

    expect(source).toContain("let routePayloadGeneration = 0;");
    expect(source).toContain("routePayloadGeneration += 1;");
    expect(source).toContain("routePayloadRequests.clear();");
    expect(source).toContain("const generation = routePayloadGeneration;");
    expect(source).toContain("generation !== routePayloadGeneration");
    expect(source).toContain("routePayloadRequests.get(routePath) === request");
    expect(uncachedSource).not.toContain("routePayloadCache.set(routePath");
  });
});
