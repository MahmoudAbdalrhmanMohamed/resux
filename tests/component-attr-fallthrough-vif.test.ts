import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// A child whose root element has v-if still receives the parent's attributes (and native listeners), also after the
// browser hides and shows the root again.

const vifRoot: TemplateNode[] = [{
  type: "element", tag: "div", events: [], children: [{ type: "text", value: "x" }],
  if: { expression: "show", blockId: "b0" }, attrs: [{ kind: "static", name: "class", value: "c" }],
}];
const parentAttrs = [{ kind: "static" as const, name: "class", value: "p" }, { kind: "static" as const, name: "aria-label", value: "a" }];

async function render(show: boolean) {
  const child = defineComponent({
    id: "m1", name: "Child", file: "Child.vue", handlers: [], template: vifRoot, declaredProps: [], inheritAttrs: true,
    async script() { return { show }; },
  });
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: [], async script() { return {}; },
    template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "element", tag: "Child", attrs: parentAttrs, events: [], children: [] }] }],
  });
  return renderAppAsync({
    page, components: { Child: child }, modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
}

describe("v-if root fallthrough", () => {
  it("server: puts the attributes on the shown root and keeps them on the wrapper", async () => {
    const { html } = await render(true);
    expect(html).toMatch(/<div class="c p" aria-label="a"[^>]*>x<\/div>/);
    expect(html).toContain("data-rx-fall=");
  });

  it("server: a hidden root renders nothing but the wrapper still keeps the attributes", async () => {
    const { html } = await render(false);
    expect(html).not.toContain("<div");
    expect(html).toContain("data-rx-fall=");
  });

  it("client: showing the root again after hiding puts the attributes back", async () => {
    const hidden = await render(false);
    const enc = encodeURIComponent;
    expectAllPass(await runClientEngineProbe(`
      globalThis.__RESUX__ = JSON.parse(decodeURIComponent("${enc(JSON.stringify(hidden.payload))}"));
      document.body.innerHTML = decodeURIComponent("${enc('<div id="host">' + hidden.html + "</div>")}");
      const wrapper = document.querySelector("[data-rx-block]");
      const key = wrapper.getAttribute("data-rx-block");
      applyPatches(key.split(":")[0], [{ type: "block", id: key.split(":")[1], value: '<div class="c">x</div>' }]);
      const div = document.querySelector("div.c");
      t("root shown", !!div, document.body.innerHTML);
      t("class merged", div && div.getAttribute("class") === "c p", div && div.outerHTML);
      t("aria-label set", div && div.getAttribute("aria-label") === "a", div && div.outerHTML);
      applyPatches(key.split(":")[0], [{ type: "block", id: key.split(":")[1], value: "" }]);
      applyPatches(key.split(":")[0], [{ type: "block", id: key.split(":")[1], value: '<div class="c">y</div>' }]);
      const again = document.querySelector("div.c");
      t("still merged after hide and show", again && again.getAttribute("class") === "c p" && again.getAttribute("aria-label") === "a", again && again.outerHTML);
    `));
  });
});
