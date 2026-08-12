import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";

const pageSource = "<template><main>Localized route fixture</main></template>";

async function createFixture(strategy: "prefix" | "prefix_except_default" | "no_prefix") {
  const root = path.join(os.tmpdir(), `resux-i18n-route-${strategy}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(path.join(root, "pages", "products"), { recursive: true });
  await mkdir(path.join(root, "pages", "docs"), { recursive: true });
  await writeFile(path.join(root, "pages", "index.vue"), pageSource);
  await writeFile(path.join(root, "pages", "about.vue"), pageSource);
  await writeFile(path.join(root, "pages", "products", "[id].vue"), pageSource);
  await writeFile(path.join(root, "pages", "docs", "[...slug].vue"), pageSource);
  await writeFile(path.join(root, "resux.config.ts"), `export default defineResuxConfig({
  modules: ["resuxjs/i18n"],
  i18n: {
    defaultLocale: "en",
    fallbackLocale: "en",
    strategy: ${JSON.stringify(strategy)},
    locales: [
      { code: "en", name: "English", dir: "ltr" },
      { code: "ar", name: "العربية", dir: "rtl" }
    ],
    messages: {
      en: { common: { title: "English" } },
      ar: { common: { title: "Arabic" } }
    }
  }
})`, "utf8");

  await buildProject(root);
  const publicManifest = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8")) as {
    routes: Array<{ path: string; id: string; params: string[] }>;
  };
  const serverManifest = await import(
    `${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}-${Math.random()}`
  );
  return { root, publicManifest, serverManifest };
}

describe("i18n route generation", () => {
  it("injects every locale into the real manifest for prefix", async () => {
    const { publicManifest, serverManifest } = await createFixture("prefix");
    const paths = publicManifest.routes.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining([
      "/en",
      "/ar",
      "/en/about",
      "/ar/about",
      "/en/products/:id",
      "/ar/products/:id",
      "/en/docs/:slug*",
      "/ar/docs/:slug*"
    ]));
    expect(paths).not.toContain("/about");
    expect(new Set(paths).size).toBe(paths.length);

    expect(serverManifest.matchRoute("/ar/products/42")?.params).toEqual({ id: "42" });
    expect(serverManifest.matchRoute("/ar/docs/guide/routing")?.params).toEqual({ slug: "guide/routing" });
    expect(serverManifest.matchRoute("/ar/about")?.route.path).toBe("/ar/about");
  }, 30000);

  it("keeps the default locale unprefixed for prefix_except_default", async () => {
    const { publicManifest, serverManifest } = await createFixture("prefix_except_default");
    const paths = publicManifest.routes.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining([
      "/",
      "/about",
      "/products/:id",
      "/docs/:slug*",
      "/ar",
      "/ar/about",
      "/ar/products/:id",
      "/ar/docs/:slug*"
    ]));
    expect(paths).not.toContain("/en/about");

    expect(serverManifest.matchRoute("/products/7")?.params).toEqual({ id: "7" });
    expect(serverManifest.matchRoute("/ar/products/7")?.params).toEqual({ id: "7" });
  }, 30000);

  it("does not generate locale-prefixed page records for no_prefix", async () => {
    const { publicManifest, serverManifest } = await createFixture("no_prefix");
    const paths = publicManifest.routes.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining([
      "/",
      "/about",
      "/products/:id",
      "/docs/:slug*"
    ]));
    expect(paths.some((routePath) => routePath.startsWith("/en/"))).toBe(false);
    expect(paths.some((routePath) => routePath.startsWith("/ar/"))).toBe(false);
    expect(serverManifest.matchRoute("/products/9")?.params).toEqual({ id: "9" });
    expect(serverManifest.matchRoute("/ar/products/9")).toBeNull();
  }, 30000);

  it("reuses the same compiled page module id across localized route records without duplicating page source", async () => {
    const { publicManifest } = await createFixture("prefix");
    const english = publicManifest.routes.find((route) => route.path === "/en/about");
    const arabic = publicManifest.routes.find((route) => route.path === "/ar/about");

    expect(english).toBeTruthy();
    expect(arabic).toBeTruthy();
    expect(english?.id).toBe(arabic?.id);
  }, 30000);
});
