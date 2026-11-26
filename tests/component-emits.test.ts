import { describe, expect, it } from "vitest";
import { defineComponent, renderAppAsync, type TemplateNode } from "resuxjs/runtime";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Events written on a component tag (<Child @save="onSave" />) are delivered when the child emits them.
// The server renders emit as a no-op and carries the mapping in the payload so a resumed child can reach
// the parent handler.

const childTemplate: TemplateNode[] = [{
  type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "inc" }],
  children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }],
}];

const child = defineComponent({
  id: "m1", name: "Child", file: "Child.vue", handlers: ["inc"], template: childTemplate,
  async script(ctx) {
    const emit = ctx.defineEmits();
    const n = ctx.ref(0);
    function inc() { n.value++; emit("save", n.value); }
    return { n, inc };
  },
});

async function render(events: unknown[]) {
  const page = defineComponent({
    id: "p1", name: "Page", file: "Page.vue", handlers: ["onSave"],
    template: [{ type: "element", tag: "Child", attrs: [], events: events as never[], children: [] }],
    async script(ctx) {
      const last = ctx.ref(0);
      function onSave(v: number) { last.value = v; }
      return { last, onSave };
    },
  });
  return renderAppAsync({
    page, components: { Child: child },
    modules: { m1: "/m1.mjs", p1: "/p1.mjs" },
    route: { path: "/", params: {}, query: {}, fullPath: "/" } as never,
  });
}

describe("server: component emits", () => {
  it("carries the parent handler mapping in the payload and keeps emit a no-op", async () => {
    const result = await render([{ name: "save", handler: "onSave" }]);
    const scopes = result.payload.scopes as Record<string, { moduleId: string; emits?: unknown }>;
    const childScope = Object.values(scopes).find((scope) => scope.moduleId === "m1");
    const pageScope = Object.values(scopes).find((scope) => scope.moduleId === "p1");
    expect(childScope?.emits).toEqual({ save: { handler: "s0:p1:onSave" } });
    expect(pageScope?.emits).toBeUndefined();
  });

  it("does not change the payload for components without events", async () => {
    const result = await render([]);
    expect(JSON.stringify(result.payload)).not.toContain("emits");
  });

  it("normalizes kebab-case event names", async () => {
    const result = await render([{ name: "save-item", handler: "onSave" }]);
    const scopes = result.payload.scopes as Record<string, { moduleId: string; emits?: Record<string, unknown> }>;
    expect(Object.keys(Object.values(scopes).find((scope) => scope.moduleId === "m1")?.emits ?? {})).toEqual(["saveItem"]);
  });
});

describe("client runtime: component emits", () => {
  const setup = `
    const parent = createClientComponent({
      id: "p1", name: "Page", handlers: ["onSave", "onMany"],
      template: [{ type: "element", tag: "p", attrs: [], events: [], children: [{ type: "interpolation", expression: "last.value", bindingId: "b0" }] }],
      async script(ctx) {
        const last = ctx.useState("last", () => "none");
        function onSave(v, locals) { last.value = locals ? v + "+" + locals.id : String(v); }
        function onMany(a, b) { last.value = a + "," + b; }
        return { last, onSave, onMany };
      }
    });
    const child = createClientComponent({
      id: "m1", name: "Child", handlers: ["inc", "many"],
      template: [{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "inc" }], children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }] }],
      async script(ctx) {
        const emit = ctx.defineEmits();
        const n = ctx.ref(0);
        function inc() { n.value++; emit("save", n.value); }
        function many() { emit("many", "x", "y"); emit("nobody-listens", 1); }
        return { n, inc, many };
      }
    });
    const defs = { p1: parent, m1: child };
    globalThis.importComponent = async (id) => defs[id];
    const mapping = (extra) => Object.assign({ save: { handler: "s0:p1:onSave" } }, extra || {});
    globalThis.__RESUX__ = { route: { path: "/" }, modules: { p1: "/p1.mjs", m1: "/m1.mjs" }, scopes: {
      s0: { id: "s0", moduleId: "p1", props: {}, state: { last: "none" }, globalStateKeys: [], asyncData: {} },
      s1: { id: "s1", moduleId: "m1", props: {}, state: {}, globalStateKeys: [], asyncData: {}, emits: mapping() }
    } };
    document.body.innerHTML = '<p><span data-rx-text="s0:b0">none</span></p><button id="c" data-rx-on-click="s1:m1:inc"><span data-rx-text="s1:b0">0</span></button><button id="m" data-rx-on-click="s1:m1:many">m</button>';
    const click = async (id) => { await handleDelegatedEvent("click", { target: document.getElementById(id), preventDefault() {}, stopPropagation() {} }); };
    const parentText = () => document.querySelector('[data-rx-text="s0:b0"]').textContent;
  `;

  it("runs the parent handler with the emitted value and updates the parent's DOM and payload", async () => {
    const results = await runClientEngineProbe(`${setup}
      await click("c");
      t("child updated", document.querySelector('[data-rx-text="s1:b0"]').textContent === "1", document.body.innerHTML);
      t("parent handler ran", parentText() === "1", parentText());
      await click("c");
      t("second emit", parentText() === "2", parentText());
      t("parent state serialized", JSON.stringify(globalThis.__RESUX__.scopes.s0.state) === JSON.stringify({ last: "2" }), JSON.stringify(globalThis.__RESUX__.scopes.s0.state));
    `);
    expectAllPass(results);
  });

  it("passes all emitted arguments and ignores events nobody listens to", async () => {
    const results = await runClientEngineProbe(`${setup}
      globalThis.__RESUX__.scopes.s1.emits = mapping({ many: { handler: "s0:p1:onMany" } });
      await click("m");
      t("all args", parentText() === "x,y", parentText());
    `);
    expectAllPass(results);
  });

  it("passes event locals to the parent handler", async () => {
    const results = await runClientEngineProbe(`${setup}
      globalThis.__RESUX__.scopes.s1.emits = { save: { handler: "s0:p1:onSave", locals: { id: 7 } } };
      await click("c");
      t("locals", parentText() === "1+7", parentText());
    `);
    expectAllPass(results);
  });

  it("does nothing when the child has no mapping", async () => {
    const results = await runClientEngineProbe(`${setup}
      delete globalThis.__RESUX__.scopes.s1.emits;
      await click("c");
      t("child ran", document.querySelector('[data-rx-text="s1:b0"]').textContent === "1", document.body.innerHTML);
      t("parent untouched", parentText() === "none", parentText());
    `);
    expectAllPass(results);
  });
});
