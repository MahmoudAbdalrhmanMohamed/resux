import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";

describe("conditional template expression locals", () => {
  it("captures a v-for alias used by a nested v-if expression", async () => {
    const root = path.join(os.tmpdir(), `resux-conditional-local-${Date.now()}`);
    const page = path.join(root, "pages", "index.vue");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(
      page,
      `<script setup>\nconst entries = [{ title: 'Visible', visible: true }]\n</script>\n<template>\n  <article v-for="entry in entries" :key="entry.title">\n    <p v-if="entry.visible">{{ entry.title }}</p>\n  </article>\n</template>`,
      "utf8",
    );

    const result = await buildProject(root);
    const component = result.components.find((entry) => entry.file === page);
    expect(component).toBeTruthy();

    const conditional = component?.expressions?.find((expression) => expression.original.includes("entry.visible"));
    expect(conditional).toBeTruthy();
    expect(conditional?.locals).toContain("entry");
    expect(component?.serverSource).toContain("let entry = (locals && \"entry\" in locals)");
  }, 30000);
});
