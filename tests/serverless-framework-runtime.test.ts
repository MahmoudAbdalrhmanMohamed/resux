import { mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyDeploymentPostBuild } from "../src/deploy/index.js";

async function createTempApp(prefix: string): Promise<string> {
  const root = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "resux-serverless-framework-runtime-test",
      private: true,
      type: "module",
      dependencies: { resuxjs: "1.0.0", sharp: "1.0.0" },
    }, null, 2),
    "utf8",
  );
  return root;
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function scaffoldResuxOutput(root: string): Promise<void> {
  await mkdir(path.join(root, ".resux", "client"), { recursive: true });
  await writeFile(
    path.join(root, ".resux", "client", "runtime-client.mjs"),
    "export {};\n",
    "utf8",
  );

  await mkdir(path.join(root, ".resux", "server"), { recursive: true });
  await writeFile(
    path.join(root, ".resux", "server", "manifest.mjs"),
    "export {};\n",
    "utf8",
  );
  await writeFile(
    path.join(root, ".resux", "server", "m6.mjs"),
    'import "resuxjs"; export default {};\n',
    "utf8",
  );
  await writeFile(
    path.join(root, ".resux", "halal-report.json"),
    JSON.stringify({ status: "pass", signature: "hmac-sha256:test" }, null, 2),
    "utf8",
  );
}

async function scaffoldFrameworkPackage(root: string): Promise<void> {
  const packageRoot = path.join(root, "node_modules", "resuxjs");
  await mkdir(path.join(packageRoot, "dist"), { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify({
      name: "resuxjs",
      version: "1.0.0",
      type: "module",
      main: "./dist/index.js",
      exports: {
        ".": "./dist/index.js",
        "./node": "./dist/node.js",
        "./package.json": "./package.json",
      },
    }, null, 2),
    "utf8",
  );
  await writeFile(path.join(packageRoot, "dist", "index.js"), "export const runtime = true;\n", "utf8");
  await writeFile(path.join(packageRoot, "dist", "node.js"), "export const nodeRuntime = true;\n", "utf8");
}

async function scaffoldSharp(root: string): Promise<void> {
  const packageRoot = path.join(root, "node_modules", "sharp");
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify({ name: "sharp", version: "1.0.0", type: "module", exports: "./index.js" }, null, 2),
    "utf8",
  );
  await writeFile(path.join(packageRoot, "index.js"), "export default function sharp() {}\n", "utf8");
}

async function scaffoldAppRuntime(root: string): Promise<void> {
  await scaffoldResuxOutput(root);
  await scaffoldFrameworkPackage(root);
  await scaffoldSharp(root);
}

describe("serverless framework runtime packaging", () => {
  it("packages resuxjs dist into every Vercel function", async () => {
    const root = await createTempApp("resux-vercel-framework-runtime");
    await scaffoldAppRuntime(root);

    const functionRoot = path.join(root, ".vercel", "output", "functions", "[...].func");
    await mkdir(path.join(root, ".vercel", "output", "static"), { recursive: true });
    await mkdir(functionRoot, { recursive: true });

    await applyDeploymentPostBuild({
      appRoot: root,
      outDir: path.join(root, ".resux"),
      env: {} as NodeJS.ProcessEnv,
      nitroPreset: "vercel",
      target: "vercel",
    });

    expect(await exists(path.join(functionRoot, "node_modules", "resuxjs", "package.json"))).toBe(true);
    expect(await exists(path.join(functionRoot, "node_modules", "resuxjs", "dist", "index.js"))).toBe(true);
    expect(await exists(path.join(functionRoot, "node_modules", "resuxjs", "dist", "node.js"))).toBe(true);
  });

  it("packages resuxjs dist into every Netlify function", async () => {
    const root = await createTempApp("resux-netlify-framework-runtime");
    await scaffoldAppRuntime(root);

    const functionRoot = path.join(root, ".netlify", "functions-internal", "server");
    await mkdir(path.join(root, "dist"), { recursive: true });
    await mkdir(path.join(root, ".output"), { recursive: true });
    await mkdir(functionRoot, { recursive: true });

    await applyDeploymentPostBuild({
      appRoot: root,
      outDir: path.join(root, ".resux"),
      env: {} as NodeJS.ProcessEnv,
      nitroPreset: "netlify",
      target: "netlify",
    });

    expect(await exists(path.join(functionRoot, "node_modules", "resuxjs", "package.json"))).toBe(true);
    expect(await exists(path.join(functionRoot, "node_modules", "resuxjs", "dist", "index.js"))).toBe(true);
    expect(await exists(path.join(functionRoot, "node_modules", "resuxjs", "dist", "node.js"))).toBe(true);
  });
});
