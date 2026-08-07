import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";

const tempRoots: string[] = [];

afterEach(async () => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("compiler path regressions", () => {
  it("does not treat a prefix-matching sibling directory as inside the project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resux-project-"));
    const siblingRoot = `${root}-sibling`;
    tempRoots.push(root, siblingRoot);
    const pageFile = path.join(root, "pages", "index.vue");
    const assetFile = path.join(siblingRoot, "outside.png");
    await mkdir(path.dirname(pageFile), { recursive: true });
    await mkdir(siblingRoot, { recursive: true });
    await writeFile(path.join(root, "resux.config.ts"), "export default defineResuxConfig({})\n", "utf8");
    await writeFile(assetFile, "not-a-real-image", "utf8");

    let importPath = path.relative(path.dirname(pageFile), assetFile).replace(/\\/g, "/");
    if (!importPath.startsWith(".")) {
      importPath = `./${importPath}`;
    }

    const component = compileVueSource(
      `<script setup>\nimport outsideImage from ${JSON.stringify(importPath)}\nconst image = outsideImage\n</script>\n<template><img :src="image" alt="outside" /></template>`,
      {
        file: pageFile,
        id: "outside-asset",
        name: "OutsideAsset",
      },
    );

    expect(component.serverSource).toContain(JSON.stringify(importPath));
    expect(component.serverSource).not.toContain('"/../');
  });
});
