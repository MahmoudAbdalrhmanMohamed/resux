import { describe, expect, it } from "vitest";
import { compileVueSource, RESUMABLE_HANDLER_ALLOWED_GLOBALS } from "../src/compiler/index";
import { renderApp, renderDocument, defineComponent } from "../src/runtime/index";

describe("Bug 5: Resumable handler capture rules and browser globals", () => {
  it("allows window, document, navigator, and localStorage in click handlers without compile errors", () => {
    const sfc = `
<script setup lang="ts">
const clicked = useState("clicked", () => false);

function handleClick() {
  if (typeof window !== "undefined") {
    window.scrollTo(0, 0);
  }
  if (typeof document !== "undefined") {
    document.title = "Updated Title";
  }
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("theme", "dark");
  }
  clicked.value = true;
}
</script>
<template>
  <button @click="handleClick">Click Me</button>
</template>
`;

    const compiled = compileVueSource(sfc, {
      file: "BrowserGlobals.vue",
      id: "bg0",
      name: "BrowserGlobals"
    });

    expect(compiled.handlers).toContain("handleClick");
    expect(compiled.serverSource).toContain("document.title");
    expect(compiled.serverSource).toContain("window.scrollTo");
    expect(compiled.serverSource).toContain("localStorage.setItem");
  });

  it("proves browser globals referenced in handlers are never serialized into state payload", async () => {
    const page = defineComponent({
      id: "m-globals",
      name: "GlobalsPage",
      file: "GlobalsPage.vue",
      handlers: ["onClick"],
      async script(__ctx: any) {
        const { useState } = __ctx;
        const count = useState("count", () => 42);
        function onClick() {
          if (typeof document !== "undefined") {
            document.body.classList.add("active");
          }
          if (typeof window !== "undefined") {
            window.alert("hello");
          }
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("key", "val");
          }
          count.value++;
        }
        return { count, onClick };
      },
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "onClick", modifiers: [] }],
          children: [{ type: "text", value: "Click" }]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} }
    });

    const docHtml = renderDocument(result, "Globals Test");

    // Check serialized payload directly from renderApp result
    const scopeKeys = Object.keys(result.payload.scopes);
    expect(scopeKeys.length).toBeGreaterThan(0);
    const scope = result.payload.scopes[scopeKeys[0]];

    // State only contains the reactive useState "count", never browser globals
    expect(scope.state).toHaveProperty("count");
    expect(scope.state).not.toHaveProperty("window");
    expect(scope.state).not.toHaveProperty("document");
    expect(scope.state).not.toHaveProperty("navigator");
    expect(scope.state).not.toHaveProperty("localStorage");
    expect(scope.state).not.toHaveProperty("sessionStorage");

    // Verify HTML serialized payload does not leak globals
    expect(docHtml).not.toContain('"window"');
    expect(docHtml).not.toContain('"document"');
    expect(docHtml).not.toContain('"localStorage"');
    expect(docHtml).not.toContain('"navigator"');
  });

  it("provides helpful DX compile error with suggestion and docs link for unsupported captures", () => {
    const sfc = `
<script setup lang="ts">
const count = useState("count", () => 0);
const secretServerData = { token: "abc123xyz" };

function handleCustom() {
  count.value += secretServerData.token.length;
}
</script>
<template>
  <button @click="handleCustom">Submit</button>
</template>
`;

    expect(() => {
      compileVueSource(sfc, {
        file: "SecretCapture.vue",
        id: "sc0",
        name: "SecretCapture"
      });
    }).toThrowError(
      /Handler "handleCustom" captures "secretServerData", which is not resumable in Resux[\s\S]*globalThis\.secretServerData[\s\S]*onMounted[\s\S]*useClientEnhancement[\s\S]*https:\/\/resux\.dev\/guide\/resumability-handlers/
    );
  });

  it("exports RESUMABLE_HANDLER_ALLOWED_GLOBALS including browser globals", () => {
    expect(RESUMABLE_HANDLER_ALLOWED_GLOBALS.has("window")).toBe(true);
    expect(RESUMABLE_HANDLER_ALLOWED_GLOBALS.has("document")).toBe(true);
    expect(RESUMABLE_HANDLER_ALLOWED_GLOBALS.has("navigator")).toBe(true);
    expect(RESUMABLE_HANDLER_ALLOWED_GLOBALS.has("localStorage")).toBe(true);
    expect(RESUMABLE_HANDLER_ALLOWED_GLOBALS.has("sessionStorage")).toBe(true);
  });
});
