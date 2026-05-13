import { mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyDeploymentPostBuild, resolveDeployment } from "../src/deploy/index.js";

async function createTempApp(prefix: string): Promise<string> {
  const root = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "resux-temp-app", private: true }, null, 2),
    "utf8",
  );
  return root;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function scaffoldVercelBuildLayout(root: string): Promise<string> {
  const functionRoot = path.join(root, ".vercel", "output", "functions", "[...].func");
  await mkdir(path.join(root, ".vercel", "output", "static"), { recursive: true });
  await mkdir(functionRoot, { recursive: true });

  await mkdir(path.join(root, ".resux", "client"), { recursive: true });
  await writeFile(path.join(root, ".resux", "client", "runtime-client.mjs"), "export {};\n", "utf8");

  await mkdir(path.join(root, ".resux", "server"), { recursive: true });
  await writeFile(path.join(root, ".resux", "server", "manifest.mjs"), "export {};\n", "utf8");

  return functionRoot;
}

async function scaffoldSharpPackages(root: string): Promise<void> {
  const sharpRoot = path.join(root, "node_modules", "sharp");
  await mkdir(sharpRoot, { recursive: true });
  await writeFile(
    path.join(sharpRoot, "package.json"),
    JSON.stringify({
      name: "sharp",
      version: "1.0.0",
      dependencies: {
        "dep-a": "1.0.0",
      },
      optionalDependencies: {
        "@img/sharp-linux-x64": "1.0.0",
      },
    }, null, 2),
    "utf8",
  );

  const depARoot = path.join(root, "node_modules", "dep-a");
  await mkdir(depARoot, { recursive: true });
  await writeFile(
    path.join(depARoot, "package.json"),
    JSON.stringify({
      name: "dep-a",
      version: "1.0.0",
    }, null, 2),
    "utf8",
  );

  const platformRoot = path.join(root, "node_modules", "@img", "sharp-linux-x64");
  await mkdir(platformRoot, { recursive: true });
  await writeFile(
    path.join(platformRoot, "package.json"),
    JSON.stringify({
      name: "@img/sharp-linux-x64",
      version: "1.0.0",
    }, null, 2),
    "utf8",
  );
}

async function scaffoldFrameworkScopedSharpPackages(root: string): Promise<void> {
  const frameworkRoot = path.join(root, "node_modules", "resuxjs");
  await mkdir(frameworkRoot, { recursive: true });
  await writeFile(
    path.join(frameworkRoot, "package.json"),
    JSON.stringify({
      name: "resuxjs",
      version: "1.0.0",
      dependencies: {
        sharp: "1.0.0",
      },
    }, null, 2),
    "utf8",
  );

  const frameworkNodeModules = path.join(frameworkRoot, "node_modules");
  const sharpRoot = path.join(frameworkNodeModules, "sharp");
  await mkdir(sharpRoot, { recursive: true });
  await writeFile(
    path.join(sharpRoot, "package.json"),
    JSON.stringify({
      name: "sharp",
      version: "1.0.0",
      dependencies: {
        "dep-a": "1.0.0",
      },
      optionalDependencies: {
        "@img/sharp-linux-x64": "1.0.0",
      },
    }, null, 2),
    "utf8",
  );

  const depARoot = path.join(frameworkNodeModules, "dep-a");
  await mkdir(depARoot, { recursive: true });
  await writeFile(
    path.join(depARoot, "package.json"),
    JSON.stringify({
      name: "dep-a",
      version: "1.0.0",
    }, null, 2),
    "utf8",
  );

  const platformRoot = path.join(frameworkNodeModules, "@img", "sharp-linux-x64");
  await mkdir(platformRoot, { recursive: true });
  await writeFile(
    path.join(platformRoot, "package.json"),
    JSON.stringify({
      name: "@img/sharp-linux-x64",
      version: "1.0.0",
    }, null, 2),
    "utf8",
  );
}

describe("deployment resolution", () => {
  it("defaults auto mode to node for local builds even if vercel.json exists", async () => {
    const root = await createTempApp("resux-deploy-local");
    await writeFile(
      path.join(root, "vercel.json"),
      JSON.stringify({ framework: "nitro" }, null, 2),
      "utf8",
    );

    const resolved = await resolveDeployment(root, path.join(root, ".resux"), {});
    expect(resolved.target).toBe("node");
    expect(resolved.reason).toBe("default node target");
  });

  it("detects vercel preset when vercel runtime environment variables exist", async () => {
    const root = await createTempApp("resux-deploy-vercel-env");
    const resolved = await resolveDeployment(
      root,
      path.join(root, ".resux"),
      { VERCEL: "1", VERCEL_ENV: "preview" } as NodeJS.ProcessEnv,
    );

    expect(resolved.target).toBe("vercel");
    expect(resolved.nitroPreset).toBe("vercel");
    expect(resolved.reason).toContain("environment provider");
  });

  it("honors explicit deploy.target from resux config in local mode", async () => {
    const root = await createTempApp("resux-deploy-explicit");
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  deploy: {
    target: "vercel"
  }
});`,
      "utf8",
    );

    const resolved = await resolveDeployment(root, path.join(root, ".resux"), {});
    expect(resolved.target).toBe("vercel");
    expect(resolved.reason).toBe("resux.config deploy.target");
  });
});

describe("vercel post-build dependencies", () => {
  it("copies sharp runtime packages into each vercel function output", async () => {
    const root = await createTempApp("resux-deploy-vercel-sharp");
    const functionRoot = await scaffoldVercelBuildLayout(root);
    await scaffoldSharpPackages(root);

    await applyDeploymentPostBuild({
      appRoot: root,
      outDir: path.join(root, ".resux"),
      env: {} as NodeJS.ProcessEnv,
      nitroPreset: "vercel",
      target: "vercel",
    });

    expect(await fileExists(path.join(functionRoot, "node_modules", "sharp", "package.json"))).toBe(true);
    expect(await fileExists(path.join(functionRoot, "node_modules", "dep-a", "package.json"))).toBe(true);
    expect(await fileExists(path.join(functionRoot, "node_modules", "@img", "sharp-linux-x64", "package.json"))).toBe(true);
  });

  it("resolves sharp from installed resux framework dependencies when app root has no direct sharp", async () => {
    const root = await createTempApp("resux-deploy-vercel-framework-sharp");
    const functionRoot = await scaffoldVercelBuildLayout(root);
    await scaffoldFrameworkScopedSharpPackages(root);

    await applyDeploymentPostBuild({
      appRoot: root,
      outDir: path.join(root, ".resux"),
      env: {} as NodeJS.ProcessEnv,
      nitroPreset: "vercel",
      target: "vercel",
    });

    expect(await fileExists(path.join(functionRoot, "node_modules", "sharp", "package.json"))).toBe(true);
    expect(await fileExists(path.join(functionRoot, "node_modules", "dep-a", "package.json"))).toBe(true);
    expect(await fileExists(path.join(functionRoot, "node_modules", "@img", "sharp-linux-x64", "package.json"))).toBe(true);
  });

  it("throws a clear error when sharp cannot be resolved for vercel output", async () => {
    const root = await createTempApp("resux-deploy-vercel-no-sharp");
    await scaffoldVercelBuildLayout(root);

    await expect(
      applyDeploymentPostBuild({
        appRoot: root,
        outDir: path.join(root, ".resux"),
        env: {} as NodeJS.ProcessEnv,
        nitroPreset: "vercel",
        target: "vercel",
      }),
    ).rejects.toThrow('requires "sharp"');
  });
});
