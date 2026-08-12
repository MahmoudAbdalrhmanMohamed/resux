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
    expect(source).toContain("const routePayloadRequests = new Map();");
    expect(source).toContain("const entry = { promise, reason };");
    expect(source).toContain("routePayloadRequests.set(key, entry);");
    expect(source).toContain("return await pending.promise;");
    expect(source).toContain("routePayloadRequests.delete(key);");
  });

  it("does not let stale in-flight payloads repopulate the cache after dev invalidation", () => {
    const source = getClientRuntimeSource();
    const uncachedStart = source.indexOf("async function fetchRoutePayloadUncached(routePath)");
    const uncachedEnd = source.indexOf("function applyHtmlAttrs(attrs)", uncachedStart);
    const uncachedSource = source.slice(uncachedStart, uncachedEnd);

    expect(source).toContain("let routePayloadGeneration = 0;");
    expect(source).toContain("routePayloadGeneration += 1;");
    expect(source).toContain("routePayloadRequests.clear();");
    expect(source).toContain("routePayloadFailures.clear();");
    expect(source).toContain("const generation = routePayloadGeneration;");
    expect(source).toContain("generation !== routePayloadGeneration");
    expect(source).toContain("routePayloadRequests.get(key) === entry");
    expect(uncachedSource).not.toContain("routePayloadCache.set(routePath");
  });

  it("uses one canonical route loader for prefetch and navigation with failure cooldown and recovery", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("const routePayloadFailures = new Map();");
    expect(source).toContain("const ROUTE_PREFETCH_FAILURE_COOLDOWN_MS = 5000;");
    expect(source).toContain("async function loadRoute(routePath, options = {})");
    expect(source).toContain('reason: "prefetch"');
    expect(source).toContain('reason: "navigation"');
    expect(source).toContain('pending.reason === "prefetch"');
    expect(source).toContain('return loadRoute(key, { reason: "navigation", force: true });');
    expect(source).toContain("routePayloadFailures.set(key");
  });

  it("normalizes route payload keys and keeps query while excluding hash and trailing slash", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("function normalizeRoutePayloadKey(routePath)");
    expect(source).toContain('target.pathname.replace(/\\/+$/, "")');
    expect(source).toContain("return pathname + target.search;");
    expect(source).not.toContain("return pathname + target.search + target.hash;");
  });

  it("does not route-prefetch API or framework-internal links", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("function isRouterManagedPagePath(pathname)");
    expect(source).toContain('normalized.startsWith("/api/")');
    expect(source).toContain('normalized.startsWith("/__resux/")');
    expect(source).toContain('normalized.startsWith("/_resux/")');
    expect(source).toContain('reason: "non-page-route"');
  });

  it("bounds shared route requests so they cannot remain pending forever", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("const ROUTE_PAYLOAD_TIMEOUT_MS = 30000;");
    expect(source).toContain("new AbortController()");
    expect(source).toContain("controller?.abort();");
    expect(source).toContain("clearTimeout(timeout);");
  });

  it("scans client enhancements once per page-finish lifecycle instead of repeatedly during boot", () => {
    const source = getClientRuntimeSource();
    const documentScans = source.match(/void scanClientEnhancements\(document\);/g) ?? [];

    expect(source).toContain('document.addEventListener("resux:page:finish", () => {');
    expect(documentScans).toHaveLength(1);
    expect(source).not.toContain("void scanClientEnhancements(root);");
    expect(source).not.toContain("queueMicrotask(() => {\n    void scanClientEnhancements(document);");
  });
});
