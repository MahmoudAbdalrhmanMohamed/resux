import { afterEach, describe, expect, it, vi } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import { collectResuxDevWarnings } from "../src/compiler/dev-warnings";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Resux development event diagnostics", () => {
  it("warns about inline DOM handlers only when development diagnostics are enabled", () => {
    const source = `<script setup lang="ts">
function save() {}
</script>
<template><button onclick="save()">Save</button></template>`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    compileVueSource(source, {
      file: "/app/pages/dev-warning.vue",
      id: "dev-warning",
      name: "DevWarning",
    });
    expect(warn).not.toHaveBeenCalled();

    compileVueSource(source, {
      file: "/app/pages/dev-warning.vue",
      id: "dev-warning",
      name: "DevWarning",
      dev: true,
    });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("RX_EVENT_INLINE_ATTRIBUTE");
    expect(warn.mock.calls[0]?.[0]).toContain("@click");
  });

  it("warns when a template element ref receives a direct event listener", () => {
    const warnings = collectResuxDevWarnings(`<script setup lang="ts">
const button = ref<HTMLButtonElement | null>(null)
function save() {}
onMounted(() => {
  button.value?.addEventListener("click", save)
})
</script>
<template><button ref="button">Save</button></template>`, "/app/pages/direct-listener.vue");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      code: "RX_EVENT_DIRECT_LISTENER",
      file: "/app/pages/direct-listener.vue",
    });
    expect(warnings[0]?.message).toContain("@click");
    expect(warnings[0]?.message).toContain("cleanup");
  });

  it("does not warn for global EventTargets or Vue islands", () => {
    const globalWarnings = collectResuxDevWarnings(`<script setup lang="ts">
onMounted(() => {
  window.addEventListener("resize", sync)
  document.addEventListener("visibilitychange", sync)
})
function sync() {}
</script>
<template><main>Ready</main></template>`, "/app/pages/global-listeners.vue");

    const islandWarnings = collectResuxDevWarnings(`<script setup lang="ts">
const button = ref<HTMLButtonElement | null>(null)
onMounted(() => button.value?.addEventListener("click", () => {}))
</script>
<template><button ref="button">Vue island</button></template>`, "/app/islands/vue/CounterIsland.vue");

    expect(globalWarnings).toEqual([]);
    expect(islandWarnings).toEqual([]);
  });
});
