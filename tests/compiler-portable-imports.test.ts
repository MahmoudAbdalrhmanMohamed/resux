import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

describe("portable server user-module imports", () => {
  it("uses the configured output directory and URL-safe relative specifiers", async () => {
    const root = path.join(os.tmpdir(), `resux-portable-imports-${Date.now()}`);
    const outDir = path.join(root, ".custom-resux");
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "composables"), { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "portable-import-test", private: true, type: "module" }, null, 2),
      "utf8",
    );
    await writeFile(
      path.join(root, "composables", "use#Thing.ts"),
      'export function useThing() { return "portable"; }\n',
      "utf8",
    );
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
import { useThing } from "../composables/use#Thing";
const value = useThing();
</script>
<template><main>{{ value }}</main></template>`,
      "utf8",
    );

    await buildProject(root, outDir);

    const serverDir = path.join(outDir, "server");
    const moduleFiles = (await readdir(serverDir)).filter((name) => /^m\d+\.mjs$/.test(name));
    const moduleSources = await Promise.all(
      moduleFiles.map(async (name) => ({
        name,
        source: await readFile(path.join(serverDir, name), "utf8"),
      })),
    );
    const pageModule = moduleSources.find((entry) => entry.source.includes("useThing"));
    expect(pageModule).toBeDefined();
    expect(pageModule?.source).toContain('from "./imported/composables/use_23_Thing.mjs"');
    expect(pageModule?.source).not.toContain("file://");
    expect(await readFile(path.join(serverDir, "imported", "composables", "use_23_Thing.mjs"), "utf8"))
      .toContain("function useThing");
    await import(`${pathToFileURL(path.join(serverDir, "manifest.mjs")).href}?t=${Date.now()}`);
  }, 20000);
});
