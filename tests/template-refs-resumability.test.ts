import { describe, expect, it, vi } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import { ref, renderTemplateNodesAsync, type ElementTemplateNode } from "resuxjs/runtime";
import { ssrRenderContext, bootClientComponent, registeredExpressions } from "./helpers/template-refs-fixtures.js";

describe("template refs resumability", () => {
  it("compiler captures template ref names and sets ref on element nodes", () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const fileInput = ref<HTMLInputElement | null>(null)
function openDialog() {
  if (fileInput.value) {
    fileInput.value.click()
  }
}
</script>
<template>
  <div>
    <input ref="fileInput" type="file" id="target-file" />
    <button @click="openDialog">Open File</button>
  </div>
</template>`,
      {
        file: "FileInput.vue",
        id: "m0",
        name: "FileInput"
      }
    );

    expect(component.templateRefs).toEqual(["fileInput"]);
    expect(component.clientSource).toContain('templateRefs: ["fileInput"]');
    const rootEl = component.template[0] as ElementTemplateNode;
    const inputEl = rootEl.children.find(
      (c) => c.type === "element" && (c as ElementTemplateNode).tag === "input"
    ) as ElementTemplateNode;
    expect(inputEl).toBeTruthy();
    expect(inputEl.ref).toBe("fileInput");
  });

  it("SSR renders data-rx-ref with scopeId on elements with template ref", async () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const fileInput = ref<HTMLInputElement | null>(null)
</script>
<template>
  <input ref="fileInput" type="file" id="target-file" />
</template>`,
      {
        file: "FileInput.vue",
        id: "m0",
        name: "FileInput"
      }
    );

    const html = await renderTemplateNodesAsync(
      component.template,
      ssrRenderContext("s0", {}),
      async () => ""
    );

    expect(html).toContain('data-rx-ref="s0:fileInput"');
    expect(html).toContain('ref="fileInput"');
  });

  it("client handler resolves template ref to DOM element and executes DOM methods", async () => {
    const { window, comp, scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
const __template = [
  {
    type: "element",
    tag: "div",
    attrs: [],
    events: [],
    children: [
      {
        type: "element",
        tag: "input",
        ref: "fileInput",
        attrs: [
          { kind: "static", name: "type", value: "file" },
          { kind: "static", name: "id", value: "target-file" }
        ],
        events: [],
        children: []
      },
      {
        type: "element",
        tag: "button",
        attrs: [{ kind: "static", name: "id", value: "btn-trigger" }],
        events: [{ name: "click", handler: "openDialog", modifiers: [] }],
        children: [{ type: "text", value: "Open File" }]
      },
      {
        type: "element",
        tag: "span",
        attrs: [{ kind: "static", name: "id", value: "ref-status" }],
        events: [],
        children: [{ type: "interpolation", expression: "inputStatus", bindingId: "b0" }]
      }
    ]
  }
];

async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const fileInput = ref(null);
  const inputStatus = ref("unclicked");

  function openDialog() {
    if (fileInput.value) {
      inputStatus.value = "resolved";
      if (typeof fileInput.value.click === "function") {
        fileInput.value.click();
      }
    } else {
      inputStatus.value = "null";
    }
  }

  const __rx_expressions = {
    "b0": function(scope) {
      return scope.inputStatus.value;
    }
  };

  return { fileInput, inputStatus, openDialog, __rx_expressions };
}

export default createClientComponent({
  id: "m0",
  name: "FileInputTest",
  file: "FileInputTest.vue",
  script: __rx_setup,
  template: __template,
  templateRefs: ["fileInput"],
  handlers: ["openDialog"]
});
`,
      `<div>
        <input ref="fileInput" data-rx-ref="s0:fileInput" type="file" id="target-file" />
        <button id="btn-trigger" data-rx-on-click="s0:m0:openDialog">Open File</button>
        <span id="ref-status" data-rx-text="s0:b0">unclicked</span>
      </div>`
    );

    let clickCalled = false;
    const inputElement = window.document.getElementById("target-file");
    if (inputElement) {
      (inputElement as HTMLInputElement).click = () => {
        clickCalled = true;
      };
    }

    try {
      expect(scopeRecords.s0.scope.fileInput.value).toBe(inputElement);

      await comp.run(scopeRecords.s0, "openDialog", { target: window.document.getElementById("btn-trigger") });
      expect(scopeRecords.s0.scope.inputStatus.value).toBe("resolved");
      expect(clickCalled).toBe(true);
    } finally {
      restore();
    }
  });

  it("returns null and emits dev warning when template ref is not found in DOM", async () => {
    const { scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const missingEl = ref(null);
  function checkEl() {
    return missingEl.value;
  }
  return { missingEl, checkEl, __rx_expressions: {} };
}
export default createClientComponent({
  id: "m0",
  name: "MissingComponent",
  file: "MissingComponent.vue",
  script: __rx_setup,
  template: [],
  templateRefs: ["missingEl"],
  handlers: ["checkEl"]
});
`,
      `<div>Empty</div>`
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const val = scopeRecords.s0.scope.missingEl.value;
      expect(val).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[resux:template-ref] Template ref "missingEl" could not be resolved in the DOM for component <MissingComponent>. Ensure the element is rendered and not removed by v-if.'
      );
    } finally {
      warnSpy.mockRestore();
      restore();
    }
  });

  it("dynamically resolves template ref as elements are added and removed (v-if lifecycle)", async () => {
    const { window, scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const targetEl = ref(null);
  return { targetEl, __rx_expressions: {} };
}
export default createClientComponent({
  id: "m0",
  name: "DynamicLifecycle",
  file: "DynamicLifecycle.vue",
  script: __rx_setup,
  template: [],
  templateRefs: ["targetEl"],
  handlers: []
});
`,
      `<div id="app"></div>`
    );

    try {
      // 1. Initially element is not mounted in DOM
      expect(scopeRecords.s0.scope.targetEl.value).toBeNull();

      // 2. Element is mounted into DOM (e.g. after v-if becomes true)
      const inputEl = window.document.createElement("input");
      inputEl.setAttribute("data-rx-ref", "s0:targetEl");
      window.document.getElementById("app")?.appendChild(inputEl);

      // Now targetEl.value must dynamically return the newly mounted element!
      expect(scopeRecords.s0.scope.targetEl.value).toBe(inputEl);

      // 3. Element is unmounted from DOM (e.g. v-if becomes false)
      inputEl.remove();

      // Now targetEl.value must dynamically return null again!
      expect(scopeRecords.s0.scope.targetEl.value).toBeNull();
    } finally {
      restore();
    }
  });

  it("resolves multiple elements when ref is used on a list", async () => {
    const { scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const items = ref([]);
  return { items, __rx_expressions: {} };
}
export default createClientComponent({
  id: "m0",
  name: "ListRefComponent",
  file: "ListRefComponent.vue",
  script: __rx_setup,
  template: [],
  templateRefs: ["items"],
  handlers: []
});
`,
      `<ul>
        <li data-rx-ref="s0:items">Item 1</li>
        <li data-rx-ref="s0:items">Item 2</li>
        <li data-rx-ref="s0:items">Item 3</li>
      </ul>`
    );

    try {
      const elements = scopeRecords.s0.scope.items.value;
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBe(3);
      expect(elements[0].textContent).toBe("Item 1");
      expect(elements[1].textContent).toBe("Item 2");
      expect(elements[2].textContent).toBe("Item 3");
    } finally {
      restore();
    }
  });

  it("handles dynamic :ref literals/identifiers and ignores non-identifier expressions cleanly", async () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const quotedEl = ref<HTMLDivElement | null>(null)
const boundEl = ref<HTMLInputElement | null>(null)
const active = true
</script>
<template>
  <div>
    <div :ref="'quotedEl'">Quoted</div>
    <input :ref="boundEl" type="text" />
    <span :ref="active ? 'quotedEl' : 'boundEl'">Dynamic Expr</span>
  </div>
</template>`,
      {
        file: "DynamicRefAttrs.vue",
        id: "m0",
        name: "DynamicRefAttrs"
      }
    );

    expect(component.templateRefs).toEqual(["quotedEl", "boundEl"]);
    const rootEl = component.template[0] as ElementTemplateNode;
    const divNode = rootEl.children[0] as ElementTemplateNode;
    const inputNode = rootEl.children[1] as ElementTemplateNode;
    const spanNode = rootEl.children[2] as ElementTemplateNode;
    expect(divNode.ref).toBe("quotedEl");
    expect(inputNode.ref).toBe("boundEl");
    expect(spanNode.ref).toBeUndefined();

    const scopeValues: Record<string, unknown> = {
      active: true,
      quotedEl: ref(null),
      boundEl: ref(null),
    };

    const html = await renderTemplateNodesAsync(
      component.template,
      ssrRenderContext("s1", { ...scopeValues, __rx_expressions: registeredExpressions(component, scopeValues) }),
      async () => ""
    );
    expect(html).toContain('ref="quotedEl" data-rx-ref="s1:quotedEl">Quoted</div>');
    expect(html).toContain('data-rx-ref="s1:quotedEl"');
    expect(html).toContain('data-rx-ref="s1:boundEl"');
    expect(html).toContain('<span data-rx-attr-');
    expect(html).toContain('ref="quotedEl" data-rx-ref="s1:quotedEl">Dynamic Expr</span>');
  });

  it("isolates template ref resolution across multiple component scopes", async () => {
    const { scopeRecords, restore } = await bootClientComponent(
      `import { createClientComponent } from __RUNTIME__;
async function __rx_setup(__ctx) {
  const { ref } = __ctx;
  const box = ref(null);
  return { box, __rx_expressions: {} };
}
export default createClientComponent({
  id: "m0",
  name: "ScopedBox",
  file: "ScopedBox.vue",
  script: __rx_setup,
  template: [],
  templateRefs: ["box"],
  handlers: []
});
`,
      `<div id="box-0" data-rx-ref="s0:box">First</div>
      <div id="box-1" data-rx-ref="s1:box">Second</div>`,
      ["s0", "s1"]
    );

    try {
      expect(scopeRecords.s0.scope.box.value?.id).toBe("box-0");
      expect(scopeRecords.s1.scope.box.value?.id).toBe("box-1");
    } finally {
      restore();
    }
  });
});
