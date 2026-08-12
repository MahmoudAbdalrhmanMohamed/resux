import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs";

describe("route payload loader contract", () => {
  it("keeps prefetch and navigation on the same cached loader", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain("async function loadRoute(routePath, options = {})");
    expect(source).toContain('reason: "prefetch"');
    expect(source).toContain('reason: "navigation"');
    expect(source).toContain("routePayloadCache.has(key)");
    expect(source).toContain("return await pending.promise");
  });

  it("cools down speculative failures but lets navigation recover", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain("ROUTE_PREFETCH_FAILURE_COOLDOWN_MS");
    expect(source).toContain("isRoutePrefetchCoolingDown(key)");
    expect(source).toContain('pending.reason === "prefetch"');
    expect(source).toContain('loadRoute(key, { reason: "navigation", force: true })');
  });

  it("normalizes cache identity and excludes non-page endpoints", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain("function normalizeRoutePayloadKey(routePath)");
    expect(source).toContain("return pathname + target.search;");
    expect(source).toContain('normalized.startsWith("/api/")');
    expect(source).toContain('normalized.startsWith("/__resux/")');
    expect(source).toContain('normalized.startsWith("/_resux/")');
  });

  it("preserves managed-media guards before generic route filtering", () => {
    const source = getClientRuntimeSource();
    const mediaGuard = source.indexOf("if (isManagedMediaAssetPath(target.pathname))");
    const pageFilter = source.indexOf("if (!isRouterManagedPagePath(target.pathname))", mediaGuard);
    expect(mediaGuard).toBeGreaterThan(-1);
    expect(pageFilter).toBeGreaterThan(mediaGuard);
  });
});
