import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runResuxCli } from "../src/cli.ts";

const tempRoots: string[] = [];

afterEach(async () => {
  process.exitCode = 0;
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("cli generated directory bootstrap", () => {
  it("creates generated directories and placeholder artifacts during prepare", async () => {
    const root = await createMinimalProject("resux-prepare");

    await runResuxCli(["prepare", root]);

    const requiredDirs = [
      ".resux",
      ".resux/dev",
      ".resux/cache",
      ".resux/types",
      ".resux/manifest",
      ".resux/vite-client",
      ".resux-nitro",
      ".resux-nitro/cache",
      ".resux-nitro/types",
      ".resux-nitro/manifest",
      ".nitro",
      ".nitro/types",
      ".nitro/cache",
    ];
    const requiredFiles = [
      ".resux/types/resux.d.ts",
      ".resux/types/imports.d.ts",
      ".resux/manifest/routes.json",
      ".resux/manifest/plugins.json",
      ".resux/manifest/middleware.json",
      ".resux-nitro/manifest/server-handlers.json",
      ".nitro/types/nitro.d.ts",
      ".resux/client/runtime-client.mjs",
    ];

    for (const directory of requiredDirs) {
      await expect(directoryExists(path.join(root, directory))).resolves.toBe(true);
    }
    for (const file of requiredFiles) {
      await expect(fileExists(path.join(root, file))).resolves.toBe(true);
    }
  }, 120000);

  it("normalizes a legacy .nuxt buildDir to the Resux output directory", async () => {
    const root = await createMinimalProject("resux-legacy-build-dir");
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({ buildDir: ".nuxt" })\n`,
      "utf8",
    );

    await runResuxCli(["prepare", root]);

    await expect(directoryExists(path.join(root, ".resux"))).resolves.toBe(true);
    await expect(fileExists(path.join(root, ".resux", "client", "runtime-client.mjs"))).resolves.toBe(true);
    await expect(directoryExists(path.join(root, ".nuxt"))).resolves.toBe(false);
  }, 120000);

  it("check --fix appends gitignore entries and keeps existing generated files", async () => {
    const root = await createMinimalProject("resux-check-fix");
    const gitignoreFile = path.join(root, ".gitignore");
    const sentinelFile = path.join(root, ".resux", "types", "resux.d.ts");

    await writeFile(gitignoreFile, "node_modules\ncustom-entry\n", "utf8");
    await mkdir(path.dirname(sentinelFile), { recursive: true });
    await writeFile(sentinelFile, "// keep-me\nexport {};\n", "utf8");

    await runResuxCli(["check", root, "--fix"]);

    const gitignore = await readFile(gitignoreFile, "utf8");
    const sentinel = await readFile(sentinelFile, "utf8");
    expect(gitignore).toContain("custom-entry");
    expect(gitignore).toContain(".resux");
    expect(gitignore).toContain(".resux-nitro");
    expect(gitignore).toContain(".nitro");
    expect(gitignore).toContain(".env.*");
    expect(gitignore).toContain("!.env.example");
    expect(sentinel).toContain("keep-me");
    await expect(directoryExists(path.join(root, ".resux-nitro"))).resolves.toBe(true);
    await expect(directoryExists(path.join(root, ".nitro"))).resolves.toBe(true);
  }, 120000);

  it("adds Cloudflare node compatibility to an existing Nitro config without replacing user settings", async () => {
    const root = await createMinimalProject("resux-existing-nitro-config");
    const nitroConfigFile = path.join(root, "nitro.config.ts");
    await writeFile(
      nitroConfigFile,
      `import { defineNitroConfig } from "nitropack/config";\n\nexport default defineNitroConfig({\n  compatibilityDate: "2026-05-02",\n  cloudflare: {\n    wrangler: { configPath: "./wrangler.jsonc" }\n  },\n  customFlag: "keep-me",\n  prerender: { crawlLinks: false, routes: [] }\n});\n`,
      "utf8",
    );

    await runResuxCli(["prepare", root]);

    const nitroConfig = await readFile(nitroConfigFile, "utf8");
    expect(nitroConfig).toContain("cloudflare: {");
    expect(nitroConfig).toContain("nodeCompat: true");
    expect(nitroConfig).toContain('wrangler: { configPath: "./wrangler.jsonc" }');
    expect(nitroConfig).toContain('customFlag: "keep-me"');
  }, 120000);
});

async function createMinimalProject(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  tempRoots.push(root);
  await mkdir(path.join(root, "pages"), { recursive: true });
  await mkdir(path.join(root, "layouts"), { recursive: true });
  await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>\n", "utf8");
  await writeFile(path.join(root, "layouts", "default.vue"), "<template><div><slot /></div></template>\n", "utf8");
  await writeFile(
    path.join(root, "resux.config.ts"),
    "export default defineResuxConfig({})\n",
    "utf8",
  );
  await writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify({
      name: "resux-generated-dir-test",
      private: true,
      type: "module",
      scripts: {
        prepare: "resux prepare",
        dev: "resux dev",
        build: "resux build",
        preview: "resux preview",
        start: "resux start",
        inspect: "resux inspect",
      },
      dependencies: {
        resuxjs: "workspace:*",
      },
    }, null, 2)}\n`,
    "utf8",
  );
  return root;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    const info = await stat(directoryPath);
    return info.isDirectory();
  } catch {
    return false;
  }
}
