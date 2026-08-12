import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { getClientRuntimeSource, type ElementTemplateNode, type TemplateNode } from "../src/runtime/index.js";

function findButton(nodes: TemplateNode[]): ElementTemplateNode | undefined {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    if (node.tag === "button") return node;
    const nested = findButton(node.children);
    if (nested) return nested;
  }
  return undefined;
}

describe("resumable template event locals", () => {
  it("captures v-for aliases in inline event metadata and generated handlers", async () => {
    const root = path.join(os.tmpdir(), `resux-event-local-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const page = path.join(root, "pages", "index.vue");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(
      page,
      `<script setup>\nconst locales = [{ code: 'en' }, { code: 'ar' }]\nfunction setLocale(code) { return code }\n</script>\n<template>\n  <button v-for="item in locales" :key="item.code" @click="setLocale(item.code)">{{ item.code }}</button>\n</template>`,
      "utf8",
    );

    const result = await buildProject(root);
    const component = result.components.find((entry) => entry.file === page);
    expect(component).toBeTruthy();
    const button = findButton(component?.template ?? []);
    expect(button).toBeTruthy();
    expect(button?.events[0]?.locals).toEqual(["item"]);
    expect(component?.clientSource).toContain("function __rx_inline_0($event, __rx_event_locals = {})");
    expect(component?.clientSource).toContain('const item = __rx_event_locals["item"]');
  }, 30000);

  it("serializes and restores declared event locals in the generated client runtime", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain('data-rx-locals-');
    expect(source).toContain('readEventLocals(target, eventName)');
    expect(source).toContain('component.run(scopeRecord, handlerName, event, readEventLocals(target, eventName))');
    expect(source).toContain('async run(scopeRecord, handlerName, event, eventLocals = {})');
    expect(source).toContain('await handler(event, eventLocals)');
  });
});
