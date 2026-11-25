import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import {
  getClientRuntimeSource,
  ref,
  renderTemplateNodesAsync,
  type ElementTemplateNode,
} from "resuxjs/runtime";

// Render context shared by the SSR tests.
function ssrRenderContext(scopeId: string, scope: Record<string, unknown>) {
  return {
    scope,
    scopeId,
    moduleId: "m0",
    route: { path: "/", params: {}, query: {} },
    runtimeConfig: { public: {} },
    components: {},
    layouts: {},
    pageMeta: {}
  };
}

// Writes the client runtime + a component module to a temp dir, boots them in
// a happy-dom window with the given HTML, and returns the scope records. The
// component source must use __RUNTIME__ as the runtime import specifier.
async function bootClientComponent(componentSource: string, html: string, scopeIds: string[] = ["s0"]) {
  const tempDir = path.join(os.tmpdir(), `resux-template-ref-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(tempDir, { recursive: true });
  const runtimeFile = path.join(tempDir, "runtime-client.mjs");
  const componentFile = path.join(tempDir, "component.mjs");
  await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
  await writeFile(
    componentFile,
    componentSource.replace("__RUNTIME__", JSON.stringify(pathToFileURL(runtimeFile).href)),
    "utf8"
  );

  const window = new Window({ url: "http://localhost/" });
  window.document.body.innerHTML = html;

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousResux = (globalThis as Record<string, unknown>).__RESUX__;

  const scopeStates = Object.fromEntries(
    scopeIds.map((id) => [id, { id, moduleId: "m0", state: {}, asyncData: {} }])
  );
  const route = { path: "/", params: {}, query: {} };
  Object.assign(globalThis, {
    document: window.document,
    window,
    __RESUX__: { route, scopes: scopeStates, modules: { m0: pathToFileURL(componentFile).href } }
  });

  const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
  const scopeRecords: Record<string, any> = {};
  for (const id of scopeIds) {
    scopeRecords[id] = await comp.createScope(scopeStates[id], route);
  }

  return {
    window,
    comp,
    scopeRecords,
    restore: () => Object.assign(globalThis, {
      document: previousDocument,
      window: previousWindow,
      __RESUX__: previousResux
    })
  };
}

// Maps compiled expressions to runnable functions over the given scope values.
function registeredExpressions(component: { expressions?: { id: string; transformed: string }[] }, scopeValues: Record<string, unknown>) {
  return Object.fromEntries(
    (component.expressions ?? []).map((expr) => [
      expr.id,
      (scope: Record<string, unknown>) => {
        const keys = Object.keys(scopeValues);
        const vals = keys.map((k) => scope[k]);
        return new Function(...keys, `return (${expr.transformed});`)(...vals);
      }
    ])
  );
}

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
