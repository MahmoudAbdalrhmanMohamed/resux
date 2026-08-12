import { readFile, writeFile } from "node:fs/promises";

const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
const testPath = new URL("../tests/runtime-performance-regressions.test.ts", import.meta.url);

let runtime = await readFile(runtimePath, "utf8");

const constantsOld = `const routePayloadCache = new Map();
const routePayloadRequests = new Map();
let routePayloadGeneration = 0;`;
const constantsNew = `const routePayloadCache = new Map();
const routePayloadRequests = new Map();
const routePayloadFailures = new Map();
const ROUTE_PREFETCH_FAILURE_COOLDOWN_MS = 5000;
const ROUTE_PAYLOAD_TIMEOUT_MS = 30000;
let routePayloadGeneration = 0;`;
if (!runtime.includes(constantsOld)) throw new Error("route payload constants anchor not found");
runtime = runtime.replace(constantsOld, constantsNew);

const resolverOld = `  if (target.origin !== location.origin) {
    return { url: null, reason: "external-origin" };
  }
  return { url: target, reason: null };
}`;
const resolverNew = `  if (target.origin !== location.origin) {
    return { url: null, reason: "external-origin" };
  }
  if (!isRouterManagedPagePath(target.pathname)) {
    return { url: null, reason: "non-page-route" };
  }
  return { url: target, reason: null };
}`;
if (!runtime.includes(resolverOld)) throw new Error("same-origin resolver anchor not found");
runtime = runtime.replace(resolverOld, resolverNew);

const navStartOld = `async function navigateTo(target, options = {}) {
  const nextUrl = new URL(target, location.href);
  const routePath = nextUrl.pathname + nextUrl.search;
  if (isManagedMediaAssetPath(nextUrl.pathname)) {`;
const navStartNew = `async function navigateTo(target, options = {}) {
  const nextUrl = new URL(target, location.href);
  const routePath = normalizeRoutePayloadKey(nextUrl.pathname + nextUrl.search);
  if (!isRouterManagedPagePath(nextUrl.pathname)) {
    location.assign(nextUrl.href);
    return;
  }
  if (isManagedMediaAssetPath(nextUrl.pathname)) {`;
if (!runtime.includes(navStartOld)) throw new Error("navigateTo start anchor not found");
runtime = runtime.replace(navStartOld, navStartNew);

const navFetchOld = `    const result = await fetchRoutePayload(routePath);`;
const navFetchNew = `    const result = await loadRoute(routePath, {
      reason: "navigation",
      force: options.force === true
    });`;
if (!runtime.includes(navFetchOld)) throw new Error("navigation route loader anchor not found");
runtime = runtime.replace(navFetchOld, navFetchNew);

const devOld = `async function applyDevUpdate(payload = {}) {
  devImportRevision = Number(payload.revision ?? Date.now());
  routePayloadGeneration += 1;
  routePayloadCache.clear();
  routePayloadRequests.clear();
  await hotUpdateActiveScopes();
}`;
const devNew = `async function applyDevUpdate(payload = {}) {
  devImportRevision = Number(payload.revision ?? Date.now());
  invalidateAllRoutePayloads();
  await hotUpdateActiveScopes();
}`;
if (!runtime.includes(devOld)) throw new Error("dev invalidation anchor not found");
runtime = runtime.replace(devOld, devNew);

const blockStart = runtime.indexOf("async function prefetchNavigationTarget(event) {");
const blockEnd = runtime.indexOf("function applyHtmlAttrs(attrs) {", blockStart);
if (blockStart < 0 || blockEnd < 0) throw new Error("route loader block anchors not found");

const loaderBlock = `async function prefetchNavigationTarget(event) {
  const anchor = event.target && event.target.closest
    ? event.target.closest("a[href]")
    : null;
  const routePath = getPrefetchPath(anchor, event.target);
  if (!routePath || routePayloadCache.has(routePath) || routePayloadRequests.has(routePath)) {
    return;
  }
  if (isRoutePrefetchCoolingDown(routePath)) {
    return;
  }

  try {
    await loadRoute(routePath, { reason: "prefetch" });
  } catch (error) {
    logManagedMediaDebug("router-prefetch-failed", {
      path: routePath,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function getPrefetchPath(anchor, eventTarget = null) {
  if (!anchor) {
    return null;
  }
  const resolution = resolveSameOriginAnchorTarget(anchor);
  if (!resolution.url) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: resolution.reason,
      href: anchor.getAttribute("href") || ""
    });
    return null;
  }
  const target = resolution.url;
  if (isManagedMediaAssetPath(target.pathname)) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: "media-static-path",
      href: target.href
    });
    return null;
  }
  if (shouldIgnoreNavigationTarget(eventTarget, anchor)) {
    logManagedMediaDebug("router-prefetch-ignore", {
      reason: "ignored-event-target",
      href: target.href
    });
    return null;
  }

  const routePath = normalizeRoutePayloadKey(target.pathname + target.search);
  if (routePath === normalizeRoutePayloadKey(location.pathname + location.search)) {
    return null;
  }
  return routePath;
}

function isRouterManagedPagePath(pathname) {
  const normalized = String(pathname || "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return !(
    normalized === "/api"
    || normalized.startsWith("/api/")
    || normalized === "/__resux"
    || normalized.startsWith("/__resux/")
    || normalized === "/_resux"
    || normalized.startsWith("/_resux/")
  );
}

function normalizeRoutePayloadKey(routePath) {
  const base = typeof location !== "undefined" && location.href
    ? location.href
    : "http://resux.local/";
  const target = new URL(String(routePath || "/"), base);
  const pathname = target.pathname === "/"
    ? "/"
    : target.pathname.replace(/\\/+$/, "") || "/";
  return pathname + target.search;
}

function isRoutePrefetchCoolingDown(routePath, now = Date.now()) {
  const key = normalizeRoutePayloadKey(routePath);
  const failure = routePayloadFailures.get(key);
  if (!failure) {
    return false;
  }
  if ((now - failure.failedAt) >= ROUTE_PREFETCH_FAILURE_COOLDOWN_MS) {
    routePayloadFailures.delete(key);
    return false;
  }
  return true;
}

function invalidateRoutePayload(routePath) {
  const key = normalizeRoutePayloadKey(routePath);
  routePayloadCache.delete(key);
  routePayloadFailures.delete(key);
}

function invalidateAllRoutePayloads() {
  routePayloadGeneration += 1;
  routePayloadCache.clear();
  routePayloadRequests.clear();
  routePayloadFailures.clear();
}

async function loadRoute(routePath, options = {}) {
  const key = normalizeRoutePayloadKey(routePath);
  const reason = options.reason === "prefetch" ? "prefetch" : "navigation";
  const force = options.force === true;

  if (force) {
    invalidateRoutePayload(key);
  } else if (routePayloadCache.has(key)) {
    return routePayloadCache.get(key);
  }

  if (reason === "prefetch" && !force && isRoutePrefetchCoolingDown(key)) {
    const failure = routePayloadFailures.get(key);
    throw failure?.error ?? new Error("Route prefetch is cooling down after a recent failure.");
  }

  const pending = routePayloadRequests.get(key);
  if (pending) {
    try {
      return await pending.promise;
    } catch (error) {
      if (reason === "navigation" && pending.reason === "prefetch") {
        if (routePayloadRequests.get(key) === pending) {
          routePayloadRequests.delete(key);
        }
        routePayloadFailures.delete(key);
        return loadRoute(key, { reason: "navigation", force: true });
      }
      throw error;
    }
  }

  const generation = routePayloadGeneration;
  const promise = fetchRoutePayloadUncached(key);
  const entry = { promise, reason };
  routePayloadRequests.set(key, entry);

  try {
    const result = await promise;
    if (generation !== routePayloadGeneration) {
      if (routePayloadRequests.get(key) === entry) {
        routePayloadRequests.delete(key);
      }
      return loadRoute(key, { reason, force: false });
    }
    routePayloadFailures.delete(key);
    routePayloadCache.set(key, result);
    return result;
  } catch (error) {
    routePayloadFailures.set(key, {
      status: "failed",
      error,
      failedAt: Date.now()
    });
    throw error;
  } finally {
    if (routePayloadRequests.get(key) === entry) {
      routePayloadRequests.delete(key);
    }
  }
}

async function fetchRoutePayload(routePath) {
  return loadRoute(routePath, { reason: "navigation" });
}

async function fetchRoutePayloadUncached(routePath) {
  const isStatic = typeof window !== "undefined" && window["__RESUX_STATIC__"];
  const url = isStatic
    ? "/__resux/route/payloads" + (routePath === "/" ? "/index.json" : routePath.replace(/\\/$/, "") + ".json")
    : "/__resux/route?path=" + encodeURIComponent(routePath);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = setTimeout(() => {
    controller?.abort();
  }, ROUTE_PAYLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      },
      ...(controller ? { signal: controller.signal } : {})
    });

    if (!response.ok) {
      throw new Error("Route payload request failed: " + response.status);
    }

    return await response.json();
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error("Route payload request timed out after " + ROUTE_PAYLOAD_TIMEOUT_MS + "ms.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

`;
runtime = runtime.slice(0, blockStart) + loaderBlock + runtime.slice(blockEnd);

await writeFile(runtimePath, runtime, "utf8");

let tests = await readFile(testPath, "utf8");
const oldAssertions = `    expect(source).toContain("routePayloadRequests.has(routePath)");
    expect(source).toContain("routePayloadRequests.set(routePath, request);");
    expect(source).toContain("routePayloadRequests.delete(routePath);");
    expect(source).toContain("return routePayloadRequests.get(routePath);");`;
const newAssertions = `    expect(source).toContain("const routePayloadRequests = new Map();");
    expect(source).toContain("const entry = { promise, reason };");
    expect(source).toContain("routePayloadRequests.set(key, entry);");
    expect(source).toContain("return await pending.promise;");
    expect(source).toContain("routePayloadRequests.delete(key);");`;
if (!tests.includes(oldAssertions)) throw new Error("runtime performance request assertions anchor not found");
tests = tests.replace(oldAssertions, newAssertions);

const staleOld = `    expect(source).toContain("routePayloadGeneration += 1;");
    expect(source).toContain("routePayloadRequests.clear();");
    expect(source).toContain("const generation = routePayloadGeneration;");
    expect(source).toContain("generation !== routePayloadGeneration");
    expect(source).toContain("routePayloadRequests.get(routePath) === request");`;
const staleNew = `    expect(source).toContain("routePayloadGeneration += 1;");
    expect(source).toContain("routePayloadRequests.clear();");
    expect(source).toContain("routePayloadFailures.clear();");
    expect(source).toContain("const generation = routePayloadGeneration;");
    expect(source).toContain("generation !== routePayloadGeneration");
    expect(source).toContain("routePayloadRequests.get(key) === entry");`;
if (!tests.includes(staleOld)) throw new Error("runtime performance stale assertions anchor not found");
tests = tests.replace(staleOld, staleNew);

const close = `  it("scans client enhancements once per page-finish lifecycle instead of repeatedly during boot", () => {`;
const extra = `  it("uses one canonical route loader for prefetch and navigation with failure cooldown and recovery", () => {
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
    expect(source).toContain('target.pathname.replace(/\\\\/+$/, "")');
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

${close}`;
if (!tests.includes(close)) throw new Error("runtime performance insertion anchor not found");
tests = tests.replace(close, extra);
await writeFile(testPath, tests, "utf8");

console.log("Patched shared route loader, canonical cache keys, failure cooldown, navigation recovery, and timeout handling.");
