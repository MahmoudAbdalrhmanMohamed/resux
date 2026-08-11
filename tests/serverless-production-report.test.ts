import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyDeploymentPostBuild } from "../src/deploy/index.js";

async function createTempApp(prefix: string): Promise<string> {
  const root = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "resux-serverless-report-test", private: true }, null, 2),
    "utf8",
  );
  return root;
}

async function scaffoldResuxOutput(root: string, includeReport = true): Promise<void> {
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

  if (includeReport) {
    await writeFile(
      path.join(root, ".resux", "halal-report.json"),
      JSON.stringify({ status: "pass", signature: "hmac-sha256:test" }, null, 2),
      "utf8",
    );
  }
}

async function scaffoldSharp(root: string): Promise<void> {
  const sharpRoot = path.join(root, "node_modules", "sharp");
  await mkdir(sharpRoot, { recursive: true });
  await writeFile(
    path.join(sharpRoot, "package.json"),
    JSON.stringify({
      name: "sharp",
      version: "1.0.0",
      type: "module",
      exports: "./index.js",
    }, null, 2),
    "utf8",
  );
  await writeFile(path.join(sharpRoot, "index.js"), "export default function sharp() {}\n", "utf8");
}

async function readPackagedReport(file: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
}

describe("serverless production report packaging", () => {
  it("packages the signed report into every Vercel function runtime", async () => {
    const root = await createTempApp("resux-vercel-report");
    await scaffoldResuxOutput(root);
    await scaffoldSharp(root);

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

    const report = await readPackagedReport(
      path.join(functionRoot, ".resux", "halal-report.json"),
    );
    expect(report.status).toBe("pass");
  });

  it("packages the signed report into every Netlify function runtime", async () => {
    const root = await createTempApp("resux-netlify-report");
    await scaffoldResuxOutput(root);
    await scaffoldSharp(root);

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

    const report = await readPackagedReport(
      path.join(functionRoot, ".resux", "halal-report.json"),
    );
    expect(report.status).toBe("pass");
  });

  it("fails deployment packaging early when the production report is missing", async () => {
    const root = await createTempApp("resux-vercel-report-missing");
    await scaffoldResuxOutput(root, false);
    await scaffoldSharp(root);

    await mkdir(path.join(root, ".vercel", "output", "static"), { recursive: true });
    await mkdir(path.join(root, ".vercel", "output", "functions", "[...].func"), { recursive: true });

    await expect(
      applyDeploymentPostBuild({
        appRoot: root,
        outDir: path.join(root, ".resux"),
        env: {} as NodeJS.ProcessEnv,
        nitroPreset: "vercel",
        target: "vercel",
      }),
    ).rejects.toThrow(".resux/halal-report.json");
  });
});
