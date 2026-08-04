import { describe, expect, it } from "vitest";
import {
  defineComponent,
  getClientRuntimeSource,
  renderApp,
  type ComponentDefinition
} from "resuxjs/runtime";

describe("global state", () => {
  it("shares one request-scoped ref across rendered components", async () => {
    const first: ComponentDefinition = defineComponent({
      id: "global-first",
      name: "GlobalFirst",
      file: "GlobalFirst.vue",
      handlers: [],
      async script(ctx) {
        const session = ctx.useGlobalState("session", () => ({ visits: 0 }));
        session.value.visits += 1;
        return { session };
      },
      template: [{ type: "interpolation", expression: "session.value.visits", bindingId: "first-count" }]
    });

    const second: ComponentDefinition = defineComponent({
      id: "global-second",
      name: "GlobalSecond",
      file: "GlobalSecond.vue",
      handlers: [],
      async script(ctx) {
        const session = ctx.useGlobalState("session", () => ({ visits: 100 }));
        return { session };
      },
      template: [{ type: "interpolation", expression: "session.value.visits", bindingId: "second-count" }]
    });

    const page: ComponentDefinition = defineComponent({
      id: "global-page",
      name: "GlobalPage",
      file: "GlobalPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "main",
          attrs: [],
          events: [],
          children: [
            { type: "element", tag: "GlobalFirst", attrs: [], events: [], children: [] },
            { type: "element", tag: "GlobalSecond", attrs: [], events: [], children: [] }
          ]
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      components: { GlobalFirst: first, GlobalSecond: second }
    });

    expect(result.payload.globalState).toEqual({ session: { visits: 1 } });
    expect(result.html.match(/>1<\/span>/g)?.length).toBe(2);
    expect(Object.values(result.payload.scopes).every((scope) => Object.keys(scope.state).length === 0)).toBe(true);
  });

  it("generates a client registry that persists and refreshes global state", () => {
    const source = getClientRuntimeSource();

    expect(source).toContain("__RESUX_GLOBAL_STATE_REFS__");
    expect(source).toContain("function useClientGlobalState");
    expect(source).toContain("async function refreshAllScopesForGlobalState");
    expect(source).toContain("useGlobalState(key, factory)");
    expect(source).toContain("mergeClientGlobalState");
  });
});
