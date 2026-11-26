import { describe, expect, it } from "vitest";
import { buildProject, createRouteManifest } from "resuxjs/compiler";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

describe("route manifest", () => {
  it("creates Resux-style routes with dynamic params", () => {
    const root = "/app";
    const routes = createRouteManifest(root, [
      "/app/pages/index.vue",
      "/app/pages/about.vue",
      "/app/pages/post/[id].vue",
      "/app/pages/docs/[section]/index.vue",
      "/app/pages/docs/[...slug].vue"
    ]);

    expect(routes.map((route) => route.path)).toEqual(["/docs/:section", "/docs/:slug*", "/post/:id", "/about", "/"]);
    expect(routes.find((route) => route.path === "/post/:id")?.params).toEqual(["id"]);
    expect(routes.find((route) => route.path === "/docs/:slug*")?.params).toEqual(["slug"]);
  });

  it("matches catch-all route params from generated manifests", async () => {
    const root = path.join(os.tmpdir(), `resux-catch-all-${Date.now()}`);
    await mkdir(path.join(root, "pages", "docs"), { recursive: true });
    await writeFile(path.join(root, "pages", "docs", "[...slug].vue"), "<template><main>Docs</main></template>");

    await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);

    expect(manifest.routes[0].path).toBe("/docs/:slug*");
    expect(manifest.routes[0].params).toEqual(["slug"]);
    expect(manifest.matchRoute("/docs/guide/intro")?.params).toEqual({ slug: "guide/intro" });
    expect(manifest.matchRoute("/docs")?.params).toEqual({ slug: "" });
  }, 20000);

  it("generates localized routes only when i18n module is enabled", async () => {
    const root = path.join(os.tmpdir(), `resux-i18n-routes-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(path.join(root, "pages", "about.vue"), "<template><main>About</main></template>");
    await writeFile(path.join(root, "resux.config.ts"), `export default defineResuxConfig({
  modules: ["resuxjs/i18n"],
  i18n: {
    defaultLocale: "en",
    fallbackLocale: "en",
    strategy: "prefix_except_default",
    locales: [
      { code: "en", name: "English", dir: "ltr" },
      { code: "ar", name: "Arabic", dir: "rtl" }
    ],
    messages: {
      en: { demo: { title: "Home" } },
      ar: { demo: { title: "Home AR" } }
    }
  }
})`, "utf8");

    await buildProject(root);
    const manifest = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8")) as {
      routes: Array<{ path: string }>;
    };
    const paths = manifest.routes.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining(["/", "/about", "/ar", "/ar/about"]));
    expect(paths).not.toContain("/en");
    expect(new Set(paths).size).toBe(paths.length);
  }, 20000);

  it("keeps incremental dev builds stable without wiping generated directories", async () => {
    const root = path.join(os.tmpdir(), `resux-dev-incremental-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    const indexFile = path.join(root, "pages", "index.vue");
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(indexFile, "<template><main>Initial</main></template>");

    await buildProject(root, outDir, { vite: "dev" });
    const sentinel = path.join(outDir, "vite-client", "sentinel.mjs");
    await writeFile(sentinel, "export const preserved = true;\n", "utf8");

    await writeFile(indexFile, "<template><main>Updated</main></template>");
    await buildProject(root, outDir, { vite: "dev", changedPath: indexFile });

    const sentinelSource = await readFile(sentinel, "utf8");
    expect(sentinelSource).toContain("preserved");

    const manifest = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8")) as {
      routes: Array<{ path: string }>;
    };
    expect(manifest.routes.some((route) => route.path === "/")).toBe(true);
  }, 25000);
});
