import { mkdir, readFile } from "node:fs/promises";
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

    expect(packageJson.bin.resux).toBe("dist/cli.js");
    expect(packageJson.bin.resuxjs).toBe("dist/cli.js");
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

      expect(appPackage.dependencies).toEqual({
        resuxjs: `^${frameworkPackage.version}`
      });
      expect(appPackage.scripts).toMatchObject({
        dev: "resux dev .",
        build: "resux build .",
        preview: "resux preview .",
        start: "node .output/server/index.mjs",
        inspect: "resux inspect ."
      });
      expect(envTypes).toContain("resuxjs/globals");
      expect(nitroConfig).toContain('dir: ".resux/client"');
      expect(nitroConfig).toContain('baseURL: "/__resux"');
    } finally {
      process.chdir(cwd);
    }
  });
});
