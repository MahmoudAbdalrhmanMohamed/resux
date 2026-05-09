import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDeployment } from "../src/deploy/index.js";

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
