import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function buildCompilerFixture(
  prefix: string,
  configSource: string,
  options: {
    page?: string;
    publicFiles?: Record<string, string>;
  } = {},
) {
  const root = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(path.join(root, "pages"), { recursive: true });
  await writeFile(
    path.join(root, "pages", "index.vue"),
    options.page ?? "<template><main>Home</main></template>",
  );
  for (const [relativePath, content] of Object.entries(options.publicFiles ?? {})) {
    const target = path.join(root, "public", relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await writeFile(path.join(root, "resux.config.ts"), configSource);
  await buildProject(root);
  const manifest = await import(
    `${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`
  );
  return { root, manifest };
}

describe("project build manifest", () => {
  it("discovers layouts, middleware, plugins, server handlers, public config, and page meta", async () => {
    const root = path.join(os.tmpdir(), `resux-build-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "layouts"), { recursive: true });
    await mkdir(path.join(root, "middleware"), { recursive: true });
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await mkdir(path.join(root, "server", "middleware"), { recursive: true });
    await mkdir(path.join(root, "server", "api"), { recursive: true });
    await writeFile(path.join(root, "app.vue"), "<template><ResuxLayout><ResuxPage /></ResuxLayout></template>");
    await writeFile(path.join(root, "layouts", "default.vue"), "<template><div><slot /></div></template>");
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>definePageMeta({ middleware: "auth", title: "Home" })</script><template><h1 class="page-title">Home</h1></template>`
    );
    await writeFile(path.join(root, "middleware", "auth.ts"), "export default defineResuxRouteMiddleware(() => {})");
    await writeFile(path.join(root, "plugins", "app.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "server", "middleware", "headers.ts"), "export default defineServerMiddleware((event) => { setHeader(event, 'x-server-middleware', 'true') })");
    await writeFile(path.join(root, "server", "api", "hello.ts"), "export default defineEventHandler(() => ({ hello: 'world' }))");
    await writeFile(
      path.join(root, "resux.config.ts"),
      "export default defineResuxConfig({ runtimeConfig: { public: { apiBase: '/api' } }, app: { head: { title: 'Test' } } })"
    );

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const bundledManifest = await import(`${pathToFileURL(path.join(root, ".resux", "server-bundle", "index.mjs")).href}?t=${Date.now()}`);

    expect(result.layouts).toHaveLength(1);
    expect(result.middleware[0].name).toBe("auth");
    expect(result.serverMiddleware[0].id).toBe("s0");
    expect(result.plugins[0].id).toBe("p0");
    expect(result.serverHandlers[0].path).toBe("/api/hello");
    expect(result.routes[0].meta?.middleware).toBe("auth");
    expect((manifest as { resuxPlugins?: unknown[] }).resuxPlugins).toHaveLength(1);
    expect((manifest as { plugins?: unknown[] }).plugins).toBeUndefined();
    expect((bundledManifest as { resuxPlugins?: unknown[] }).resuxPlugins).toHaveLength(1);
    expect((bundledManifest as { plugins?: unknown[] }).plugins).toBeUndefined();
    expect(manifest.runtimeConfig.public.apiBase).toBe("/api");
    expect(manifest.appHead.title).toBe("Test");
    expect(bundledManifest.appHead.title).toBe("Test");
    expect(bundledManifest.matchRoute("/").route.path).toBe("/");
    expect(manifest.serverMiddleware[0].file).toContain("headers.ts");
    const runtimeClient = await readFile(path.join(root, ".resux", "client", "runtime-client.mjs"), "utf8");
    expect(runtimeClient).toContain("createClientComponent");
  }, 30000);

  it("discovers plugins and route middleware recursively with stable mode-aware outputs", async () => {
    const root = path.join(os.tmpdir(), `resux-support-files-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "plugins", "nested"), { recursive: true });
    await mkdir(path.join(root, "middleware", "nested"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(path.join(root, "plugins", "01.auth.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "plugins", "02.analytics.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "plugins", "client-only.client.ts"), "const browserPath = window.location.pathname; export default defineResuxPlugin((app) => { app.provide('browserPath', browserPath) })");
    await writeFile(path.join(root, "plugins", "server-only.server.ts"), "export default defineResuxPlugin((app) => { app.provide('serverOnly', true) })");
    await writeFile(path.join(root, "plugins", "nested", "03.shared.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "middleware", "log.global.ts"), "export default defineResuxRouteMiddleware(() => {})");
    await writeFile(path.join(root, "middleware", "auth.ts"), "export default defineResuxRouteMiddleware(() => {})");
    await writeFile(path.join(root, "middleware", "nested", "admin.client.ts"), "const browserPath = window.location.pathname; export default defineResuxRouteMiddleware(() => browserPath)");
    await writeFile(path.join(root, "middleware", "secret.server.ts"), "export default defineResuxRouteMiddleware(() => {})");

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const relativePlugins = result.plugins.map((entry) => path.relative(root, entry.file).replaceAll("\\", "/"));
    const relativeMiddleware = result.middleware.map((entry) => path.relative(root, entry.file).replaceAll("\\", "/"));

    expect(relativePlugins).toEqual([
      "plugins/01.auth.ts",
      "plugins/02.analytics.ts",
      "plugins/client-only.client.ts",
      "plugins/nested/03.shared.ts",
      "plugins/server-only.server.ts"
    ]);
    expect(relativeMiddleware).toEqual([
      "middleware/auth.ts",
      "middleware/log.global.ts",
      "middleware/nested/admin.client.ts",
      "middleware/secret.server.ts"
    ]);
    expect(manifest.clientPlugins.map((entry: { file: string }) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual([
      "plugins/01.auth.ts",
      "plugins/02.analytics.ts",
      "plugins/client-only.client.ts",
      "plugins/nested/03.shared.ts"
    ]);
    expect(manifest.clientMiddleware.map((entry: { file: string }) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual([
      "middleware/auth.ts",
      "middleware/log.global.ts",
      "middleware/nested/admin.client.ts"
    ]);
    expect(manifest.middleware.map((entry: { file: string }) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual([
      "middleware/auth.ts",
      "middleware/log.global.ts",
      "middleware/secret.server.ts"
    ]);

    const pluginByFile = new Map(result.plugins.map((entry) => [path.basename(entry.file), entry]));
    const middlewareByFile = new Map(result.middleware.map((entry) => [path.basename(entry.file), entry]));
    const clientOnlyPlugin = pluginByFile.get("client-only.client.ts");
    const serverOnlyPlugin = pluginByFile.get("server-only.server.ts");
    const clientOnlyMiddleware = middlewareByFile.get("admin.client.ts");
    const serverOnlyMiddleware = middlewareByFile.get("secret.server.ts");

    expect(clientOnlyPlugin).toBeDefined();
    expect(serverOnlyPlugin).toBeDefined();
    expect(clientOnlyMiddleware).toBeDefined();
    expect(serverOnlyMiddleware).toBeDefined();
    await expect(readFile(path.join(root, ".resux", "server", "resux-plugins", `${clientOnlyPlugin!.id}.mjs`), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "client", "plugins", `${serverOnlyPlugin!.id}.mjs`), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "server", "resux-middleware", `${clientOnlyMiddleware!.id}.mjs`), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "client", "middleware", `${serverOnlyMiddleware!.id}.mjs`), "utf8")).rejects.toThrow();
  }, 20000);

  it("auto-discovers client enhancement files and injects runtime helper imports", async () => {
    const root = path.join(os.tmpdir(), `resux-client-enhancements-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "client-enhancements", "swiper-carousel.client.ts"),
      `defineClientEnhancement("swiper-carousel", async (target) => {
  await useClientPackage("swiper", { css: ["swiper/css"] });
  target.setAttribute("data-ready", "true");
});`,
    );

    const result = await buildProject(root, undefined, { vite: "dev" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("swiper-carousel.client.ts"));
    expect(enhancementPlugin).toBeDefined();
    expect(enhancementPlugin?.mode).toBe("client");
    const clientModule = await readFile(
      path.join(root, ".resux", "vite-client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );
    const enhancementManifest = await readFile(path.join(root, ".resux", "client-enhancements.mjs"), "utf8");
    const viteEnhancementManifest = await readFile(path.join(root, ".resux", "vite-client", "client-enhancements.mjs"), "utf8");
    const clientEnhancementManifest = await readFile(path.join(root, ".resux", "client", "client-enhancements.mjs"), "utf8");
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(clientModule).toMatch(
      /import\s+\{\s*(?:defineClientEnhancement,\s*useClientPackage|useClientPackage,\s*defineClientEnhancement)\s*\}\s+from\s+"\/__resux\/runtime-client\.mjs";/,
    );
    expect(clientModule).toContain('defineClientEnhancement("swiper-carousel"');
    expect(enhancementManifest).toContain(`import "/__resux/plugins/${enhancementPlugin!.id}.mjs";`);
    expect(enhancementManifest).toContain('"swiper-carousel"');
    expect(viteEnhancementManifest).toContain(`import "/__resux/plugins/${enhancementPlugin!.id}.mjs";`);
    expect(clientEnhancementManifest).toContain(`import "/__resux/plugins/${enhancementPlugin!.id}.mjs";`);
    expect(runtimeClient).toContain("export {");
    expect(runtimeClient).toContain("defineClientEnhancement");
    expect(runtimeClient).toContain("useClientPackage");
    expect(runtimeClient).toContain('[data-resux-enhancement], [use-client-enhancement]');
    expect(runtimeClient).toContain('data-resux-trigger');
  }, 20000);

  it("injects definePackageAdapter from runtime client helpers for enhancement adapters", async () => {
    const root = path.join(os.tmpdir(), `resux-client-enhancement-adapter-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "client-enhancements", "adapter-demo.client.ts"),
      `definePackageAdapter({
  name: "adapter-demo",
  imports: [],
  enhance(target) {
    target.setAttribute("data-adapter-ready", "true");
  }
});`,
    );

    const result = await buildProject(root, undefined, { vite: "dev" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("adapter-demo.client.ts"));
    expect(enhancementPlugin).toBeDefined();
    const clientModule = await readFile(
      path.join(root, ".resux", "vite-client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );

    expect(clientModule).toMatch(
      /import\s+\{\s*definePackageAdapter\s*\}\s+from\s+"\/__resux\/runtime-client\.mjs";/,
    );
    expect(clientModule).toContain('name: "adapter-demo"');
  }, 20000);

  it("rewrites resuxjs imports in client enhancement files to runtime-client helpers", async () => {
    const root = path.join(os.tmpdir(), `resux-client-enhancement-rewrite-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "client-enhancements", "imported-helper.client.ts"),
      `import { defineClientEnhancement } from "resuxjs";
defineClientEnhancement("imported-helper", async (target) => {
  target.setAttribute("data-imported", "true");
});`,
    );

    const result = await buildProject(root, undefined, { vite: "dev" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("imported-helper.client.ts"));
    expect(enhancementPlugin).toBeDefined();
    const clientModule = await readFile(
      path.join(root, ".resux", "vite-client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );

    expect(clientModule).toContain('from "/__resux/runtime-client.mjs"');
    expect(clientModule).not.toContain('from "resuxjs"');
  }, 20000);

  it("builds client enhancement chunks with __resux asset base paths for preview serving", async () => {
    const root = path.join(os.tmpdir(), `resux-enhancement-preview-base-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<template><main use-client-enhancement="style-demo" data-trigger="immediate">Preview Base</main></template>`,
      "utf8",
    );
    await writeFile(
      path.join(root, "client-enhancements", "style-demo.client.ts"),
      `defineClientEnhancement("style-demo", async (target) => {
  const vueModule = await import("vue");
  target.setAttribute("data-style-demo", typeof vueModule.reactive === "function" ? "ready" : "missing");
});`,
      "utf8",
    );

    const result = await buildProject(root, undefined, { vite: "build" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("style-demo.client.ts"));
    expect(enhancementPlugin).toBeDefined();

    const pluginModule = await readFile(
      path.join(root, ".resux", "client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );
    expect(pluginModule).toContain("../chunks/");

    const chunkFiles = await readdir(path.join(root, ".resux", "client", "chunks"));
    expect(chunkFiles.length).toBeGreaterThan(0);
    const preloadHelperFile = chunkFiles.find((file) => file.startsWith("preload-helper-"));
    const preloadHelperSource = preloadHelperFile
      ? await readFile(path.join(root, ".resux", "client", "chunks", preloadHelperFile), "utf8")
      : pluginModule;
    expect(preloadHelperSource).toContain("/__resux/");
  }, 20000);

  it("generates an empty client enhancement manifest when no enhancement files are present", async () => {
    const root = path.join(os.tmpdir(), `resux-empty-enhancements-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");

    await buildProject(root, undefined, { vite: "dev" });

    const enhancementManifest = await readFile(path.join(root, ".resux", "client-enhancements.mjs"), "utf8");
    const viteEnhancementManifest = await readFile(path.join(root, ".resux", "vite-client", "client-enhancements.mjs"), "utf8");
    const clientEnhancementManifest = await readFile(path.join(root, ".resux", "client", "client-enhancements.mjs"), "utf8");

    expect(enhancementManifest).toContain("export const clientEnhancements = [];");
    expect(viteEnhancementManifest).toContain("export const clientEnhancements = [];");
    expect(clientEnhancementManifest).toContain("export const clientEnhancements = [];");
    expect(enhancementManifest).not.toContain('import "/__resux/plugins/');
  }, 20000);

  it("keeps Resux plugins separate from Nitro plugin auto-discovery folders", async () => {
    const root = path.join(os.tmpdir(), `resux-nitro-separation-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await mkdir(path.join(root, "server", "plugins"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(path.join(root, "plugins", "01.lab.ts"), "export default defineResuxPlugin((app) => app.provide('labPlugin', { ok: true }))");
    await writeFile(path.join(root, "server", "plugins", "01.nitro.ts"), "export default () => {}");

    const result = await buildProject(root);
    const manifestSource = await readFile(path.join(root, ".resux", "server", "manifest.mjs"), "utf8");

    expect(result.plugins.map((entry) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual(["plugins/01.lab.ts"]);
    expect(manifestSource).toContain('./resux-plugins/');
    expect(manifestSource).not.toContain('./plugins/');
    await expect(readFile(path.join(root, ".resux", "server", "resux-plugins", "p0.mjs"), "utf8")).resolves.toContain("defineResuxPlugin");
    await expect(readFile(path.join(root, ".resux", "server", "plugins", "p0.mjs"), "utf8")).rejects.toThrow();
  }, 20000);

  it("runs configured modules and emits route rules", async () => {
    const root = path.join(os.tmpdir(), `resux-modules-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "modules"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "modules", "security.ts"),
      `export default defineResuxModule({
  defaults: { header: "default" },
  setup(options, resux) {
    resux.addCss("/module.css")
    resux.addHead({ meta: [{ name: "module", content: options.header }] })
    resux.addRouteRule("/admin/**", { headers: { "x-module": options.header } })
    resux.extendRuntimeConfig({ public: { fromModule: options.header } })
  }
})`
    );
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  modules: [["./modules/security", { header: "enabled" }]],
  routeRules: {
    "/old": { redirect: { to: "/", statusCode: 301 } },
    "/api/**": {
      statusCode: 202,
      cache: { maxAge: 60, swr: 30 },
      cors: { origin: "https://example.com", methods: ["GET"], headers: ["content-type"], credentials: true }
    }
  }
})`
    );

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const manifestJson = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8"));

    expect(result.routeRules["/admin/**"].headers?.["x-module"]).toBe("enabled");
    expect(manifest.appHead.link).toEqual(expect.arrayContaining([{ rel: "stylesheet", href: "/module.css" }]));
    expect(manifest.appHead.meta).toEqual(expect.arrayContaining([{ name: "module", content: "enabled" }]));
    expect(manifest.runtimeConfig.public.fromModule).toBe("enabled");
    expect(manifest.routeRules["/old"].redirect).toEqual({ to: "/", statusCode: 301 });
    expect(manifest.routeRules["/admin/**"].headers["x-module"]).toBe("enabled");
    expect(manifest.routeRules["/api/**"].statusCode).toBe(202);
    expect(manifest.routeRules["/api/**"].cache).toEqual({ maxAge: 60, swr: 30 });
    expect(manifest.routeRules["/api/**"].cors).toEqual({
      origin: "https://example.com",
      methods: ["GET"],
      headers: ["content-type"],
      credentials: true
    });
    expect(manifestJson.routeRules["/admin/**"].headers["x-module"]).toBe("enabled");
  }, 20000);

  it("runs built-in module presets", async () => {
    const root = path.join(os.tmpdir(), `resux-builtin-modules-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  modules: [
    ["resux:security", { contentSecurityPolicy: "default-src 'self'", headers: { "x-app": "resux" } }],
    ["resux:performance", { assetMaxAge: 120 }]
  ]
})`
    );

    await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const manifestJson = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8"));

    expect(manifest.routeRules["/**"].headers["x-app"]).toBe("resux");
    expect(manifest.routeRules["/**"].headers["content-security-policy"]).toBe("default-src 'self'");
    expect(manifest.routeRules["/__resux/handlers/**"].cache).toBe(false);
    expect(manifest.routeRules["/__resux/route"].cache).toBe(false);
    expect(manifest.runtimeConfig.public.securityHeaders).toBe(true);
    expect(manifest.runtimeConfig.public.performanceModule.assetMaxAge).toBe(120);
    expect(manifest.runtimeConfig.public.performanceModule.inlineCss).toBe(true);
    expect(manifest.runtimeConfig.public.performanceModule.inlineCssMaxBytes).toBe(65536);
    expect(manifestJson.routeRules["/__resux/runtime-client.mjs"].cache).toBe(false);
  }, 20000);

  it("inlines small local CSS when the performance module is enabled for production", async () => {
    const { manifest } = await buildCompilerFixture(
      "resux-inline-css",
      `export default defineResuxConfig({
  css: ["/app.css"],
  modules: [["resux:performance", { inlineCssMaxBytes: 1024 }]]
})`,
      {
        page: "<template><main class=\"critical\">Home</main></template>",
        publicFiles: { "app.css": ".critical{display:block;color:red}" },
      },
    );

    expect(manifest.appHead.link).not.toEqual(
      expect.arrayContaining([{ rel: "stylesheet", href: "/app.css" }])
    );
    expect(manifest.appHead.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ css: ".critical{display:block;color:red}" })
      ])
    );
    expect(manifest.runtimeConfig.public.performanceModule.inlineCss).toBe(true);
    expect(manifest.runtimeConfig.public.performanceModule.inlineCssMaxBytes).toBe(1024);
  }, 20000);

  it("keeps CSS linked when inlining would break relative assets or configured order", async () => {
    const { manifest } = await buildCompilerFixture(
      "resux-inline-css-order",
      `export default defineResuxConfig({
  css: ["/first.css", "/css/second.css"],
  modules: [["resux:performance", { inlineCssMaxBytes: 4096 }]]
})`,
      {
        publicFiles: {
          "first.css": ".first{color:red}",
          "css/second.css": ".second{background:url(./image.png)}",
        },
      },
    );

    expect(manifest.appHead.link).toEqual(expect.arrayContaining([
      { rel: "stylesheet", href: "/first.css" },
      { rel: "stylesheet", href: "/css/second.css" }
    ]));
    expect(manifest.appHead.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ css: ".first{color:red}" })])
    );
  }, 20000);

  it("falls back to linked CSS and eager font application under restrictive CSP", async () => {
    const { manifest } = await buildCompilerFixture(
      "resux-csp-assets",
      `export default defineResuxConfig({
  css: ["/app.css"],
  modules: [
    ["resux:performance", { inlineCssMaxBytes: 4096 }],
    ["resuxjs/fonts", { google: [{ name: "Inter", weights: [400] }] }],
    ["resux:security", { contentSecurityPolicy: "default-src 'self'; style-src 'self' https://fonts.googleapis.com; script-src 'self'; script-src-attr 'none'" }]
  ]
})`,
      { publicFiles: { "app.css": ".app{display:block}" } },
    );

    expect(manifest.appHead.link).toEqual(expect.arrayContaining([
      { rel: "stylesheet", href: "/app.css" }
    ]));
    const fontStylesheet = manifest.appHead.link.find((link: Record<string, string>) =>
      link.rel === "stylesheet" && String(link.href).includes("fonts.googleapis.com")
    );
    expect(fontStylesheet).toBeTruthy();
    expect(fontStylesheet.media).toBeUndefined();
    expect(fontStylesheet.onload).toBeUndefined();
    expect(manifest.appHead.script ?? []).toEqual([]);
  }, 20000);

  it("keeps lazy fonts visible when CSP allows event handlers but blocks inline scripts", async () => {
    const { manifest } = await buildCompilerFixture(
      "resux-csp-lazy-fonts",
      `export default defineResuxConfig({
  modules: [
    ["resuxjs/fonts", {
      strategy: "lazy",
      google: [{ name: "Inter", weights: [400] }]
    }],
    ["resux:security", {
      contentSecurityPolicy: "default-src 'self'; style-src https://fonts.googleapis.com; script-src 'self'; script-src-attr 'unsafe-inline'"
    }]
  ]
})`,
    );
    const fontStylesheet = manifest.appHead.link.find((link: Record<string, string>) =>
      link.rel === "stylesheet" && String(link.href).includes("fonts.googleapis.com")
    );

    expect(fontStylesheet).toBeTruthy();
    expect(fontStylesheet.media).toBeUndefined();
    expect(manifest.appHead.script ?? []).toEqual([]);
  }, 20000);

  it("keeps inlined config CSS before existing head styles", async () => {
    const { manifest } = await buildCompilerFixture(
      "resux-inline-css-head-order",
      `export default defineResuxConfig({
  css: ["/app.css"],
  app: { head: { style: [{ id: "app-head", css: ".shared{color:blue}" }] } },
  modules: [["resux:performance", { inlineCssMaxBytes: 4096 }]]
})`,
      { publicFiles: { "app.css": ".shared{color:red}" } },
    );

    expect(manifest.appHead.style[0].css).toBe(".shared{color:red}");
    expect(manifest.appHead.style[1]).toEqual({ id: "app-head", css: ".shared{color:blue}" });
  }, 20000);

  it("runs tree-shakable UI, icon, and font module subpaths", async () => {
    const root = path.join(os.tmpdir(), `resux-ui-modules-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Design modules</main></template>");
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  modules: [
    ["resuxjs/fonts", { google: [{ name: "Inter", weights: [400, 700] }] }],
    ["resuxjs/icons", { component: "Icon", collections: ["material-symbols"] }],
    ["resuxjs/ui", { tokens: { accent: "#03C8BF" } }]
  ]
})`,
    );

    await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);

    expect(manifest.appHead.link).toEqual(expect.arrayContaining([
      expect.objectContaining({ rel: "stylesheet", href: expect.stringContaining("fonts.googleapis.com") })
    ]));
    expect(manifest.runtimeConfig.public.icons.collections).toEqual(["material-symbols"]);
    expect(manifest.runtimeConfig.public.ui.tokens.accent).toBe("#03C8BF");
  }, 20000);

  it("can emit Vite dev client inputs without production bundling", async () => {
    const root = path.join(os.tmpdir(), `resux-vite-dev-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><button>Home</button></template>");

    await buildProject(root, undefined, { vite: "dev" });
    const manifest = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8"));
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");
    const handler = await readFile(path.join(root, ".resux", "vite-client", "handlers", "m0.mjs"), "utf8");

    expect(manifest.features.vite).toBe("dev");
    expect(manifest.features.server).toBe("modules");
    expect(runtimeClient).toContain("createClientComponent");
    expect(handler).toContain("/__resux/runtime-client.mjs");
    await expect(readFile(path.join(root, ".resux", "client", "runtime-client.mjs"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "server-bundle", "index.mjs"), "utf8")).rejects.toThrow();
  });

  it("generates a static client package importer registry without raw import(packageName)", async () => {
    const root = path.join(process.cwd(), `.resux-test-package-registry-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
const loadVue = defineClientOnlyPackage("vue", { css: ["vue"] })
</script>
<template><main>Package Registry</main></template>`,
    );
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  packages: {
    lazy: ["vue"],
    clientOnly: ["vue"],
    css: {
      vue: ["vue"]
    }
  }
})`,
    );

    await buildProject(root, undefined, { vite: "dev" });
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(runtimeClient).toContain("const resuxPackageImporters = {");
    expect(runtimeClient).toContain('"vue": () => import("vue")');
    expect(runtimeClient).toContain('const resuxPackageCssImports = {"vue":["vue"]}');
    expect(runtimeClient).not.toContain("await import(packageName)");
    expect(runtimeClient).not.toContain("import(/* @vite-ignore */ packageName)");
  }, 20000);

  it("detects package API calls that use const string identifiers", async () => {
    const root = path.join(process.cwd(), `.resux-test-package-registry-const-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
const DEMO_PACKAGE = "vite"
const loadPackage = useClientPackage<Record<string, unknown>>(DEMO_PACKAGE, {
  css: ["vite"],
})
void loadPackage
</script>
<template><main>Package Registry Const</main></template>`,
    );

    await buildProject(root, undefined, { vite: "dev" });
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(runtimeClient).toContain('"vite": () => import("vite")');
    expect(runtimeClient).toContain('const resuxPackageCssImports = {"vite":["vite"]}');
    expect(runtimeClient).not.toContain("await import(packageName)");
    expect(runtimeClient).not.toContain("import(/* @vite-ignore */ packageName)");
  }, 20000);

  it("registers package subpath specifiers used by package APIs", async () => {
    const root = path.join(process.cwd(), `.resux-test-package-subpaths-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
const COMPILER_DOM_PACKAGE = "@vue/compiler-dom/dist/compiler-dom.cjs.js"
const loadCompilerDom = useClientPackage<Record<string, unknown>>(COMPILER_DOM_PACKAGE)
void loadCompilerDom
</script>
<template><main>Package Subpaths</main></template>`,
    );

    await buildProject(root, undefined, { vite: "dev" });
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(runtimeClient).toContain('"@vue/compiler-dom/dist/compiler-dom.cjs.js": () => import("@vue/compiler-dom/dist/compiler-dom.cjs.js")');
    expect(runtimeClient).not.toContain("await import(packageName)");
    expect(runtimeClient).not.toContain("import(/* @vite-ignore */ packageName)");
  }, 20000);

  it("discovers and bundles Vue islands", async () => {
    const root = path.join(os.tmpdir(), `resux-vue-islands-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "islands", "vue"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), `<template><main><VueIsland name="CounterIsland" :props="{ start: 2 }" /></main></template>`);
    await writeFile(
      path.join(root, "islands", "vue", "CounterIsland.vue"),
      `<script setup>import { ref } from "vue"; const props = defineProps({ start: Number }); const count = ref(props.start)</script><template><button @click="count++">{{ count }}</button></template>`
    );

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const html = result.components[0].serverSource;

    expect(result.vueIslands).toEqual([{ name: "CounterIsland", file: path.join(root, "islands", "vue", "CounterIsland.vue") }]);
    expect(manifest.vueIslands.CounterIsland).toBe("/__resux/vue-islands/CounterIsland.mjs");
    expect(html).toContain("VueIsland");
    await readFile(path.join(root, ".resux", "client", "vue-islands", "CounterIsland.mjs"), "utf8");
  }, 20000);
});
