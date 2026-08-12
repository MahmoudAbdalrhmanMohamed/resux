import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";

interface GeneratedManifest {
  runtimeConfig?: {
    runtimeConfig?: {
      public?: {
        __resuxBuildId?: string;
      };
    };
  };
}

async function readBuildId(root: string): Promise<string> {
  const manifest = JSON.parse(
    await readFile(path.join(root, ".resux", "manifest.json"), "utf8"),
  ) as GeneratedManifest;
  const buildId = manifest.runtimeConfig?.runtimeConfig?.public?.__resuxBuildId;
  expect(buildId).toMatch(/^[a-f0-9]{24}$/);
  return buildId!;
}

describe("deployment build compatibility", () => {
  it("keeps an unchanged build ID stable and changes it when resumable output changes", async () => {
    const root = path.join(os.tmpdir(), `resux-build-id-${Date.now()}`);
    const page = path.join(root, "pages", "index.vue");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(
      page,
      `<script setup>\nconst count = ref(0)\nfunction increment() { count.value++ }\n</script>\n<template><button @click="increment">{{ count }}</button></template>`,
      "utf8",
    );

    await buildProject(root);
    const first = await readBuildId(root);

    await buildProject(root);
    const second = await readBuildId(root);
    expect(second).toBe(first);

    await writeFile(
      page,
      `<script setup>\nconst count = ref(0)\nfunction increment() { count.value += 2 }\n</script>\n<template><button @click="increment">{{ count }}</button></template>`,
      "utf8",
    );
    await buildProject(root);
    const third = await readBuildId(root);
    expect(third).not.toBe(first);
  }, 30000);
});
