import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage: keyed components that the server rendered inside a v-for block used to be created
// again in the browser when the block first re-rendered, so a local ref inside them reset.

const itemTemplate: TemplateNode[] = [{
  type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
  events: [{ name: "click", handler: "inc" }],
  children: [
    { type: "interpolation", expression: "n.value", bindingId: "b0" },
    { type: "text", value: ":" },
    { type: "interpolation", expression: "label", bindingId: "b1" },
  ],
}];

function item() {
  return defineComponent({
    id: "m1", name: "Item", file: "Item.vue", handlers: ["inc"], template: itemTemplate,
    async script(ctx) {
      const n = ctx.ref(0);
      function inc() { n.value++; }
      return { n, inc, label: (ctx.props as { label: string }).label };
    },
  });
}

const listTemplate = (keyed: boolean): TemplateNode[] => [{
  type: "element", tag: "Item", events: [], children: [],
  for: { source: "items.value", value: "r", blockId: "b0" },
  attrs: [
    ...(keyed ? [{ kind: "dynamic" as const, name: "key", value: "r" }] : []),
    { kind: "dynamic" as const, name: "label", value: "r" },
  ],
}];

async function serverRender(keyed: boolean) {
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: [], template: listTemplate(keyed),
    async script(ctx) { return { items: ctx.ref(["a", "b", "c"]) }; },
  });
  return renderAppAsync({
    page, components: { Item: item() }, modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
}

describe("server output for keyed components inside blocks", () => {
  it("marks keyed children inside a v-for with their scope and key", async () => {
    const { html } = await serverRender(true);
    expect(html).toContain("<!--rx-c:s1:a-->");
    expect(html).toContain("<!--rx-c:s3:c-->");
    expect(html.match(/<!--\/rx-c-->/g)).toHaveLength(3);
  });

  it("adds no markers for unkeyed children", async () => {
    const { html } = await serverRender(false);
    expect(html).not.toContain("rx-c");
  });
});

describe("client runtime: server-rendered keyed children inside blocks", () => {
  async function setup(keyed = true) {
    const { html, payload } = await serverRender(keyed);
    return `
      const child = createClientComponent({
        id: "m1", name: "Item", handlers: ["inc"],
        template: [{ type: "element", tag: "button", attrs: [{ kind: "static", name: "class", value: "bb" }],
          events: [{ name: "click", handler: "inc" }],
          children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }, { type: "text", value: ":" }, { type: "interpolation", expression: "label", bindingId: "b1" }] }],
        async script(ctx) { const n = ctx.ref(0); function inc() { n.value++; } return { n, inc, label: ctx.props.label }; }
      });
      globalThis.importComponent = async () => child;
      globalThis.__RESUX__ = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(payload))}"));
      document.body.innerHTML = decodeURIComponent("${encodeURIComponent(`<div id="host">${html}</div>`)}");
      const node = { type: "element", tag: "Item", events: [], children: [], for: { source: "items", value: "r", blockId: "b0" },
        attrs: [${keyed ? '{ kind: "dynamic", name: "key", value: "r" },' : ""} { kind: "dynamic", name: "label", value: "r" }] };
      const render = (items) => { const h = renderNode(node, { items }, {}, "", "s0", "p1"); return h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")); };
      const settle = () => new Promise((r) => setTimeout(r, 40));
      const patch = async (items) => { applyPatches("s0", [{ type: "block", id: "b0", value: render(items) }]); await settle(); };
      const texts = () => Array.from(document.querySelectorAll("button.bb")).map((b) => b.textContent.trim()).join(",");
      const click = async (i) => { await handleDelegatedEvent("click", { target: document.querySelectorAll("button.bb")[i], preventDefault() {}, stopPropagation() {} }); await settle(); };
    `;
  }

  it("keeps a server-rendered child's state when the block re-renders", async () => {
    const results = await runClientEngineProbe(`${await setup()}
      await click(1);
      t("clicked server child incremented", texts() === "0:a,1:b,0:c", texts());
      const before = document.querySelectorAll("button.bb")[1];
      await patch(["a", "b", "c"]);
      t("state preserved", texts() === "0:a,1:b,0:c", texts());
      t("same DOM node reused", document.querySelectorAll("button.bb")[1] === before, "node replaced");
      t("markers are gone", !document.body.innerHTML.includes("rx-c"), document.body.innerHTML);
      await patch(["a", "b", "c"]);
      t("second re-render still keeps state", texts() === "0:a,1:b,0:c", texts());
    `);
    expectAllPass(results);
  });

  it("moves state with the key on reorder, creates inserted items fresh and drops removed ones", async () => {
    const results = await runClientEngineProbe(`${await setup()}
      await click(0);
      await click(2);
      await click(2);
      await patch(["c", "a", "b"]);
      t("reorder follows the key", texts() === "2:c,1:a,0:b", texts());
      await patch(["c", "x", "a", "b"]);
      t("insert is fresh", texts() === "2:c,0:x,1:a,0:b", texts());
      await patch(["x", "a"]);
      t("removal drops the others", texts() === "0:x,1:a", texts());
    `);
    expectAllPass(results);
  });

  it("creates the child fresh when its props changed", async () => {
    const results = await runClientEngineProbe(`${await setup()}
      await click(0);
      const labels = ["a2", "b", "c"];
      const keyedNode = { ...node, attrs: [{ kind: "dynamic", name: "key", value: "r.k" }, { kind: "dynamic", name: "label", value: "r.l" }] };
      const h = renderNode(keyedNode, { items: [{ k: "a", l: "a2" }, { k: "b", l: "b" }, { k: "c", l: "c" }] }, {}, "", "s0", "p1");
      applyPatches("s0", [{ type: "block", id: "b0", value: h.slice(h.indexOf(">") + 1, h.lastIndexOf("</span>")) }]);
      await settle();
      t("changed child restarts with new props", texts() === "0:a2,0:b,0:c", texts());
    `);
    expectAllPass(results);
  });

  it("behaves as before for unkeyed children", async () => {
    const results = await runClientEngineProbe(`${await setup(false)}
      await click(1);
      await patch(["a", "b", "c"]);
      t("unkeyed server children are created again", texts() === "0:a,0:b,0:c", texts());
    `);
    expectAllPass(results);
  });
});
