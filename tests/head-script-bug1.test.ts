
import { describe, expect, it } from "vitest";
import { renderDocument, renderApp, defineComponent } from "../src/runtime/index.js";
import fontsModule from "../src/fonts/index.js";
import { installTestWindow } from "./helpers/install-test-window.js";

describe("bug 1: head script rendering and execution", () => {
  it("renders script with textContent and boolean attributes", () => {
    const result = {
      html: "<div>test</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: {
        script: [
          {
            src: "https://example.com/test.js",
            async: true,
            defer: true,
            type: "module",
            nonce: "test-nonce-123"
          },
          {
            key: "inline-script",
            textContent: "console.log('hello');",
            nonce: "test-nonce-123"
          }
        ]
      }
    };
    const doc = renderDocument(result as any, "Test Title");
    expect(doc).toContain('<script data-rx-head="true" src="https://example.com/test.js" async defer type="module" nonce="test-nonce-123"></script>');
    expect(doc).toContain('<script data-rx-head="true" nonce="test-nonce-123">console.log(\'hello\');</script>');
    expect(doc).not.toContain('textContent="');
    expect(doc).not.toContain('async="true"');
    expect(doc).not.toContain('key="inline-script"');
  });

  it("deduplicates scripts by key, id, or src in mergeHead", () => {
    const page = defineComponent({
      id: "m-script",
      name: "ScriptPage",
      file: "pages/script.vue",
      handlers: [],
      async script(ctx) {
        ctx.useHead({
          script: [
            { key: "tracker", textContent: "const v = 2;" },
            { src: "https://example.com/lib.js", defer: true }
          ]
        });
        return {};
      },
      template: [{ type: "element", tag: "main", attrs: [], events: [], children: [] }]
    });

    return renderApp({
      page,
      route: { path: "/script", params: {}, query: {} },
      appHead: {
        script: [
          { key: "tracker", textContent: "const v = 1;" },
          { src: "https://example.com/lib.js", async: true }
        ]
      }
    }).then((result) => {
      const doc = renderDocument(result, "Script Test");
      expect(doc).toContain("const v = 2;");
      expect(doc).not.toContain("const v = 1;");
      expect(result.head.script).toHaveLength(2);
    });
  });

  it("applies and runs fonts module lazy-load script", () => {
    const addedHeads: Array<Record<string, any>> = [];
    fontsModule.setup({
      google: [{ name: "Inter", weights: [400], strategy: "lazy" }],
      strategy: "lazy"
    }, {
      addHead(head: any) { addedHeads.push(head); },
      extendRuntimeConfig() {}
    } as any);

    const head = addedHeads[0];
    expect(head.script).toBeDefined();
    expect(head.script.length).toBeGreaterThan(0);

    const doc = renderDocument({
      html: "<div>fonts</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head
    } as any);

    expect(doc).toContain('data-resux-font-loader="true"');
    expect(doc).toContain('data-resux-font-lazy="true"');
    expect(doc).toContain('loadFonts');
  });
});
