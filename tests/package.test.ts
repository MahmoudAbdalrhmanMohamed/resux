import { mkdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCreateResux } from "resuxjs/create";
import { getClientRuntimeSource } from "resuxjs/runtime";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

interface PackageJson {
  version: string;
  license?: string;
  bin: Record<string, string>;
  exports: Record<string, string | Record<string, string>>;
  sideEffects?: boolean;
}

async function readPackageJson(): Promise<PackageJson> {
  return JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
}

describe("package exports", () => {
  it("keeps the public root runtime-only and moves Node code behind resuxjs/node", async () => {
    const packageJson = await readPackageJson();
    const rootIndex = await readFile(path.join(repoRoot, "src", "index.ts"), "utf8");
    const nodeEntry = await readFile(path.join(repoRoot, "src", "node.ts"), "utf8");
    const createWrapper = await readFile(path.join(repoRoot, "packages", "create-resuxjs", "index.js"), "utf8");

    expect(packageJson.bin.resux).toBe("dist/bin.js");
    expect(packageJson.bin.resuxjs).toBe("dist/bin.js");
    expect(packageJson.bin["create-resux"]).toBe("dist/create-bin.js");
    expect(packageJson.bin["create-resuxjs"]).toBe("dist/create-bin.js");
    expect(exportRecord(packageJson, ".").import).toBe("./dist/index.js");
    expect(exportRecord(packageJson, "./node").import).toBe("./dist/node.js");
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.sideEffects).toBe(false);
    expect(rootIndex.trim()).toBe('export * from "./runtime/index.js";');
    expect(rootIndex).not.toMatch(/node:|vite|compiler|create\.js|createResuxNodeHandler/);
    expect(nodeEntry).toContain('from "./cli.js"');
    expect(createWrapper).toContain('require.resolve("resuxjs/create")');
  });

  it("keeps generated client runtime source free of compiler and Node server imports", () => {
    const clientRuntime = getClientRuntimeSource();

    expect(clientRuntime).toContain("installResux()");
    expect(clientRuntime).not.toMatch(/from ["']node:|resuxjs\/compiler|@vitejs|nitropack|node:fs|node:http|from ["']h3["']/);
  });

  it("exposes reactivity APIs from root and reactivity subpath", async () => {
    const rootExports = await import("resuxjs");
    const reactivityExports = await import("resuxjs/reactivity");

    expect(typeof rootExports.ref).toBe("function");
    expect(typeof rootExports.reactive).toBe("function");
    expect(typeof rootExports.computed).toBe("function");
    expect(typeof rootExports.watch).toBe("function");
    expect(typeof rootExports.watchEffect).toBe("function");
    expect(typeof rootExports.readonly).toBe("function");
    expect(typeof rootExports.toRef).toBe("function");
    expect(typeof rootExports.toRefs).toBe("function");
    expect(typeof rootExports.unref).toBe("function");
    expect(typeof rootExports.isRef).toBe("function");
    expect(typeof rootExports.isReactive).toBe("function");
    expect(typeof rootExports.isReadonly).toBe("function");
    expect(typeof rootExports.nextTick).toBe("function");
    expect(typeof reactivityExports.ref).toBe("function");
  });
});

function exportRecord(packageJson: PackageJson, key: string): Record<string, string> {
  const value = packageJson.exports[key];
  if (!value || typeof value === "string") {
    throw new Error(`Expected package export "${key}" to be a conditional export.`);
  }
  return value;
}

describe("create app", () => {
  it("scaffolds a starter with only the framework dependency", async () => {
    const tempRoot = path.join(os.tmpdir(), `resux-create-${Date.now()}`);
    const cwd = process.cwd();
    await mkdir(tempRoot, { recursive: true });

    try {
      process.chdir(tempRoot);
      await runCreateResux(["demo-app", "--yes", "--no-install"]);

      const frameworkPackage = await readPackageJson();
      const appPackage = JSON.parse(await readFile(path.join(tempRoot, "demo-app", "package.json"), "utf8"));
      const envTypes = await readFile(path.join(tempRoot, "demo-app", "env.d.ts"), "utf8");
      const nitroConfig = await readFile(path.join(tempRoot, "demo-app", "nitro.config.ts"), "utf8");
      const resuxConfig = await readFile(path.join(tempRoot, "demo-app", "resux.config.ts"), "utf8");
      const npmrc = await readFile(path.join(tempRoot, "demo-app", ".npmrc"), "utf8");
      const envExample = await readFile(path.join(tempRoot, "demo-app", ".env.example"), "utf8");
      const gitignore = await readFile(path.join(tempRoot, "demo-app", ".gitignore"), "utf8");
      const appTypes = await readFile(path.join(tempRoot, "demo-app", "types", "app.d.ts"), "utf8");
      const favicon = await readFile(path.join(tempRoot, "demo-app", "public", "favicon.svg"), "utf8");

      expect(appPackage.dependencies).toEqual({
        resuxjs: `^${frameworkPackage.version}`
      });
      expect(appPackage.scripts).toMatchObject({
        prepare: "resux prepare",
        dev: "resux dev",
        build: "resux build",
        preview: "resux preview",
        start: "resux start",
        inspect: "resux inspect",
        typecheck: "vue-tsc --noEmit"
      });
      expect(appPackage.devDependencies).toMatchObject({
        "@types/node": "^24.10.1",
        "vue-tsc": "^3.1.2",
      });
      expect(envTypes).toContain("resuxjs/globals");
      expect(appTypes).toContain("resuxjs/globals");
      expect(npmrc).toContain("engine-strict=true");
      expect(envExample).toContain("APP_ORIGIN=");
      expect(gitignore).toContain(".resux");
      expect(gitignore).toContain(".resux-nitro");
      expect(gitignore).toContain(".nitro");
      expect(gitignore).toContain(".env.*");
      expect(gitignore).toContain("!.env.example");
      expect(favicon).toContain("<svg");
      expect(nitroConfig).toContain('dir: ".resux/client"');
      expect(nitroConfig).toContain('baseURL: "/__resux"');
      expect(resuxConfig).not.toContain("resuxjs/i18n");
      expect(await fileExists(path.join(tempRoot, "demo-app", ".resux"))).toBe(false);
      expect(await fileExists(path.join(tempRoot, "demo-app", ".resux-nitro"))).toBe(false);
      expect(await fileExists(path.join(tempRoot, "demo-app", ".nitro"))).toBe(false);
      expect(await fileExists(path.join(tempRoot, "demo-app", "locales", "en.json"))).toBe(false);
      expect(await fileExists(path.join(tempRoot, "demo-app", "pages", "i18n.vue"))).toBe(false);
    } finally {
      process.chdir(cwd);
    }
  });

  it("scaffolds i18n and pwa only when selected as optional features", async () => {
    const tempRoot = path.join(os.tmpdir(), `resux-create-features-${Date.now()}`);
    const cwd = process.cwd();
    await mkdir(tempRoot, { recursive: true });

    try {
      process.chdir(tempRoot);
      await runCreateResux(["demo-features", "--yes", "--no-install", "--features", "i18n,pwa"]);

      const root = path.join(tempRoot, "demo-features");
      const resuxConfig = await readFile(path.join(root, "resux.config.ts"), "utf8");
      const i18nPage = await readFile(path.join(root, "pages", "i18n.vue"), "utf8");
      const enMessages = JSON.parse(await readFile(path.join(root, "locales", "en.json"), "utf8")) as Record<string, unknown>;
      const arMessages = JSON.parse(await readFile(path.join(root, "locales", "ar.json"), "utf8")) as Record<string, unknown>;
      const manifest = await readFile(path.join(root, "public", "manifest.webmanifest"), "utf8");
      const defaultLayout = await readFile(path.join(root, "layouts", "default.vue"), "utf8");

      expect(resuxConfig).toContain('"resuxjs/i18n"');
      expect(resuxConfig).toContain("i18n:");
      expect(resuxConfig).toContain('strategy: "prefix_except_default"');
      expect(resuxConfig).toContain("seo:");
      expect(resuxConfig).toContain("hreflang: false");
      expect(i18nPage).toContain('import { useI18n } from "resuxjs/i18n"');
      expect(i18nPage).toContain("switchLocalePath('ar')");
      expect(defaultLayout).toContain('to="/i18n"');
      expect(manifest).toContain('"display": "standalone"');
      expect((enMessages as { demo?: { welcome?: string } }).demo?.welcome).toContain("{name}");
      expect((arMessages as { demo?: unknown }).demo).toBeTruthy();
    } finally {
      process.chdir(cwd);
    }
  });

  it("enables hreflang only when explicitly requested", async () => {
    const tempRoot = path.join(os.tmpdir(), `resux-create-hreflang-${Date.now()}`);
    const cwd = process.cwd();
    await mkdir(tempRoot, { recursive: true });

    try {
      process.chdir(tempRoot);
      await runCreateResux(["demo-hreflang", "--yes", "--no-install", "--features", "i18n", "--hreflang"]);

      const root = path.join(tempRoot, "demo-hreflang");
      const resuxConfig = await readFile(path.join(root, "resux.config.ts"), "utf8");

      expect(resuxConfig).toContain('"resuxjs/i18n"');
      expect(resuxConfig).toContain("seo:");
      expect(resuxConfig).toContain("hreflang: true");
    } finally {
      process.chdir(cwd);
    }
  });

  it("scaffolds package compatibility routes with SSR-first pages and enhancement plugin", async () => {
    const tempRoot = path.join(os.tmpdir(), `resux-create-packages-${Date.now()}`);
    const cwd = process.cwd();
    await mkdir(tempRoot, { recursive: true });

    try {
      process.chdir(tempRoot);
      await runCreateResux(["demo-packages", "--yes", "--no-install", "--template", "package-compatibility"]);

      const root = path.join(tempRoot, "demo-packages");
      const indexPage = await readFile(path.join(root, "pages", "package-tests", "index.vue"), "utf8");
      const swiperPage = await readFile(path.join(root, "pages", "package-tests", "swiper.vue"), "utf8");
      const plugin = await readFile(path.join(root, "plugins", "package-enhancements.client.ts"), "utf8");
      const resuxConfig = await readFile(path.join(root, "resux.config.ts"), "utf8");

      expect(indexPage).toContain('/package-tests/swiper');
      expect(indexPage).toContain('/package-tests/missing-package');
      expect(swiperPage).toContain('use-client-enhancement="swiper-carousel"');
      expect(swiperPage).toContain("<h1>Swiper package demo</h1>");
      expect(plugin).toContain('defineClientEnhancement("swiper-carousel"');
      expect(plugin).toContain("useClientPackage<SwiperLike>(SWIPER_PACKAGE");
      expect(plugin).toContain('defineClientEnhancement("missing-package-demo"');
      expect(plugin).not.toContain('import("swiper")');
      expect(resuxConfig).toContain('packages:');
      expect(resuxConfig).toContain('"swiper": "progressive"');
    } finally {
      process.chdir(cwd);
    }
  });
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
