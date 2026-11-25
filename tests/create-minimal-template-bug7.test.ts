import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCreateResux } from "../src/create.js";
import { buildProject } from "../src/compiler/index.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe("Bug 7: Minimal template scaffold cleanup", () => {
  let tempRoot: string;
  let cwd: string;

  beforeEach(async () => {
    cwd = process.cwd();
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "resux-create-minimal-"));
    process.chdir(tempRoot);
  });

  afterEach(async () => {
    process.chdir(cwd);
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("scaffolds a truly minimal template without plugins, middleware, islands, stats API or logger", async () => {
    await runCreateResux(["my-minimal-app", "--template", "minimal", "--yes", "--no-install"]);

    const root = path.join(tempRoot, "my-minimal-app");

    // Essential files must exist
    expect(await pathExists(path.join(root, "app.vue"))).toBe(true);
    expect(await pathExists(path.join(root, "pages", "index.vue"))).toBe(true);
    expect(await pathExists(path.join(root, "resux.config.ts"))).toBe(true);
    expect(await pathExists(path.join(root, "package.json"))).toBe(true);
    expect(await pathExists(path.join(root, "tsconfig.json"))).toBe(true);
    expect(await pathExists(path.join(root, ".gitignore"))).toBe(true);
    expect(await pathExists(path.join(root, ".npmrc"))).toBe(true);
    // minimal ships no vitest dependency, so it must not opt into legacy peer resolution
    expect(await readFile(path.join(root, ".npmrc"), "utf8")).not.toContain("legacy-peer-deps");
    expect(await pathExists(path.join(root, ".env.example"))).toBe(true);

    // Scaffold noise that MUST NOT exist in minimal
    expect(await pathExists(path.join(root, "plugins"))).toBe(false);
    expect(await pathExists(path.join(root, "middleware"))).toBe(false);
    expect(await pathExists(path.join(root, "islands"))).toBe(false);
    expect(await pathExists(path.join(root, "pages", "about.vue"))).toBe(false);
    expect(await pathExists(path.join(root, "server", "api", "stats.ts"))).toBe(false);
    expect(await pathExists(path.join(root, "server", "middleware", "logger.ts"))).toBe(false);
    expect(await pathExists(path.join(root, "server", "plugins", "example.ts"))).toBe(false);

    // Minimal pages/index.vue must not have auth middleware, stats API, or CounterIsland
    const indexSource = await readFile(path.join(root, "pages", "index.vue"), "utf8");
    expect(indexSource).not.toContain("auth");
    expect(indexSource).not.toContain("/api/stats");
    expect(indexSource).not.toContain("CounterIsland");
    expect(indexSource).not.toContain("VueIsland");
    expect(indexSource).not.toContain("/about");

    // Minimal project should build cleanly
    const buildResult = await buildProject(root, path.join(root, ".resux"), { vite: "dev" });
    expect(buildResult.routes.length).toBe(1);
    expect(buildResult.routes[0].path).toBe("/");
    expect(buildResult.plugins.length).toBe(0);
    expect(buildResult.middleware.length).toBe(0);
    expect(buildResult.vueIslands.length).toBe(0);
  });
});
