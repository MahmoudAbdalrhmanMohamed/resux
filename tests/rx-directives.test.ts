import { describe, expect, it } from "vitest";
import {
  compileVueSource,
  normalizeResuxDirectiveSyntax,
  normalizeResuxSfcSource,
} from "resuxjs/compiler";

describe("Resux rx-* directives", () => {
  it("normalizes directive attribute names without changing text or values", () => {
    const template = `
      <!-- rx-if stays in comments -->
      <button rx-on:click.prevent="run('rx-if')" rx-bind:aria-label="label">
        rx-if stays in text
      </button>
    `;

    const normalized = normalizeResuxDirectiveSyntax(template);

    expect(normalized).toContain('v-on:click.prevent="run(\'rx-if\')"');
    expect(normalized).toContain('v-bind:aria-label="label"');
    expect(normalized).toContain("<!-- rx-if stays in comments -->");
    expect(normalized).toContain("rx-if stays in text");
  });

  it("only rewrites the SFC template block", () => {
    const source = `<script setup lang="ts">
const example = "rx-if"
</script>
<template><p rx-if="visible">rx-if</p></template>
<style>.rx-if { display: block; }</style>`;

    const normalized = normalizeResuxSfcSource(source, "/app/pages/index.vue");

    expect(normalized).toContain('const example = "rx-if"');
    expect(normalized).toContain('<p v-if="visible">rx-if</p>');
    expect(normalized).toContain(".rx-if { display: block; }");
  });

  it("compiles rx-if, rx-for, rx-show, rx-text, rx-html, rx-model and rx-on", () => {
    const component = compileVueSource(`<script setup lang="ts">
const visible = ref(true)
const items = ref([{ id: 1, title: "One" }])
const message = ref("Hello")
const trustedHtml = ref("<strong>Ready</strong>")
function toggle() { visible.value = !visible.value }
</script>
<template>
  <main>
    <button rx-on:click.prevent="toggle" rx-bind:aria-pressed="visible">Toggle</button>
    <p rx-if="visible" rx-text="message" />
    <p rx-else>Hidden</p>
    <section rx-show="visible" rx-html="trustedHtml" />
    <input rx-model="message" />
    <article rx-for="(item, index) in items" rx-bind:key="item.id">
      {{ index }} — {{ item.title }}
    </article>
  </main>
</template>`, {
      file: "/app/pages/index.vue",
      id: "m0",
      name: "IndexPage",
    });

    const serialized = JSON.stringify(component.template);
    expect(serialized).toContain('"if"');
    expect(serialized).toContain('"for"');
    expect(serialized).toContain('"html"');
    expect(serialized).toContain('"handler":"toggle"');
    expect(serialized).not.toContain("rx-if");
  });

  it("supports @event and :binding as official Resux shortcuts", () => {
    const component = compileVueSource(`<script setup lang="ts">
const visible = ref(true)
function toggle() { visible.value = !visible.value }
</script>
<template>
  <button @click.prevent="toggle" :aria-pressed="visible">Toggle</button>
</template>`, {
      file: "/app/pages/shortcuts.vue",
      id: "m-shortcuts",
      name: "ShortcutsPage",
    });

    const serialized = JSON.stringify(component.template);
    expect(serialized).toContain('"handler":"toggle"');
    expect(serialized).toContain('"aria-pressed"');
    expect(serialized).not.toContain("@click");
    expect(serialized).not.toContain(":aria-pressed");
  });

  it("keeps v-* syntax working for migration compatibility", () => {
    const component = compileVueSource(`<script setup lang="ts">
const visible = ref(true)
</script>
<template><p v-if="visible">Compatible</p></template>`, {
      file: "/app/pages/compat.vue",
      id: "m1",
      name: "CompatPage",
    });

    expect(component.template[0]).toMatchObject({ type: "element", tag: "p" });
  });
});
