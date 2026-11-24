import { describe, expect, it } from "vitest";
import { defineComponent, getClientRuntimeSource, renderApp } from "resuxjs/runtime";
import type { ComponentDefinition } from "resuxjs/runtime";

type Attr =
  | { kind: "static"; name: string; value: string }
  | { kind: "dynamic"; name: string; value: string; bindingId: string };

async function renderClientEnhance(attrs: Attr[]) {
  const page: ComponentDefinition = defineComponent({
    id: "ce-probe-page",
    name: "CeProbePage",
    file: "CeProbePage.vue",
    handlers: [],
    async script() {
      return {
        evilTag: "div><script>alert(1)</script><div",
        evilStyle: "1px\" onmouseover=\"alert(1)",
        evilAspect: "16/9\" onclick=\"alert(1)",
      };
    },
    template: [
      { type: "element", tag: "ClientEnhance", attrs, events: [], children: [{ type: "text", value: "x" }] },
    ],
  });
  return renderApp({ page, route: { path: "/", params: {}, query: {} }, components: {} });
}

describe("<ClientEnhance> HTML injection hardening", () => {
  it("falls back to <section> when the `as` prop is not a safe tag name", async () => {
    const result = await renderClientEnhance([
      { kind: "static", name: "name", value: "test" },
      { kind: "dynamic", name: "as", value: "evilTag", bindingId: "b0" },
    ]);
    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("<section data-resux-enhancement=\"test\"");
  });

  it("rejects dangerous tag names even when they parse as tags", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "ce-probe-page-2",
      name: "CeProbePage2",
      file: "CeProbePage2.vue",
      handlers: [],
      async script() { return {}; },
      template: [
        { type: "element", tag: "ClientEnhance", attrs: [
          { kind: "static", name: "name", value: "test" },
          { kind: "static", name: "as", value: "script" },
        ], events: [], children: [{ type: "text", value: "x" }] },
      ],
    });
    const result = await renderApp({ page, route: { path: "/", params: {}, query: {} }, components: {} });
    expect(result.html).toContain("<section data-resux-enhancement=\"test\"");
    expect(result.html).not.toContain("<script");
  });

  it("escapes reserve-height / aspect-ratio values inside the style attribute", async () => {
    const result = await renderClientEnhance([
      { kind: "static", name: "name", value: "test" },
      { kind: "dynamic", name: "reserve-height", value: "evilStyle", bindingId: "b1" },
      { kind: "dynamic", name: "aspect-ratio", value: "evilAspect", bindingId: "b2" },
    ]);
    // The quotes must be entity-escaped so they cannot close the style attribute.
    expect(result.html).not.toContain('min-height: 1px" onmouseover="alert(1)"');
    expect(result.html).toContain("min-height: 1px&quot;");
    expect(result.html).toContain("aspect-ratio: 16/9&quot;");
  });

  it("keeps safe tag names and plain CSS values working", async () => {
    const result = await renderClientEnhance([
      { kind: "static", name: "name", value: "test" },
      { kind: "static", name: "as", value: "aside" },
      { kind: "static", name: "reserve-height", value: "120px" },
      { kind: "static", name: "aspect-ratio", value: "16/9" },
    ]);
    expect(result.html).toContain("<aside data-resux-enhancement=\"test\"");
    expect(result.html).toContain("min-height: 120px;");
    expect(result.html).toContain("aspect-ratio: 16/9;");
  });

  it("applies the same hardening inside the generated client runtime", () => {
    const source = getClientRuntimeSource();
    expect(source).toContain("function normalizeClientEnhanceTag(value)");
    expect(source).toContain("unsafeClientTransitionContainerTags.has(candidate)");
    expect(source).toContain("escapeAttribute(styles.join(\" \"))");
  });
});
