import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";
import { clickRuntimeFixture, createRouteTestResponse, createTestMatchMedia, installRouteTestRuntime, managedTeleportSourceComment, nextRuntimeImportQuery, script, waitForCondition, waitForHtml, waitForSignal } from "./helpers/runtime-fixtures.js";

describe("client resume loader: routing and prefetch", () => {
  it("ignores same-route link clicks without refetching route payloads", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-same-route-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/">Home</a>
        <main>Home</main>
      </div>
    `;
    let fetchCalls = 0;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => {
        fetchCalls++;
        return new Response(
          JSON.stringify({
            html: "<main>Home</main>",
            head: { title: "Home" },
            payload: {
              route: { path: "/", params: {}, query: {} },
              scopes: {},
              modules: {}
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      },
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchCalls).toBe(0);
    expect(window.location.pathname).toBe("/");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("<main>Home</main>");
  });

  it("intercepts internal links and swaps the route payload without a document reload", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/post/42?tab=info">Post 42</a>
        <main>Home</main>
      </div>
    `;

    let requestedUrl = "";
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        requestedUrl = url;
        return new Response(
          JSON.stringify({
            html: "<main>Post 42</main>",
            head: {
              title: "Post 42",
              meta: [{ name: "route", content: "post" }],
              link: [{ rel: "stylesheet", href: "/route.css" }]
            },
            payload: {
              route: {
                path: "/post/42",
                params: { id: "42" },
                query: { tab: "info" }
              },
              scopes: {},
              modules: {}
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      },
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    window.document.querySelector('link[data-rx-route-style-preload="true"]')?.dispatchEvent(new window.Event("load"));
    await waitForHtml(window, "<main>Post 42</main>");

    expect(requestedUrl).toBe("/__resux/route?path=%2Fpost%2F42%3Ftab%3Dinfo");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("Post 42");
    expect(window.location.pathname).toBe("/post/42");
    expect(window.location.search).toBe("?tab=info");
    expect((globalThis as any).__RESUX__.route.params.id).toBe("42");
    expect(window.document.title).toBe("Post 42");
    expect(window.document.head.innerHTML).toContain('name="route"');
  });

  it("normalizes preload head links on client navigation updates", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const tempDir = path.join(os.tmpdir(), `resux-head-normalize-client-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
      const runtimeFile = path.join(tempDir, "runtime-client.mjs");
      await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

      const window = new Window({ url: "http://localhost/" });
      window.document.body.innerHTML = `
        <div id="__resux">
          <a href="/head">Head</a>
          <main>Home</main>
        </div>
      `;

      Object.assign(globalThis, {
        document: window.document,
        window,
        location: window.location,
        history: window.history,
        scrollTo: () => undefined,
        fetch: async () => {
          return new Response(
            JSON.stringify({
              html: "<main>Head</main>",
              head: {
                title: "Head",
                link: [
                  { rel: "preload", as: "priority", href: "/images/lcp.webp" },
                  { rel: "preload", as: "fetchpriority", href: "/styles/route.css" },
                  { rel: "preload", as: "video/mp4", href: "/media-test/videos/sample-video.mp4" },
                  { rel: "preload", as: "webp", href: "/images/poster.webp" },
                  { rel: "modulepreload", as: "module", href: "/__resux/client/chunk-head.mjs" },
                  { rel: "preload", as: "resux-video", href: "/unknown-client-preload" },
                ]
              },
              payload: {
                route: { path: "/head", params: {}, query: {} },
                scopes: {},
                modules: {}
              }
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" }
            }
          );
        },
        __RESUX__: {
          route: { path: "/", params: {}, query: {} },
          scopes: {},
          modules: {}
        },
        __RESUX_INSTALLED__: false
      });

      await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
      window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
      await waitForHtml(window, "<main>Head</main>");

      const links = Array.from(window.document.querySelectorAll("link[data-rx-head='true']"));
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "image" && link.getAttribute("href") === "/images/lcp.webp")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "style" && link.getAttribute("href") === "/styles/route.css")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "video" && link.getAttribute("href") === "/media-test/videos/sample-video.mp4")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "preload" && link.getAttribute("as") === "image" && link.getAttribute("href") === "/images/poster.webp")).toBe(true);
      expect(links.some((link) => link.getAttribute("rel") === "modulepreload" && !link.hasAttribute("as") && link.getAttribute("href") === "/__resux/client/chunk-head.mjs")).toBe(true);
      expect(links.some((link) => link.getAttribute("href") === "/unknown-client-preload")).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        '[resux] Skipping invalid preload link for "/unknown-client-preload". Unsupported as="resux-video".',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("ignores same-route link clicks without fetching or rerendering", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-same-route-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/about?tab=info" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/about?tab=info">About</a>
        <main>About page</main>
      </div>
    `;

    let fetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => {
        fetchCalls++;
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      },
      __RESUX__: {
        route: { path: "/about", params: {}, query: { tab: "info" } },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(fetchCalls).toBe(0);
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("About page");
    expect(window.location.pathname).toBe("/about");
    expect(window.location.search).toBe("?tab=info");
  });

  it("swaps route payloads on browser history navigation after the URL already changed", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-popstate-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/state" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <main>State</main>
      </div>
    `;

    const requestedPaths: string[] = [];
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        requestedPaths.push(decodeURIComponent(request.searchParams.get("path") ?? ""));
        return new Response(
          JSON.stringify({
            html: "<main>Media</main>",
            head: { title: "Media" },
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {}
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      },
      __RESUX__: {
        route: { path: "/state", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.history.replaceState({ __resux: true, path: "/media" }, "", "/media");
    window.dispatchEvent(new window.Event("popstate"));
    await waitForHtml(window, "<main>Media</main>");

    expect(requestedPaths).toEqual(["/media"]);
    expect(window.location.pathname).toBe("/media");
    expect((globalThis as any).__RESUX__.route.path).toBe("/media");
  });

  it("runs client route middleware during client-side navigation", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-client-mw-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const middlewareFile = path.join(tempDir, "auth.client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      middlewareFile,
      `import { defineResuxRouteMiddleware, defineClientRouteRedirect as navigateTo } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
export default defineResuxRouteMiddleware((to, from) => {
  globalThis.__CLIENT_MW_RUNS__ = globalThis.__CLIENT_MW_RUNS__ || [];
  globalThis.__CLIENT_MW_RUNS__.push({ to: to.path, from: from.path });
  if (to.path === "/protected") {
    return navigateTo("/login");
  }
});
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/protected">Protected</a>
        <main>Home</main>
      </div>
      <div data-rx-loading-indicator="true" hidden data-state="idle" aria-live="polite" aria-busy="false" data-duration="2000" data-throttle="0" style="--resux-loader-height: 3px;">
        <div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>
      </div>
    `;

    const middlewareEntry = {
      id: "w0",
      name: "auth",
      file: "middleware/auth.client.ts",
      global: false,
      mode: "client",
      src: pathToFileURL(middlewareFile).href
    };
    const requestedPaths: string[] = [];
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        const routePath = decodeURIComponent(request.searchParams.get("path") ?? "");
        requestedPaths.push(routePath);
        if (routePath === "/protected") {
          return new Response(
            JSON.stringify({
              html: "<main>Protected</main>",
              head: { title: "Protected", link: [{ rel: "stylesheet", href: "/protected.css" }] },
              payload: {
                route: { path: "/protected", params: {}, query: {} },
                scopes: {},
                modules: {},
                plugins: [],
                middleware: [middlewareEntry],
                pageMeta: { middleware: "auth" }
              }
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" }
            }
          );
        }

        return new Response(
          JSON.stringify({
            html: "<main>Login</main>",
            head: { title: "Login" },
            payload: {
              route: { path: "/login", params: {}, query: {} },
              scopes: {},
              modules: {},
              plugins: [],
              middleware: [middlewareEntry],
              pageMeta: {}
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      },
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
        plugins: [],
        middleware: [middlewareEntry],
        pageMeta: {}
      },
      __CLIENT_MW_RUNS__: [],
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>Login</main>");

    expect(requestedPaths).toEqual(["/protected", "/login"]);
    expect(window.location.pathname).toBe("/login");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("Login");
    expect((globalThis as any).__CLIENT_MW_RUNS__).toEqual([
      { to: "/protected", from: "/" }
    ]);
    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();
  });

  it("aborts pending async data when leaving the current route", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-abort-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.pending.value", blockId: "b0" }, children: [{ type: "text", value: "Loading stats" }] },
  { type: "element", tag: "p", attrs: [], events: [], if: { expression: "stats.error.value", blockId: "b1" }, children: [{ type: "interpolation", expression: "stats.error.value.name", bindingId: "b2" }] }
];
async function script(ctx) {
  const stats = ctx.useAsyncData("stats", ({ signal }) => new Promise((_resolve, reject) => {
    globalThis.__RESUX_TEST_SIGNAL__ = signal;
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  return { stats };
}
export default createClientComponent({ id: "m0", name: "Home", file: "Home.vue", script, template: __template, handlers: [] });
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/about">About</a>
        <span data-rx-block="s0:b0"><p>Loading stats</p></span>
        <span data-rx-block="s0:b1"></span>
      </div>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      DOMException: window.DOMException,
      fetch: async () => new Response(
        JSON.stringify({
          html: "<main>About</main>",
          head: { title: "About" },
          payload: {
            route: { path: "/about", params: {}, query: {} },
            scopes: {},
            modules: {}
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      ),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: {
            id: "s0",
            moduleId: "m0",
            state: {},
            asyncData: {
              stats: { value: null, pending: true, error: null }
            }
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    await waitForSignal();
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>About</main>");

    expect((globalThis as any).__RESUX_TEST_SIGNAL__.aborted).toBe(true);
    expect(window.location.pathname).toBe("/about");
  });

  it("preserves loaded global styles while navigating between routes", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-style-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = '<link data-rx-head="true" rel="stylesheet" href="/styles.css">';
    window.document.body.innerHTML = `
      <div id="__resux">
        <span data-rx-layout="default">
          <section class="shell">
            <nav><a href="/">Home</a><a href="/about">About</a></nav>
            <span data-rx-page=""><main class="page">Home</main></span>
          </section>
        </span>
      </div>
    `;
    const stylesheet = window.document.querySelector('link[href="/styles.css"]');
    Object.defineProperty(stylesheet, "sheet", { configurable: true, value: {} });

    const routePayloads: Record<string, unknown> = {
      "/about": {
        html: `
          <span data-rx-layout="default">
            <section class="shell">
              <nav><a href="/">Home</a><a href="/about">About</a></nav>
              <span data-rx-page=""><main class="page">About</main></span>
            </section>
          </span>
        `,
        head: { title: "About", link: [{ rel: "stylesheet", href: "/styles.css" }] },
        payload: { route: { path: "/about", params: {}, query: {} }, scopes: {}, modules: {} }
      },
      "/": {
        html: `
          <span data-rx-layout="default">
            <section class="shell">
              <nav><a href="/">Home</a><a href="/about">About</a></nav>
              <span data-rx-page=""><main class="page">Home</main></span>
            </section>
          </span>
        `,
        head: { title: "Home", link: [{ rel: "stylesheet", href: "/styles.css" }] },
        payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {} }
      }
    };

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async (url: string) => {
        const request = new URL(url, "http://localhost");
        const routePath = decodeURIComponent(request.searchParams.get("path") ?? "");
        return new Response(JSON.stringify(routePayloads[routePath]), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      },
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector('a[href="/about"]')!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main class=\"page\">About</main>");

    expect(window.location.pathname).toBe("/about");
    expect(window.document.getElementById("__resux")?.textContent).toContain("About");
    expect(window.document.querySelector('link[href="/styles.css"]')).toBe(stylesheet);

    window.document.querySelector('a[href="/"]')!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main class=\"page\">Home</main>");

    expect(window.location.pathname).toBe("/");
    expect(window.document.getElementById("__resux")?.textContent).toContain("Home");
    expect(window.document.querySelector('link[href="/styles.css"]')).toBe(stylesheet);
  });

  it("updates route style tags while navigating between routes", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-style-head-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = '<style data-rx-head="true" data-rx-style="m0-0">.home{color:red}</style>';
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/about">About</a>
        <main class="home">Home</main>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(
        JSON.stringify({
          html: '<main class="about">About</main>',
          head: {
            title: "About",
            style: [
              { id: "m1-0", css: ".about{color:blue}" },
              { id: "m1-1", textContent: ".about{background-color:white}" }
            ]
          },
          payload: { route: { path: "/about", params: {}, query: {} }, scopes: {}, modules: {} }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      ),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector('a[href="/about"]')!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, '<main class="about">About</main>');

    expect(window.document.querySelector('style[data-rx-style="m0-0"]')).toBeNull();
    expect(window.document.querySelector('style[data-rx-style="m1-0"]')?.textContent).toBe(".about{color:blue}");
    expect(window.document.querySelector('style[data-rx-style="m1-1"]')?.textContent).toBe(".about{background-color:white}");
  });

  it("reports route transition phases with progress and accessibility state", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-transition-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/slow">Slow</a>
        <main>Home</main>
      </div>
      <div data-rx-loading-indicator="true" hidden data-state="idle" aria-live="polite" aria-busy="false" data-duration="2000" data-throttle="0" style="--resux-loader-height: 3px;">
        <div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>
      </div>
    `;
    const phases: string[] = [];
    window.addEventListener("resux:route-transition", (event) => {
      phases.push((event as CustomEvent).detail.state);
    });

    let resolveFetch!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      Object.assign(globalThis, {
        fetch: async () => {
          resolve();
          await new Promise<void>((fetchResolve) => {
            resolveFetch = fetchResolve;
          });
          return new Response(
            JSON.stringify({
              html: "<main>Slow</main>",
              head: { title: "Slow" },
              payload: {
                route: { path: "/slow", params: {}, query: {} },
                scopes: {},
                modules: {}
              }
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" }
            }
          );
        }
      });
    });

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await fetchStarted;

    const loader = window.document.querySelector("[data-rx-loading-indicator]") as HTMLElement;
    const root = window.document.getElementById("__resux")!;
    expect(loader.hidden).toBe(false);
    expect(loader.dataset.state).toBe("fetching");
    expect(loader.getAttribute("aria-busy")).toBe("true");
    expect(root.getAttribute("data-route-transition")).toBe("loading");
    const progressValue = Number(window.document.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow") ?? "0");
    expect(progressValue).toBeGreaterThan(0);
    expect(progressValue).toBeLessThan(100);

    resolveFetch();
    await waitForHtml(window, "<main>Slow</main>");

    expect(phases).toEqual(expect.arrayContaining(["start", "fetching", "swapping", "complete"]));
    expect(["complete", "idle"]).toContain(loader.dataset.state);
    expect(root.hasAttribute("data-route-transition")).toBe(false);
  });

  it("preloads applicable destination route styles before history and DOM swaps", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <a href="/shop/item" id="styled-link">Styled</a>
        <main>Home</main>
      </div>
    `;
    await installRouteTestRuntime(
      window,
      (async () => new Response(
        JSON.stringify({
          payload: {
            route: { path: "/shop/item", params: {}, query: {} },
            scopes: {},
            modules: {},
            config: { public: {} }
          },
          html: '<a href="/shop/item" id="styled-link">Styled</a><main>Styled</main>',
          head: {
            link: [
              { rel: "stylesheet", href: "styles.css", crossorigin: "" },
              { rel: "stylesheet", href: "print.css", media: "print" }
            ]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch,
      {
        matchMedia: createTestMatchMedia((query) => query !== "print"),
        requestAnimationFrame: (callback: FrameRequestCallback) => {
          callback(0);
          return 1;
        }
      }
    );

    window.document.getElementById("styled-link")?.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
    );

    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    const preload = window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement | null;

    expect(preload?.getAttribute("href")).toBe("http://localhost/shop/styles.css");
    expect(preload?.getAttribute("crossorigin")).toBe("");
    expect(window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')).toHaveLength(1);
    expect(window.location.pathname).toBe("/");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("<main>Home</main>");

    preload?.dispatchEvent(new window.Event("error"));
    await waitForHtml(window, "<main>Styled</main>");

    expect(window.location.pathname).toBe("/shop/item");
    const appliedStyle = window.document.head.querySelector('link[data-rx-head][rel="stylesheet"][href="styles.css"]') as HTMLLinkElement | null;
    expect(appliedStyle?.href).toBe("http://localhost/shop/styles.css");
    expect(window.document.head.querySelector('link[data-rx-head][rel="stylesheet"][href="print.css"]')).not.toBeNull();
    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();
  });

  it("preserves directory URLs and reuses completed route CSS prefetches", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux"><a href="/docs/" id="docs">Docs</a><main>Home</main></div>';
    let fetchCalls = 0;
    await installRouteTestRuntime(window, (async () => {
      fetchCalls++;
      return createRouteTestResponse("/docs", "<main>Docs</main>", [{ rel: "stylesheet", href: "theme.css" }]);
    }) as typeof fetch);

    const anchor = window.document.getElementById("docs")!;
    anchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    const preload = window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement;
    expect(preload.href).toBe("http://localhost/docs/theme.css");
    preload.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => !window.document.querySelector('link[data-rx-route-style-preload="true"]'));

    anchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchCalls).toBe(1);
    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();
  });

  it("keys completed route CSS prefetches by payload and destination URL", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux"><a href="/docs" id="docs-file">Docs file</a><a href="/docs/" id="docs-dir">Docs dir</a><main>Home</main></div>';
    let fetchCalls = 0;
    await installRouteTestRuntime(window, (async () => {
      fetchCalls++;
      return createRouteTestResponse("/docs", "<main>Docs</main>", [{ rel: "stylesheet", href: "theme.css" }]);
    }) as typeof fetch);

    const fileAnchor = window.document.getElementById("docs-file")!;
    const dirAnchor = window.document.getElementById("docs-dir")!;

    fileAnchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    let preload = window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement;
    expect(preload.href).toBe("http://localhost/theme.css");
    preload.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => !window.document.querySelector('link[data-rx-route-style-preload="true"]'));

    fileAnchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();

    dirAnchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    preload = window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement;
    expect(preload.href).toBe("http://localhost/docs/theme.css");
    preload.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => !window.document.querySelector('link[data-rx-route-style-preload="true"]'));

    dirAnchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchCalls).toBe(1);
    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();
  });

  it("shares in-flight payload requests while prefetching route styles for distinct destination URLs", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux"><a href="/docs" id="docs-file">Docs file</a><a href="/docs/" id="docs-dir">Docs dir</a><main>Home</main></div>';
    let fetchCalls = 0;
    let resolvePayload: (value: Response) => void;
    const payloadPromise = new Promise<Response>((resolve) => {
      resolvePayload = resolve;
    });

    await installRouteTestRuntime(window, (async () => {
      fetchCalls++;
      return payloadPromise;
    }) as typeof fetch);

    const fileAnchor = window.document.getElementById("docs-file")!;
    const dirAnchor = window.document.getElementById("docs-dir")!;

    fileAnchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    dirAnchor.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));

    expect(fetchCalls).toBe(1);

    resolvePayload!(createRouteTestResponse("/docs", "<main>Docs</main>", [{ rel: "stylesheet", href: "theme.css" }]));

    await waitForCondition(() => window.document.querySelectorAll('link[data-rx-route-style-preload="true"]').length === 2);
    const preloads = Array.from(window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')) as HTMLLinkElement[];
    const hrefs = preloads.map(p => p.href).sort();
    expect(hrefs).toEqual(["http://localhost/docs/theme.css", "http://localhost/theme.css"]);

    for (const p of preloads) p.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => window.document.querySelectorAll('link[data-rx-route-style-preload="true"]').length === 0);
  });

  it("preloads declared imported styles before route swapping", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux"><a href="/imported" id="imported-link">Imported</a><main>Home</main></div>';
    await installRouteTestRuntime(
      window,
      (async () => createRouteTestResponse("/imported", "<main>Imported</main>", [
        { rel: "stylesheet", href: "/main.css", imports: ["/imported-child.css"] }
      ])) as typeof fetch,
      {
        matchMedia: createTestMatchMedia(() => true),
        requestAnimationFrame: (cb: FrameRequestCallback) => { cb(0); return 1; }
      }
    );

    window.document.getElementById("imported-link")?.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
    );

    await waitForCondition(() => window.document.querySelectorAll('link[data-rx-route-style-preload="true"]').length === 2);
    const preloads = Array.from(window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')) as HTMLLinkElement[];
    const hrefs = preloads.map(p => p.href).sort();
    expect(hrefs).toEqual(["http://localhost/imported-child.css", "http://localhost/main.css"]);

    for (const p of preloads) p.dispatchEvent(new window.Event("load"));
    await waitForHtml(window, "<main>Imported</main>");
    expect(window.location.pathname).toBe("/imported");
    expect(window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')).toHaveLength(0);
  });

  it("does not block navigation on disabled destination stylesheets", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux"><a href="/optional" id="optional">Optional</a><main>Home</main></div>';
    await installRouteTestRuntime(window, (async () =>
      createRouteTestResponse("/optional", "<main>Optional</main>", [{ rel: "stylesheet", href: "optional.css", disabled: true }])
    ) as typeof fetch);

    window.document.getElementById("optional")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await waitForHtml(window, "<main>Optional</main>");

    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();
    const applied = window.document.head.querySelector('link[data-rx-head][rel="stylesheet"][href="optional.css"]');
    expect(applied?.hasAttribute("disabled")).toBe(true);
  });

  it("awaits an existing matching stylesheet that is still loading", async () => {
    const window = new Window({ url: "http://localhost/" });
    const existing = window.document.createElement("link");
    existing.rel = "stylesheet";
    existing.href = "/shared.css";
    Object.defineProperty(existing, "sheet", { configurable: true, value: null });
    window.document.head.appendChild(existing);
    window.document.body.innerHTML = '<div id="__resux"><a href="/ready" id="ready">Ready</a><main>Home</main></div>';
    await installRouteTestRuntime(window, (async () =>
      createRouteTestResponse("/ready", "<main>Ready</main>", [{ rel: "stylesheet", href: "/shared.css" }])
    ) as typeof fetch);

    window.document.getElementById("ready")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.document.querySelector('link[data-rx-route-style-preload="true"]')).toBeNull();
    expect(window.location.pathname).toBe("/");
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("<main>Home</main>");

    existing.dispatchEvent(new window.Event("load"));
    await waitForHtml(window, "<main>Ready</main>");
    expect(window.location.pathname).toBe("/ready");
  });

  it("keeps stylesheet request semantics when preloading", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = '<link rel="stylesheet" href="/shared.css">';
    window.document.body.innerHTML = '<div id="__resux"><a href="/secure" id="secure">Secure</a><main>Home</main></div>';
    await installRouteTestRuntime(window, (async () => new Response(JSON.stringify({
      payload: { route: { path: "/secure", params: {}, query: {} }, scopes: {}, modules: {}, config: { public: {} } },
      html: "<main>Secure</main>",
      head: { link: [{ rel: "stylesheet", href: "/shared.css", crossOrigin: "", referrerPolicy: "no-referrer", integrity: "sha256-test" }] }
    }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch);

    window.document.getElementById("secure")?.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    const preload = window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement;
    expect(preload.getAttribute("crossorigin")).toBe("");
    expect(preload.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(preload.getAttribute("integrity")).toBe("sha256-test");
    preload.dispatchEvent(new window.Event("load"));
  });

  it("serializes multi-style route prefetches within the route concurrency bound", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux"><a href="/chunks" id="chunks">Chunks</a><main>Home</main></div>';
    await installRouteTestRuntime(window, (async () => new Response(JSON.stringify({
      payload: { route: { path: "/chunks", params: {}, query: {} }, scopes: {}, modules: {}, config: { public: {} } },
      html: "<main>Chunks</main>",
      head: { link: ["a.css", "b.css", "c.css"].map((href) => ({ rel: "stylesheet", href })) }
    }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch);

    window.document.getElementById("chunks")?.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
    await waitForCondition(() => Boolean(window.document.querySelector('link[data-rx-route-style-preload="true"]')));
    expect(window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')).toHaveLength(1);
    const first = window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement;
    expect(first.href).toBe("http://localhost/a.css");
    first.dispatchEvent(new window.Event("load"));
    await waitForCondition(() => (window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement | null)?.href === "http://localhost/b.css");
    expect(window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')).toHaveLength(1);
    (window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement).dispatchEvent(new window.Event("load"));
    await waitForCondition(() => (window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement | null)?.href === "http://localhost/c.css");
    (window.document.querySelector('link[data-rx-route-style-preload="true"]') as HTMLLinkElement).dispatchEvent(new window.Event("load"));
  });

  it("counts pending stylesheet preloads toward the route prefetch limit", async () => {
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        ${Array.from({ length: 9 }, (_, index) => `<a href="/route-${index}" id="route-${index}">Route ${index}</a>`).join("")}
        <main>Home</main>
      </div>
    `;
    let routeFetchCalls = 0;
    await installRouteTestRuntime(
      window,
      (async (input: string | URL | Request) => {
        routeFetchCalls++;
        const routePath = new URL(String(input), "http://localhost/").searchParams.get("path") || "/";
        return new Response(JSON.stringify({
          payload: { route: { path: routePath, params: {}, query: {} }, scopes: {}, modules: {}, config: { public: {} } },
          html: `<main>${routePath}</main>`,
          head: { link: [{ rel: "stylesheet", href: `/assets${routePath}.css` }] }
        }), { status: 200, headers: { "content-type": "application/json" } });
      }) as typeof fetch,
      { matchMedia: createTestMatchMedia(() => true) }
    );

    for (let index = 0; index < 8; index++) {
      window.document.getElementById(`route-${index}`)?.dispatchEvent(
        new window.MouseEvent("pointerover", { bubbles: true, cancelable: true })
      );
    }
    await waitForCondition(
      () => window.document.querySelectorAll('link[data-rx-route-style-preload="true"]').length === 8
    );

    expect(routeFetchCalls).toBe(8);
    window.document.getElementById("route-8")?.dispatchEvent(
      new window.MouseEvent("pointerover", { bubbles: true, cancelable: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(routeFetchCalls).toBe(8);

    for (const preload of window.document.querySelectorAll('link[data-rx-route-style-preload="true"]')) {
      preload.dispatchEvent(new window.Event("load"));
    }
  });

  it("ignores prefetch for media/static links", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-media-prefetch-ignore-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/media-test/videos/sample-video.mp4" id="media-prefetch-link">
        <img data-resux-media="img" src="/resux-placeholder.svg" alt="media">
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: "<main>Media</main>",
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const mediaImage = window.document.querySelector("img[data-resux-media='img']") as HTMLImageElement;
    mediaImage.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true, cancelable: true }));

    expect(routeFetchCalls).toBe(0);
  });

  it("preserves the active layout across client-side navigation", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-layout-nav-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    const deferredHandlerFile = path.join(tempDir, "layout-deferred.mjs");
    const deferredHandlerUrl = pathToFileURL(deferredHandlerFile).href;
    await writeFile(
      deferredHandlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const template = [{ type: "interpolation", expression: "String(menuOpen.value)", bindingId: "b0" }];
async function script(ctx) {
  globalThis.__RESUX_LAYOUT_DEFERRED_SCOPE_CREATIONS__ = (globalThis.__RESUX_LAYOUT_DEFERRED_SCOPE_CREATIONS__ || 0) + 1;
  const menuOpen = ctx.useState("menuOpen", () => false);
  function prime() {}
  function toggle() { menuOpen.value = !menuOpen.value; }
  return { menuOpen, prime, toggle };
}
export default createClientComponent({ id: "layoutDeferred", name: "LayoutDeferred", file: "LayoutDeferred.vue", script, template, handlers: ["prime", "toggle"] });
`,
      "utf8",
    );
    const layoutTeleportMarkup = `
      <span data-rx-teleport-source="true" data-rx-teleport-to="#outer-layout-target" style="display: contents;">
        <div id="outer-layout-shell">
          <span data-rx-teleport-source="true" data-rx-teleport-to="#inner-layout-target" style="display: contents;">
            <button id="layout-menu-action" data-rx-on-click="s0:layout:toggle">Menu</button>
          </span>
        </div>
      </span>`;
    const layoutDeferredTeleportMarkup = managedTeleportSourceComment({
      to: "#deferred-layout-target",
      disabled: false,
      defer: true,
      bindings: {},
      html: '<button id="deferred-layout-action" data-rx-on-click="s2:layoutDeferred:toggle" data-rx-text="s2:b0">true</button>',
    });

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <span data-rx-layout="default">
          <section id="layout">
            <nav><a href="/about">About</a></nav>
            ${layoutTeleportMarkup}
            ${layoutDeferredTeleportMarkup}
            <span data-rx-page=""><main>Home</main><button id="prime-deferred-layout" data-rx-on-click="s2:layoutDeferred:prime">Prime</button><div id="outer-layout-target"></div><div id="teleports"></div></span>
          </section>
        </span>
      </div>
      <div id="inner-layout-target"></div>
      <div data-rx-teleport-fallback="true"></div>
    `;
    const layoutElement = window.document.getElementById("layout");

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(
        JSON.stringify({
          html: `
            <span data-rx-layout="default">
              <section id="layout">
                <nav><a href="/">Home</a></nav>
                ${layoutTeleportMarkup}
                ${layoutDeferredTeleportMarkup}
                <span data-rx-page=""><main>About</main><div id="outer-layout-target"></div><div id="deferred-layout-target"></div></span>
              </section>
            </span>
          `,
          head: { title: "About" },
          payload: {
            route: { path: "/about", params: {}, query: {} },
            scopes: {
              s0: { id: "s0", moduleId: "layout", state: { menuOpen: false }, asyncData: {} },
              s1: { id: "s1", moduleId: "page", state: { loaded: true }, asyncData: {} },
              s2: { id: "s2", moduleId: "layoutDeferred", state: { menuOpen: false }, asyncData: {} }
            },
            modules: { layoutDeferred: deferredHandlerUrl }
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      ),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: { id: "s0", moduleId: "layout", state: { menuOpen: true }, asyncData: {} },
          s2: { id: "s2", moduleId: "layoutDeferred", state: { menuOpen: true }, asyncData: {} },
          s9: { id: "s9", moduleId: "home", state: {}, asyncData: {} }
        },
        modules: { layoutDeferred: deferredHandlerUrl }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    await waitForCondition(() => Boolean(window.document.getElementById("inner-layout-target")?.querySelector("#layout-menu-action")));
    expect(window.document.getElementById("layout")?.querySelector("[data-rx-on-click^='s0:']")).toBeNull();
    clickRuntimeFixture(window, "prime-deferred-layout");
    await waitForCondition(() => (globalThis as any).__RESUX_LAYOUT_DEFERRED_SCOPE_CREATIONS__ === 1);
    window.document.querySelector("a")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<main>About</main>");
    await waitForCondition(() => Boolean(
      window.document.getElementById("outer-layout-target")?.querySelector("#outer-layout-shell"),
    ));
    expect(window.document.getElementById("inner-layout-target")?.querySelector("#layout-menu-action")).toBeTruthy();

    expect(window.document.getElementById("layout")).toBe(layoutElement);
    expect(window.document.getElementById("__resux")?.innerHTML).toContain("<main>About</main>");
    expect((globalThis as any).__RESUX__.scopes.s0.state.menuOpen).toBe(true);
    expect((globalThis as any).__RESUX__.scopes.s1.state.loaded).toBe(true);
    expect((globalThis as any).__RESUX__.scopes.s2.state.menuOpen).toBe(true);
    expect((globalThis as any).__RESUX_LAYOUT_DEFERRED_SCOPE_CREATIONS__).toBe(1);
    await waitForCondition(() => Boolean(
      window.document.getElementById("deferred-layout-target")?.querySelector("#deferred-layout-action"),
    ));
    expect(window.document.getElementById("deferred-layout-action")?.textContent).toBe("true");
    clickRuntimeFixture(window, "deferred-layout-action");
    await waitForCondition(() => (globalThis as any).__RESUX__.scopes.s2.state.menuOpen === false);
    expect((globalThis as any).__RESUX_LAYOUT_DEFERRED_SCOPE_CREATIONS__).toBe(1);
    expect(window.document.getElementById("deferred-layout-action")?.textContent).toBe("false");
    expect(window.document.querySelector("[data-rx-teleport-fallback='true']")?.id).toBe("teleports");
    delete (globalThis as any).__RESUX_LAYOUT_DEFERRED_SCOPE_CREATIONS__;
  });
});
