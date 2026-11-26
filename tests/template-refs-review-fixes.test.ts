import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import { ref, renderTemplateNodesAsync } from "resuxjs/runtime";
import { ssrRenderContext, bootClientComponent, registeredExpressions } from "./helpers/template-refs-fixtures.js";

describe("template refs review fixes", () => {
  it("media components mark the resolved dynamic ref value, not the identifier", async () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const refName = "videoEl"
</script>
<template>
  <ResuxVideo :ref="refName" src="/v.mp4" />
</template>`,
      {
        file: "MediaRef.vue",
        id: "m0",
        name: "MediaRef"
      }
    );

    const scopeValues: Record<string, unknown> = { refName: "videoEl" };
    const html = await renderTemplateNodesAsync(
      component.template,
      ssrRenderContext("s0", { ...scopeValues, __rx_expressions: registeredExpressions(component, scopeValues) }),
      async () => ""
    );
    expect(html).toContain('data-rx-ref="s0:videoEl"');
    expect(html).not.toContain('data-rx-ref="s0:refName"');
  });

  it("re-runs setup-time effects once template refs resolve against the DOM", async () => {
    const { scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
async function __rx_setup(__ctx) {
  const { ref, watchEffect } = __ctx;
  const fileInput = ref(null);
  const runs = ref(0);
  const seen = ref("none");
  watchEffect(() => {
    runs.value = runs.value + 1;
    seen.value = fileInput.value && fileInput.value.id === "target-file" ? "element" : "null";
  });
  return { fileInput, runs, seen, __rx_expressions: {} };
}
export default createClientComponent({
  id: "m0",
  name: "SetupEffect",
  file: "SetupEffect.vue",
  script: __rx_setup,
  template: [],
  templateRefs: ["fileInput"],
  handlers: []
});
`,
      `<input data-rx-ref="s0:fileInput" id="target-file" />`
    );

    try {
      expect(scopeRecords.s0.scope.seen.value).toBe("element");
      expect(scopeRecords.s0.scope.runs.value).toBeGreaterThanOrEqual(2);
    } finally {
      restore();
    }
  });

  it("keeps v-for template refs as arrays even with a single match", async () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const items = ref(["a"])
const itemEls = ref(null)
</script>
<template>
  <ul><li v-for="item in items" ref="itemEls">{{ item }}</li></ul>
</template>`,
      {
        file: "ForRef.vue",
        id: "m0",
        name: "ForRef"
      }
    );
    expect(component.templateForRefs).toEqual(["itemEls"]);
    expect(component.clientSource).toContain('templateForRefs: ["itemEls"]');

    const { window, scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const itemEls = ref(null);
  return { itemEls, __rx_expressions: {} };
}
export default createClientComponent({
  id: "m0",
  name: "ForRefComponent",
  file: "ForRefComponent.vue",
  script: __rx_setup,
  template: [],
  templateRefs: ["itemEls"],
  templateForRefs: ["itemEls"],
  handlers: []
});
`,
      `<ul><li data-rx-ref="s0:itemEls" id="only">a</li></ul>`
    );

    try {
      const value = scopeRecords.s0.scope.itemEls.value;
      expect(Array.isArray(value)).toBe(true);
      expect(value).toHaveLength(1);
      expect(value[0]).toBe(window.document.getElementById("only"));
    } finally {
      restore();
    }
  });

  it("updates data-rx-ref patches when a dynamic ref changes", async () => {
    const { comp, scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
const __template = [
  {
    type: "element",
    tag: "input",
    attrs: [
      { kind: "static", name: "id", value: "target-file" },
      { kind: "dynamic", name: "ref", value: "currentRef", bindingId: "b1" }
    ],
    events: [],
    children: []
  }
];
async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const currentRef = ref("first");
  const first = ref(null);
  const second = ref(null);
  function swap() { currentRef.value = "second"; }
  return { currentRef, first, second, swap, __rx_expressions: { currentRef: (scope) => scope.currentRef.value } };
}
export default createClientComponent({
  id: "m0",
  name: "DynamicRefSwap",
  file: "DynamicRefSwap.vue",
  script: __rx_setup,
  template: __template,
  templateRefs: ["first", "second"],
  handlers: ["swap"]
});
`,
      `<input id="target-file" data-rx-ref="s0:first" data-rx-attr-b1="s0:b1" />`
    );

    try {
      const patches = await comp.run(scopeRecords.s0, "swap", {});
      const refPatch = (patches || []).find((patch: { type: string; attr?: string }) => patch.type === "attr" && patch.attr === "data-rx-ref");
      expect(refPatch).toBeTruthy();
      expect(refPatch.value).toBe("s0:second");
    } finally {
      restore();
    }
  });
});
