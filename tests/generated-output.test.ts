import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject } from "../src/compiler/index.js";

describe("generated app artifacts", () => {
  it("emits deterministic .resux app and type files", async () => {
    const root = path.join(os.tmpdir(), `resux-generated-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({ compatibilityDate: "2026-05-20" });\n`,
      "utf8",
    );
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<template><main><h1>Hi</h1></main></template>\n<script setup lang="ts">\ndefinePageMeta({ title: "home" })\n</script>\n`,
      "utf8",
    );

    try {
      await buildProject(root, outDir, { vite: "build", server: "modules" });

      const buildManifest = JSON.parse(
        await readFile(path.join(outDir, "manifest", "build-manifest.json"), "utf8"),
      ) as { routes?: string[] };
      const appMjs = await readFile(path.join(outDir, "app.mjs"), "utf8");
      const routesMjs = await readFile(path.join(outDir, "routes.mjs"), "utf8");
      const importsDts = await readFile(path.join(outDir, "imports.d.ts"), "utf8");

      expect(buildManifest.routes).toContain("/");
      expect(appMjs).toContain("routes");
      expect(routesMjs).toContain('"path": "/"');
      expect(importsDts).toContain('"useRoute"');
      expect(importsDts).toContain('"$fetch"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120000);
});
