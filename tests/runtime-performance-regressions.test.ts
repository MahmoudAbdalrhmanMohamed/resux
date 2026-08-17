import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "../src/runtime/index.js";

async function waitForClientText(window: Window, expected: string) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (window.document.querySelector("[data-rx-text='s0:b0']")?.textContent === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for client text: ${expected}`);
}

async function waitForClientRoute(expected: string) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if ((globalThis as any).__RESUX__?.route?.path === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for client route: ${expected}`);
}

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

  it("hydrates i18n from public route payload config without module side effects", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain("function useClientI18n(routeOverride)");
    expect(source).toContain("runtimeConfig?.public?.i18n");
    expect(source).toContain("globalThis.__RESUX_USE_I18N__ = () => useClientI18n()");
    expect(source).toContain("return useClientI18n(route);");
    expect(source).toContain("return useClientI18n(route).localePath;");
    expect(source).toContain("return useClientI18n(route).switchLocalePath;");
    expect(source).toContain("return useClientI18n().t(key, params);");
    expect(source).toContain("readClientTranslation(config.messages, locale.value, key)");
    expect(source).toContain("createClientRouter().push(buildClientLocalePath");
  });

  it("keeps a preserved i18n scope in sync through replace, push, back, and forward history", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-i18n-history-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "layout-handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${Date.now()}-${Math.random()}`;
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(runtimeImportUrl)};
const __template = [{ type: "interpolation", expression: "locale.value + ':' + dir.value", bindingId: "b0" }];
async function script(ctx) {
  const { locale, dir } = ctx.useI18n();
  function refresh() {}
  return { locale, dir, refresh };
}
export default createClientComponent({ id: "m0", name: "LocaleLayout", file: "LocaleLayout.vue", script, template: __template, handlers: ["refresh"] });
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/en" });
    const i18n = {
      locales: [
        { code: "en", dir: "ltr" },
        { code: "ar", dir: "rtl" },
      ],
      defaultLocale: "en",
      fallbackLocale: "en",
      strategy: "prefix",
      messages: {},
    };
    const modules = { m0: pathToFileURL(handlerFile).href };
    window.document.body.innerHTML = `
      <div id="__resux">
        <div data-rx-layout="default">
          <button id="refresh-locale" data-rx-on-click="s0:m0:refresh">Refresh locale</button>
          <span data-rx-text="s0:b0">en:ltr</span>
          <main data-rx-page><p>English</p></main>
        </div>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        const routePath = decodeURIComponent(request.searchParams.get("path") ?? "/en");
        const isArabic = routePath.startsWith("/ar");
        return new Response(
          JSON.stringify({
            html: `<div data-rx-layout="default"><main data-rx-page><p>${isArabic ? "Arabic" : "English"}</p></main></div>`,
            head: { title: isArabic ? "Arabic" : "English" },
            payload: {
              route: { path: isArabic ? "/ar" : "/en", params: {}, query: {} },
              scopes: {},
              modules,
              plugins: [],
              config: { public: { i18n } },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
      __RESUX__: {
        route: { path: "/en", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "m0", state: {}, asyncData: {} },
        },
        modules,
        config: { public: { i18n } },
      },
      __RESUX_APP__: undefined,
      __RESUX_ROUTER__: undefined,
      __RESUX_INSTALLED__: false,
    });

    await import(runtimeImportUrl);
    const refreshLocale = async (expected: string) => {
      window.document.getElementById("refresh-locale")!.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0 }),
      );
      await waitForClientText(window, expected);
      expect(window.document.querySelector("[data-rx-text='s0:b0']")?.textContent).toBe(expected);
    };

    await refreshLocale("en:ltr");
    const router = (globalThis as any).__RESUX_ROUTER__;
    expect(router).toBeTruthy();

    await router.replace("/ar");
    await waitForClientRoute("/ar");
    await refreshLocale("ar:rtl");

    await router.push("/en");
    await waitForClientRoute("/en");
    await refreshLocale("en:ltr");

    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (window.location.pathname !== "/ar") {
      window.history.replaceState({ __resux: true, path: "/ar" }, "", "/ar");
    }
    window.dispatchEvent(new window.Event("popstate"));
    await waitForClientRoute("/ar");
    await refreshLocale("ar:rtl");

    window.history.forward();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (window.location.pathname !== "/en") {
      window.history.replaceState({ __resux: true, path: "/en" }, "", "/en");
    }
    window.dispatchEvent(new window.Event("popstate"));
    await waitForClientRoute("/en");
    await refreshLocale("en:ltr");
  });

  it("reloads safely when a route payload belongs to a different build", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("function ensureRoutePayloadBuildCompatibility(result)");
    expect(source).toContain("currentBuildId === nextBuildId");
    expect(source).toContain('dispatchManagedEvent(document, "resux:build-mismatch"');
    expect(source).toContain("location.reload();");
    expect(source).toContain("invalidateAllRoutePayloads();");
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
