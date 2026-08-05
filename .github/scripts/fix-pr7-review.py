from pathlib import Path

runtime_path = Path("src/runtime/index.ts")
runtime = runtime_path.read_text(encoding="utf-8")

replacements = [
    (
        '      if (globalStateRefs[normalizedKey]) {\n        return globalStateRefs[normalizedKey] as Ref<T>;\n      }',
        '      if (Object.prototype.hasOwnProperty.call(globalStateRefs, normalizedKey)) {\n        return globalStateRefs[normalizedKey] as Ref<T>;\n      }',
    ),
    (
        '''    watch(stateRef, () => {
      assertJsonSerializable(stateRef.value, 'useGlobalState("' + normalizedKey + '")');
      const currentPayload = globalThis.__RESUX__;
      if (currentPayload) {
        currentPayload.globalState ||= {};
        currentPayload.globalState[normalizedKey] = stateRef.value;
      }
      queueGlobalStateRefresh(normalizedKey);
    }, { flush: "post", deep: true });''',
        '''    watch(stateRef, () => {
      try {
        assertJsonSerializable(stateRef.value, 'useGlobalState("' + normalizedKey + '")');
      } catch (error) {
        console.error("[resux:global-state] Ignoring a non-serializable assignment for " + normalizedKey + ".", error);
        return;
      }
      const currentPayload = globalThis.__RESUX__;
      if (currentPayload) {
        currentPayload.globalState ||= {};
        currentPayload.globalState[normalizedKey] = stateRef.value;
      }
      queueGlobalStateRefresh(normalizedKey);
    }, { flush: "post", deep: true });''',
    ),
    (
        '''async function refreshScopesForGlobalState(changedKeys) {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules || changedKeys.size === 0) {
    return;
  }

  const affectedScopes = Object.entries(payload.scopes).filter(([, serializedScope]) => {
    const keys = Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : [];
    return keys.some((key) => changedKeys.has(key));
  });

  await Promise.all(affectedScopes.map(async ([scopeId, serializedScope]) => {
    const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
    if (!component) {
      return;
    }

    let scopeRecord = scopeCache.get(scopeId);
    if (!scopeRecord) {
      scopeRecord = await component.createScope(serializedScope, payload.route);
      scopeCache.set(scopeId, scopeRecord);
    }

    const patches = component.render(scopeRecord);
    const serialized = component.serialize(scopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches);
  }));
}''',
        '''async function refreshScopesForGlobalState(changedKeys) {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules || changedKeys.size === 0) {
    return;
  }

  const affectedScopes = [...scopeCache.entries()].filter(([scopeId]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      return false;
    }
    const keys = Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : [];
    return keys.some((key) => changedKeys.has(key));
  });

  await Promise.allSettled(affectedScopes.map(async ([scopeId, scopeRecord]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      return;
    }

    try {
      const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
      if (!component) {
        return;
      }

      const patches = component.render(scopeRecord);
      const serialized = component.serialize(scopeRecord);
      serializedScope.props = serialized.props;
      serializedScope.state = serialized.state;
      serializedScope.asyncData = serialized.asyncData;
      applyPatches(scopeId, patches);
    } catch (error) {
      console.error("[resux:global-state] Failed to refresh scope " + scopeId + ".", error);
    }
  }));
}''',
    ),
]

for old, new in replacements:
    if old not in runtime:
        raise SystemExit(f"Expected runtime block was not found:\n{old[:160]}")
    runtime = runtime.replace(old, new, 1)

runtime_path.write_text(runtime, encoding="utf-8")

Path("tests/global-state.test.ts").write_text(r'''import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import {
  defineComponent,
  getClientRuntimeSource,
  renderApp,
  type ComponentDefinition
} from "resuxjs/runtime";

let runtimeImportCounter = 0;

function nextRuntimeImportQuery() {
  runtimeImportCounter += 1;
  return `${Date.now()}-${runtimeImportCounter}`;
}

async function waitForCondition(predicate: () => boolean, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for global-state condition.");
}

function createSharedCounterComponent(): ComponentDefinition {
  return defineComponent({
    id: "global-client-counter",
    name: "GlobalClientCounter",
    file: "GlobalClientCounter.vue",
    handlers: ["increment", "touch"],
    async script(ctx) {
      const session = ctx.useGlobalState("session", () => ({ visits: 0 }));
      function increment() { session.value.visits += 1; }
      function touch() {}
      return { session, increment, touch };
    },
    template: [
      { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "increment" }], children: [{ type: "text", value: "Increment" }] },
      { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "touch" }], children: [{ type: "text", value: "Touch" }] },
      { type: "interpolation", expression: "session.value.visits", bindingId: "global-count" }
    ]
  });
}

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
      async script() { return {}; },
      template: [{
        type: "element",
        tag: "main",
        attrs: [],
        events: [],
        children: [
          { type: "element", tag: "GlobalFirst", attrs: [], events: [], children: [] },
          { type: "element", tag: "GlobalSecond", attrs: [], events: [], children: [] }
        ]
      }]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      components: { GlobalFirst: first, GlobalSecond: second }
    });

    expect(result.payload.globalState).toEqual({ session: { visits: 1 } });
    expect(result.html.match(/>1<\/span>/g)?.length).toBe(2);
    expect(Object.values(result.payload.scopes).filter((scope) => scope.globalStateKeys?.includes("session"))).toHaveLength(2);
    expect(Object.values(result.payload.scopes).every((scope) => Object.keys(scope.state).length === 0)).toBe(true);
  });

  it("supports global-state keys inherited from Object.prototype", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "prototype-key-page",
      name: "PrototypeKeyPage",
      file: "PrototypeKeyPage.vue",
      handlers: [],
      async script(ctx) {
        const state = ctx.useGlobalState("constructor", () => ({ ready: true }));
        return { state };
      },
      template: [{ type: "interpolation", expression: "state.value.ready", bindingId: "ready" }]
    });

    const result = await renderApp({ page, route: { path: "/prototype-key", params: {}, query: {} } });
    expect(result.payload.globalState).toEqual({ constructor: { ready: true } });
    expect(result.html).toContain(">true</span>");
  });

  it("isolates global state between concurrent SSR requests", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "request-global-page",
      name: "RequestGlobalPage",
      file: "RequestGlobalPage.vue",
      handlers: [],
      async script(ctx) {
        const requestCount = ctx.useGlobalState("request-count", () => 0);
        requestCount.value += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { requestCount };
      },
      template: [{ type: "interpolation", expression: "requestCount.value", bindingId: "request-count" }]
    });

    const [firstRequest, secondRequest] = await Promise.all([
      renderApp({ page, route: { path: "/first", params: {}, query: {} } }),
      renderApp({ page, route: { path: "/second", params: {}, query: {} } })
    ]);

    expect(firstRequest.payload.globalState).toEqual({ "request-count": 1 });
    expect(secondRequest.payload.globalState).toEqual({ "request-count": 1 });
  });

  it("persists client mutations, refreshes resumed consumers, and preserves state during navigation", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-global-state-client-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "counter.mjs");
    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(componentFile, `import { createClientComponent } from ${JSON.stringify(runtimeImportUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "increment" }], children: [{ type: "text", value: "Increment" }] },
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "touch" }], children: [{ type: "text", value: "Touch" }] },
  { type: "interpolation", expression: "session.value.visits", bindingId: "global-count" }
];
async function script(ctx) {
  const session = ctx.useGlobalState("session", () => ({ visits: 0 }));
  function increment() { session.value.visits += 1; }
  function touch() {}
  return { session, increment, touch };
}
export default createClientComponent({ id: "global-client-counter", name: "GlobalClientCounter", file: "GlobalClientCounter.vue", handlers: ["increment", "touch"], script, template });
`, "utf8");

    const counter = createSharedCounterComponent();
    const page: ComponentDefinition = defineComponent({
      id: "global-client-page",
      name: "GlobalClientPage",
      file: "GlobalClientPage.vue",
      handlers: [],
      async script() { return {}; },
      template: [{
        type: "element",
        tag: "main",
        attrs: [],
        events: [],
        children: [
          { type: "element", tag: "GlobalClientCounter", attrs: [], events: [], children: [] },
          { type: "element", tag: "GlobalClientCounter", attrs: [], events: [], children: [] }
        ]
      }]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      components: { GlobalClientCounter: counter },
      modules: { "global-client-counter": pathToFileURL(componentFile).href }
    });

    const nextPayload = JSON.parse(JSON.stringify(result.payload));
    nextPayload.route = { path: "/next", params: {}, query: {} };
    nextPayload.globalState = { session: { visits: 0 } };

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `<div id="__resux"><a href="/next">Next</a>${result.html}</div>`;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(JSON.stringify({ html: result.html, head: { title: "Next" }, payload: nextPayload }), {
        status: 200,
        headers: { "content-type": "application/json" }
      }),
      __RESUX__: result.payload,
      __RESUX_INSTALLED__: false,
      __RESUX_GLOBAL_STATE_REFS__: new Map()
    });

    await import(runtimeImportUrl);
    const touchButtons = [...window.document.querySelectorAll<HTMLButtonElement>('button[data-rx-on-click$=":touch"]')];
    expect(touchButtons).toHaveLength(2);
    for (const button of touchButtons) {
      button.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const incrementButton = window.document.querySelector<HTMLButtonElement>('button[data-rx-on-click$=":increment"]');
    expect(incrementButton).not.toBeNull();
    incrementButton!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForCondition(() => (globalThis as any).__RESUX__.globalState.session.visits === 1);

    const renderedCounts = [...window.document.querySelectorAll("span")]
      .map((element) => element.textContent?.trim())
      .filter((value) => value === "1");
    expect(renderedCounts).toHaveLength(2);

    window.document.querySelector<HTMLAnchorElement>('a[href="/next"]')!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForCondition(() => window.location.pathname === "/next");
    expect((globalThis as any).__RESUX__.globalState).toEqual({ session: { visits: 1 } });
  });

  it("contains invalid global assignments without skipping other queued watchers", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-global-state-queue-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const componentFile = path.join(tempDir, "queue.mjs");
    const runtimeImportUrl = `${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`;

    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(componentFile, `import { createClientComponent } from ${JSON.stringify(runtimeImportUrl)};
const template = [{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "mutateBoth" }], children: [{ type: "text", value: "Mutate" }] }];
async function script(ctx) {
  const broken = ctx.useGlobalState("broken", () => ({ value: 0 }));
  const safe = ctx.useGlobalState("safe", () => ({ value: 0 }));
  function mutateBoth() {
    broken.value.invalid = BigInt(1);
    safe.value.value += 1;
  }
  return { broken, safe, mutateBoth };
}
export default createClientComponent({ id: "global-queue", name: "GlobalQueue", file: "GlobalQueue.vue", handlers: ["mutateBoth"], script, template });
`, "utf8");

    const page: ComponentDefinition = defineComponent({
      id: "global-queue",
      name: "GlobalQueue",
      file: "GlobalQueue.vue",
      handlers: ["mutateBoth"],
      async script(ctx) {
        const broken = ctx.useGlobalState("broken", () => ({ value: 0 }));
        const safe = ctx.useGlobalState("safe", () => ({ value: 0 }));
        function mutateBoth() {}
        return { broken, safe, mutateBoth };
      },
      template: [{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "mutateBoth" }], children: [{ type: "text", value: "Mutate" }] }]
    });

    const result = await renderApp({
      page,
      route: { path: "/queue", params: {}, query: {} },
      modules: { "global-queue": pathToFileURL(componentFile).href }
    });
    const window = new Window({ url: "http://localhost/queue" });
    window.document.body.innerHTML = `<div id="__resux">${result.html}</div>`;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: result.payload,
      __RESUX_INSTALLED__: false,
      __RESUX_GLOBAL_STATE_REFS__: new Map()
    });

    try {
      await import(runtimeImportUrl);
      window.document.querySelector<HTMLButtonElement>('button[data-rx-on-click$=":mutateBoth"]')!
        .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
      await waitForCondition(() => (globalThis as any).__RESUX__.globalState.safe.value === 1);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
''', encoding="utf-8")
