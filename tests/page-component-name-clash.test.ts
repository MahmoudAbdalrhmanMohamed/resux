import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";

// A page and an auto-discovered component with the same resolved name used to make the server render
// recurse until it ran out of memory. The build now stops with a message that names both files.

async function project(files: Record<string, string>): Promise<string> {
  const root = path.join(os.tmpdir(), `resux-name-clash-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  for (const [name, source] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), source, "utf8");
  }
  return root;
}

describe("page and component name clash", () => {
  it("fails the build when a page resolves to the name of a component", async () => {
    const root = await project({
      "pages/bt-panel.vue": `<template><main><BtPanel /></main></template>`,
      "components/BtPanel.vue": `<template><section>panel</section></template>`,
    });
    await expect(buildProject(root)).rejects.toThrow(/pages\/bt-panel\.vue and the component components\/BtPanel\.vue both resolve to the component name "BtPanel"/);
  });

  it("still builds when names differ", async () => {
    const root = await project({
      "pages/index.vue": `<template><main><BtPanel /></main></template>`,
      "components/BtPanel.vue": `<template><section>panel</section></template>`,
    });
    await expect(buildProject(root)).resolves.toBeDefined();
  });
});
