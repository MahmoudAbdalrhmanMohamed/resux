import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { getClientRuntimeSource, type ElementTemplateNode, type TemplateNode } from "../src/runtime/index.js";

function findElement(nodes: TemplateNode[], tag: string): ElementTemplateNode | undefined {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    if (node.tag === tag) return node;
    const nested = findElement(node.children, tag);
    if (nested) return nested;
  }
  return undefined;
}

describe("resumable template event locals", () => {
  it("captures only referenced v-for aliases in inline event metadata and generated handlers", async () => {
    const root = path.join(os.tmpdir(), `resux-event-local-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const page = path.join(root, "pages", "index.vue");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(
      page,
      `<script setup>\nconst locales = [{ code: 'en' }, { code: 'ar' }]\nfunction setLocale(code) { return code }\n</script>\n<template>\n  <button v-for="(item, index) in locales" :key="item.code" @click="setLocale(item.code)">{{ index }}: {{ item.code }}</button>\n</template>`,
      "utf8",
    );

    const result = await buildProject(root);
    const component = result.components.find((entry) => entry.file === page);
    expect(component).toBeTruthy();
    const button = findElement(component?.template ?? [], "button");
    expect(button).toBeTruthy();
    expect(button?.events[0]?.locals).toEqual(["item"]);
    expect(component?.clientSource).toContain("function __rx_inline_0($event, __rx_event_locals = {})");
    expect(component?.clientSource).toContain('const item = __rx_event_locals["item"]');
    expect(component?.clientSource).not.toContain('const index = __rx_event_locals["index"]');
  }, 30000);

  it("rejects v-model assignments that mutate a deserialized template-local alias", async () => {
    const root = path.join(os.tmpdir(), `resux-model-local-mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const page = path.join(root, "pages", "index.vue");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(
      page,
      `<script setup>\nconst locales = [{ code: 'en' }, { code: 'ar' }]\n</script>\n<template>\n  <input v-for="item in locales" :key="item.code" v-model="item.code" />\n</template>`,
      "utf8",
    );

    await expect(buildProject(root)).rejects.toThrow(/cannot assign through template-local binding "item"/);
  }, 30000);

  it("captures template locals used only to address resumable v-model state", async () => {
    const root = path.join(os.tmpdir(), `resux-model-event-local-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const page = path.join(root, "pages", "index.vue");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(
      page,
      `<script setup>\nconst locales = [{ code: 'en' }, { code: 'ar' }]\nconst selected = reactive({ en: '', ar: '' })\n</script>\n<template>\n  <input v-for="item in locales" :key="item.code" v-model="selected[item.code]" />\n</template>`,
      "utf8",
    );

    const result = await buildProject(root);
    const component = result.components.find((entry) => entry.file === page);
    expect(component).toBeTruthy();
    const input = findElement(component?.template ?? [], "input");
    expect(input).toBeTruthy();
    expect(input?.events[0]?.locals).toEqual(["item"]);
    expect(component?.clientSource).toContain("function __rx_inline_0($event, __rx_event_locals = {})");
    expect(component?.clientSource).toContain('const item = __rx_event_locals["item"]');
    expect(component?.clientSource).toContain("selected[item.code] = $event.target ? $event.target.value : \"\"");
  }, 30000);

  it("serializes and restores declared event locals without changing ordinary handler arity", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain('data-rx-locals-');
    expect(source).toContain('readEventLocals(target, eventName)');
    expect(source).toContain('component.run(scopeRecord, handlerName, event, readEventLocals(target, eventName))');
    expect(source).toContain('async run(scopeRecord, handlerName, event, eventLocals = {})');
    expect(source).toContain('if (Object.keys(eventLocals).length > 0)');
    expect(source).toContain('await handler(event, eventLocals)');
    expect(source).toContain('await handler(event);');
  });
});
