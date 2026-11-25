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
      {
        scope: {},
        scopeId: "s0",
        moduleId: "m0",
        route: { path: "/", params: {}, query: {} },
        runtimeConfig: { public: {} },
        components: {},
        layouts: {},
        pageMeta: {}
      },
      async () => ""
    );

    expect(html).toContain('data-rx-ref="s0:fileInput"');
    expect(html).toContain('ref="fileInput"');
  });

  it("client handler resolves template ref to DOM element and executes DOM methods", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-template-ref-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "component.mjs");

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      componentFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
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
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div>
        <input ref="fileInput" data-rx-ref="s0:fileInput" type="file" id="target-file" />
        <button id="btn-trigger" data-rx-on-click="s0:m0:openDialog">Open File</button>
        <span id="ref-status" data-rx-text="s0:b0">unclicked</span>
      </div>
    `;

    let clickCalled = false;
    const inputElement = window.document.getElementById("target-file");
    if (inputElement) {
      inputElement.click = () => {
        clickCalled = true;
      };
    }

    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousResux = globalThis.__RESUX__;

    try {
      Object.assign(globalThis, {
        document: window.document,
        window,
        __RESUX__: {
          route: { path: "/", params: {}, query: {} },
          scopes: {
            s0: {
              id: "s0",
              moduleId: "m0",
              state: {},
              asyncData: {}
            }
          },
          modules: {
            m0: pathToFileURL(componentFile).href
          }
        }
      });

      const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
      const scopeRecord = await comp.createScope(globalThis.__RESUX__.scopes.s0, globalThis.__RESUX__.route);

      expect(scopeRecord.scope.fileInput.value).toBe(inputElement);

      const patches = await comp.run(scopeRecord, "openDialog", { target: window.document.getElementById("btn-trigger") });
      expect(scopeRecord.scope.inputStatus.value).toBe("resolved");
      expect(clickCalled).toBe(true);
    } finally {
      Object.assign(globalThis, {
        document: previousDocument,
        window: previousWindow,
        __RESUX__: previousResux
      });
    }
  });

  it("returns null and emits dev warning when template ref is not found in DOM", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-template-ref-missing-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "component.mjs");

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      componentFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [];
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
  template: __template,
  templateRefs: ["missingEl"],
  handlers: ["checkEl"]
});
`,
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `<div>Empty</div>`;

    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousResux = globalThis.__RESUX__;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      Object.assign(globalThis, {
        document: window.document,
        window,
        __RESUX__: {
          route: { path: "/", params: {}, query: {} },
          scopes: {
            s0: {
              id: "s0",
              moduleId: "m0",
              state: {},
              asyncData: {}
            }
          },
          modules: {
            m0: pathToFileURL(componentFile).href
          }
        }
      });

      const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
      const scopeRecord = await comp.createScope(globalThis.__RESUX__.scopes.s0, globalThis.__RESUX__.route);

      const val = scopeRecord.scope.missingEl.value;
      expect(val).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[resux:template-ref] Template ref "missingEl" could not be resolved in the DOM for component <MissingComponent>. Ensure the element is rendered and not removed by v-if.'
      );
    } finally {
      warnSpy.mockRestore();
      Object.assign(globalThis, {
        document: previousDocument,
        window: previousWindow,
        __RESUX__: previousResux
      });
    }
  });

  it("dynamically resolves template ref as elements are added and removed (v-if lifecycle)", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-template-ref-dynamic-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "component.mjs");

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      componentFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
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
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `<div id="app"></div>`;

    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousResux = globalThis.__RESUX__;

    try {
      Object.assign(globalThis, {
        document: window.document,
        window,
        __RESUX__: {
          route: { path: "/", params: {}, query: {} },
          scopes: {
            s0: { id: "s0", moduleId: "m0", state: {}, asyncData: {} }
          },
          modules: {
            m0: pathToFileURL(componentFile).href
          }
        }
      });

      const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
      const scopeRecord = await comp.createScope(globalThis.__RESUX__.scopes.s0, globalThis.__RESUX__.route);

      // 1. Initially element is not mounted in DOM
      expect(scopeRecord.scope.targetEl.value).toBeNull();

      // 2. Element is mounted into DOM (e.g. after v-if becomes true)
      const inputEl = window.document.createElement("input");
      inputEl.setAttribute("data-rx-ref", "s0:targetEl");
      window.document.getElementById("app")?.appendChild(inputEl);

      // Now targetEl.value must dynamically return the newly mounted element!
      expect(scopeRecord.scope.targetEl.value).toBe(inputEl);

      // 3. Element is unmounted from DOM (e.g. v-if becomes false)
      inputEl.remove();

      // Now targetEl.value must dynamically return null again!
      expect(scopeRecord.scope.targetEl.value).toBeNull();
    } finally {
      Object.assign(globalThis, {
        document: previousDocument,
        window: previousWindow,
        __RESUX__: previousResux
      });
    }
  });

  it("resolves multiple elements when ref is used on a list", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-template-ref-list-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "component.mjs");

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      componentFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
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
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <ul>
        <li data-rx-ref="s0:items">Item 1</li>
        <li data-rx-ref="s0:items">Item 2</li>
        <li data-rx-ref="s0:items">Item 3</li>
      </ul>
    `;

    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousResux = globalThis.__RESUX__;

    try {
      Object.assign(globalThis, {
        document: window.document,
        window,
        __RESUX__: {
          route: { path: "/", params: {}, query: {} },
          scopes: {
            s0: { id: "s0", moduleId: "m0", state: {}, asyncData: {} }
          },
          modules: {
            m0: pathToFileURL(componentFile).href
          }
        }
      });

      const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
      const scopeRecord = await comp.createScope(globalThis.__RESUX__.scopes.s0, globalThis.__RESUX__.route);

      const elements = scopeRecord.scope.items.value;
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBe(3);
      expect(elements[0].textContent).toBe("Item 1");
      expect(elements[1].textContent).toBe("Item 2");
      expect(elements[2].textContent).toBe("Item 3");
    } finally {
      Object.assign(globalThis, {
        document: previousDocument,
        window: previousWindow,
        __RESUX__: previousResux
      });
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
    const rxExpressions = Object.fromEntries(
      (component.expressions ?? []).map((expr) => [
        expr.id,
        (scope: Record<string, unknown>) => {
          const keys = Object.keys(scopeValues);
          const vals = keys.map((k) => scope[k]);
          return new Function(...keys, `return (${expr.transformed});`)(...vals);
        }
      ])
    );

    const html = await renderTemplateNodesAsync(
      component.template,
      {
        scope: { ...scopeValues, __rx_expressions: rxExpressions },
        scopeId: "s1",
        moduleId: "m0",
        route: { path: "/", params: {}, query: {} },
        runtimeConfig: { public: {} },
        components: {},
        layouts: {},
        pageMeta: {}
      },
      async () => ""
    );
    expect(html).toContain('ref="quotedEl" data-rx-ref="s1:quotedEl">Quoted</div>');
    expect(html).toContain('data-rx-ref="s1:quotedEl"');
    expect(html).toContain('data-rx-ref="s1:boundEl"');
    expect(html).toContain('<span data-rx-attr-');
    expect(html).toContain('ref="quotedEl" data-rx-ref="s1:quotedEl">Dynamic Expr</span>');
  });

  it("isolates template ref resolution across multiple component scopes", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-template-ref-multi-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "component.mjs");

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      componentFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
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
      "utf8"
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="box-0" data-rx-ref="s0:box">First</div>
      <div id="box-1" data-rx-ref="s1:box">Second</div>
    `;

    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousResux = globalThis.__RESUX__;

    try {
      Object.assign(globalThis, {
        document: window.document,
        window,
        __RESUX__: {
          route: { path: "/", params: {}, query: {} },
          scopes: {
            s0: { id: "s0", moduleId: "m0", state: {}, asyncData: {} },
            s1: { id: "s1", moduleId: "m0", state: {}, asyncData: {} }
          },
          modules: {
            m0: pathToFileURL(componentFile).href
          }
        }
      });

      const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
      const scope0 = await comp.createScope(globalThis.__RESUX__.scopes.s0, globalThis.__RESUX__.route);
      const scope1 = await comp.createScope(globalThis.__RESUX__.scopes.s1, globalThis.__RESUX__.route);

      expect(scope0.scope.box.value?.id).toBe("box-0");
      expect(scope1.scope.box.value?.id).toBe("box-1");
    } finally {
      Object.assign(globalThis, {
        document: previousDocument,
        window: previousWindow,
        __RESUX__: previousResux
      });
    }
  });
});
