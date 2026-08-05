from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_count(text: str, old: str, new: str, expected: int, label: str) -> str:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)


runtime_path = Path("src/runtime/index.ts")
runtime = runtime_path.read_text(encoding="utf-8")

runtime = replace_count(
    runtime,
    '  private readonly globalStateRefs: Record<string, Ref<unknown>> = {};',
    '  private readonly globalStateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;',
    2,
    "request-local global registries",
)

runtime = replace_once(
    runtime,
    '  globalStateRefs: Record<string, Ref<unknown>> = {},\n  globalStateKeys: Set<string> = new Set()',
    '  globalStateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>,\n  globalStateKeys: Set<string> = new Set()',
    "setup-context default registry",
)

runtime = replace_once(
    runtime,
    '    globalState: {},\n    modules,',
    '    globalState: Object.create(null) as Record<string, JsonValue>,\n    modules,',
    "server app payload registry",
)

runtime = replace_once(
    runtime,
    'const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();\nconst dirtyGlobalStateKeys = new Set();',
    'const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();\nconst globalStateSnapshots = globalThis.__RESUX_GLOBAL_STATE_SNAPSHOTS__ ||= new Map();\nconst dirtyGlobalStateKeys = new Set();',
    "client snapshot registry",
)

runtime = replace_once(
    runtime,
    '''function assertJsonSerializable(value, label) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(label + " must be JSON serializable.");
  }
  try {
    JSON.stringify(value);
  } catch {
    throw new Error(label + " must be JSON serializable.");
  }
}

function escapeHtml(value) {''',
    '''function assertJsonSerializable(value, label) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(label + " must be JSON serializable.");
  }
  try {
    JSON.stringify(value);
  } catch {
    throw new Error(label + " must be JSON serializable.");
  }
}

function cloneJsonSerializable(value, label) {
  assertJsonSerializable(value, label);
  return JSON.parse(JSON.stringify(value));
}

function setSerializableRecordValue(record, key, value) {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function escapeHtml(value) {''',
    "generated serialization helpers",
)

runtime = replace_once(
    runtime,
    '''function useClientGlobalState(key, factory) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error("useGlobalState(key) requires a non-empty key.");
  }

  if (!globalStateRefs.has(normalizedKey)) {
    const payload = globalThis.__RESUX__;
    const snapshot = payload && payload.globalState ? payload.globalState : {};
    const hasValue = Object.prototype.hasOwnProperty.call(snapshot, normalizedKey);
    const value = hasValue ? snapshot[normalizedKey] : (typeof factory === "function" ? factory() : undefined);
    assertJsonSerializable(value, 'useGlobalState("' + normalizedKey + '")');
    const stateRef = ref(value);

    watch(stateRef, () => {
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
    }, { flush: "post", deep: true });

    globalStateRefs.set(normalizedKey, stateRef);
  }

  return globalStateRefs.get(normalizedKey);
}

function serializeClientGlobalState() {
  const output = {};
  for (const [key, stateRef] of globalStateRefs.entries()) {
    assertJsonSerializable(stateRef.value, 'useGlobalState("' + key + '")');
    output[key] = stateRef.value;
  }
  return output;
}

function mergeClientGlobalState(payload) {
  if (!payload) {
    return payload;
  }
  payload.globalState = {
    ...(payload.globalState || {}),
    ...serializeClientGlobalState()
  };
  return payload;
}''',
    '''function useClientGlobalState(key, factory) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error("useGlobalState(key) requires a non-empty key.");
  }

  if (!globalStateRefs.has(normalizedKey)) {
    const payload = globalThis.__RESUX__;
    const snapshot = payload && payload.globalState ? payload.globalState : Object.create(null);
    const hasValue = Object.prototype.hasOwnProperty.call(snapshot, normalizedKey);
    const value = hasValue ? snapshot[normalizedKey] : (typeof factory === "function" ? factory() : undefined);
    const label = 'useGlobalState("' + normalizedKey + '")';
    const serializedValue = cloneJsonSerializable(value, label);
    const stateRef = ref(value);
    globalStateSnapshots.set(normalizedKey, serializedValue);

    watch(stateRef, () => {
      try {
        const nextSnapshot = cloneJsonSerializable(stateRef.value, label);
        globalStateSnapshots.set(normalizedKey, nextSnapshot);
        const currentPayload = globalThis.__RESUX__;
        if (currentPayload) {
          currentPayload.globalState ||= Object.create(null);
          setSerializableRecordValue(currentPayload.globalState, normalizedKey, nextSnapshot);
        }
        queueGlobalStateRefresh(normalizedKey);
      } catch (error) {
        console.error("[resux:global-state] Reverting a non-serializable assignment for " + normalizedKey + ".", error);
        if (globalStateSnapshots.has(normalizedKey)) {
          stateRef.value = cloneJsonSerializable(globalStateSnapshots.get(normalizedKey), label);
        }
      }
    }, { flush: "post", deep: true });

    globalStateRefs.set(normalizedKey, stateRef);
  }

  return globalStateRefs.get(normalizedKey);
}

function serializeClientGlobalState() {
  const output = Object.create(null);
  for (const [key, stateRef] of globalStateRefs.entries()) {
    const label = 'useGlobalState("' + key + '")';
    try {
      const snapshot = cloneJsonSerializable(stateRef.value, label);
      globalStateSnapshots.set(key, snapshot);
      setSerializableRecordValue(output, key, snapshot);
    } catch (error) {
      console.error("[resux:global-state] Reverting a non-serializable assignment for " + key + ".", error);
      if (!globalStateSnapshots.has(key)) {
        continue;
      }
      const snapshot = cloneJsonSerializable(globalStateSnapshots.get(key), label);
      stateRef.value = cloneJsonSerializable(snapshot, label);
      setSerializableRecordValue(output, key, snapshot);
    }
  }
  return output;
}

function mergeClientGlobalState(payload) {
  if (!payload) {
    return payload;
  }
  const merged = Object.create(null);
  for (const [key, value] of Object.entries(payload.globalState || {})) {
    setSerializableRecordValue(merged, key, value);
  }
  for (const [key, value] of Object.entries(serializeClientGlobalState())) {
    setSerializableRecordValue(merged, key, value);
  }
  payload.globalState = merged;
  return payload;
}''',
    "client global-state lifecycle",
)

runtime = replace_once(
    runtime,
    'function serializeRefs(refs) {\n  const output = {};',
    'function serializeRefs(refs) {\n  const output = Object.create(null);',
    "generated ref serialization",
)

runtime = replace_once(
    runtime,
    'function serializeRefs(refs: Record<string, Ref<unknown>>): Record<string, JsonValue> {\n  const output: Record<string, JsonValue> = {};',
    'function serializeRefs(refs: Record<string, Ref<unknown>>): Record<string, JsonValue> {\n  const output: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;',
    "server ref serialization",
)

runtime_path.write_text(runtime, encoding="utf-8")


test_path = Path("tests/global-state.test.ts")
tests = test_path.read_text(encoding="utf-8")

tests = replace_once(
    tests,
    '''  it("supports global-state keys inherited from Object.prototype", async () => {
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
  });''',
    '''  it("supports prototype-sensitive global-state keys safely", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "prototype-key-page",
      name: "PrototypeKeyPage",
      file: "PrototypeKeyPage.vue",
      handlers: [],
      async script(ctx) {
        const constructorState = ctx.useGlobalState("constructor", () => ({ ready: true }));
        const protoState = ctx.useGlobalState("__proto__", () => ({ safe: true }));
        return { constructorState, protoState };
      },
      template: [
        { type: "interpolation", expression: "constructorState.value.ready", bindingId: "ready" },
        { type: "interpolation", expression: "protoState.value.safe", bindingId: "safe" }
      ]
    });

    const result = await renderApp({ page, route: { path: "/prototype-key", params: {}, query: {} } });
    expect(Object.getPrototypeOf(result.payload.globalState!)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(result.payload.globalState, "constructor")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result.payload.globalState, "__proto__")).toBe(true);
    expect(result.payload.globalState?.constructor).toEqual({ ready: true });
    expect(result.payload.globalState?.["__proto__"]).toEqual({ safe: true });
    expect(result.html.match(/>true<\\/span>/g)?.length).toBe(2);
  });''',
    "prototype-sensitive regression test",
)

tests = replace_count(
    tests,
    '      __RESUX_GLOBAL_STATE_REFS__: new Map()\n',
    '      __RESUX_GLOBAL_STATE_REFS__: new Map(),\n      __RESUX_GLOBAL_STATE_SNAPSHOTS__: new Map()\n',
    2,
    "client test snapshot resets",
)

tests = replace_once(
    tests,
    '''    const window = new Window({ url: "http://localhost/queue" });
    window.document.body.innerHTML = `<div id="__resux">${result.html}</div>`;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: result.payload,
      __RESUX_INSTALLED__: false,
      __RESUX_GLOBAL_STATE_REFS__: new Map(),
      __RESUX_GLOBAL_STATE_SNAPSHOTS__: new Map()
    });''',
    '''    const nextPayload = JSON.parse(JSON.stringify(result.payload));
    nextPayload.route = { path: "/next", params: {}, query: {} };
    const window = new Window({ url: "http://localhost/queue" });
    window.document.body.innerHTML = `<div id="__resux"><a href="/next">Next</a>${result.html}</div>`;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

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
      __RESUX_GLOBAL_STATE_REFS__: new Map(),
      __RESUX_GLOBAL_STATE_SNAPSHOTS__: new Map()
    });''',
    "invalid-assignment navigation setup",
)

tests = replace_once(
    tests,
    '''      await waitForCondition(() => (globalThis as any).__RESUX__.globalState.safe.value === 1);
      await waitForCondition(() => errorSpy.mock.calls.length > 0);''',
    '''      await waitForCondition(() => (globalThis as any).__RESUX__.globalState.safe.value === 1);
      await waitForCondition(() => errorSpy.mock.calls.length > 0);
      await waitForCondition(() => {
        const broken = (globalThis as any).__RESUX_GLOBAL_STATE_REFS__.get("broken");
        return broken?.value?.value === 0;
      });
      expect((globalThis as any).__RESUX__.globalState.broken).toEqual({ value: 0 });

      window.document.querySelector<HTMLAnchorElement>('a[href="/next"]')!
        .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
      await waitForCondition(() => window.location.pathname === "/next");
      expect((globalThis as any).__RESUX__.globalState.broken).toEqual({ value: 0 });
      expect((globalThis as any).__RESUX__.globalState.safe).toEqual({ value: 1 });''',
    "invalid-assignment rollback assertions",
)

test_path.write_text(tests, encoding="utf-8")
