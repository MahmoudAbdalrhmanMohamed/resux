from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def replace_count(text: str, old: str, new: str, expected: int, label: str) -> str:
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)


runtime_path = Path("src/runtime/index.ts")
runtime = runtime_path.read_text()

runtime = replace_once(
    runtime,
    '  state: Record<string, JsonValue>;\n  asyncData: Record<string, SerializedAsyncData>;',
    '  state: Record<string, JsonValue>;\n  globalStateKeys?: string[];\n  asyncData: Record<string, SerializedAsyncData>;',
    "serialized scope global keys",
)

runtime = replace_once(
    runtime,
    '''  props: Record<string, unknown>;
  stateRefs: Record<string, Ref<unknown>>;
  asyncDataRefs: Record<string, AsyncDataResource<unknown>>;''',
    '''  props: Record<string, unknown>;
  stateRefs: Record<string, Ref<unknown>>;
  globalStateKeys: Set<string>;
  asyncDataRefs: Record<string, AsyncDataResource<unknown>>;''',
    "scope record global keys",
)

runtime = replace_count(
    runtime,
    '''    const stateRefs: Record<string, Ref<unknown>> = {};
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};''',
    '''    const stateRefs: Record<string, Ref<unknown>> = {};
    const globalStateKeys = new Set<string>();
    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};''',
    2,
    "renderer global key sets",
)

runtime = replace_count(
    runtime,
    '''      this.runtimeConfig,
      this.globalStateRefs
    );''',
    '''      this.runtimeConfig,
      this.globalStateRefs,
      globalStateKeys
    );''',
    2,
    "pass global key sets",
)

runtime = replace_count(
    runtime,
    '''      props,
      stateRefs,
      asyncDataRefs''',
    '''      props,
      stateRefs,
      globalStateKeys,
      asyncDataRefs''',
    2,
    "store global key sets",
)

runtime = replace_count(
    runtime,
    '''        props: serializeProps(scope.props),
        state: serializeRefs(scope.stateRefs),
        asyncData: serializeAsyncData(scope.asyncDataRefs)''',
    '''        props: serializeProps(scope.props),
        state: serializeRefs(scope.stateRefs),
        globalStateKeys: [...scope.globalStateKeys],
        asyncData: serializeAsyncData(scope.asyncDataRefs)''',
    2,
    "serialize global key sets",
)

runtime = replace_once(
    runtime,
    '''  runtimeConfig: RuntimeConfig,
  globalStateRefs: Record<string, Ref<unknown>> = {}
): SetupContext {''',
    '''  runtimeConfig: RuntimeConfig,
  globalStateRefs: Record<string, Ref<unknown>> = {},
  globalStateKeys: Set<string> = new Set()
): SetupContext {''',
    "server setup global key parameter",
)

runtime = replace_once(
    runtime,
    '''      if (!normalizedKey) {
        throw new Error("useGlobalState(key) requires a non-empty key.");
      }
      if (globalStateRefs[normalizedKey]) {''',
    '''      if (!normalizedKey) {
        throw new Error("useGlobalState(key) requires a non-empty key.");
      }
      globalStateKeys.add(normalizedKey);
      if (globalStateRefs[normalizedKey]) {''',
    "server records global key",
)

runtime = replace_once(
    runtime,
    '''const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();
let globalStateRefreshQueued = false;''',
    '''const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();
const dirtyGlobalStateKeys = new Set();
let globalStateRefreshQueued = false;''',
    "client dirty key registry",
)

runtime = replace_once(
    runtime,
    '''      queueGlobalStateRefresh();
    }, { flush: "post" });''',
    '''      queueGlobalStateRefresh(normalizedKey);
    }, { flush: "post", deep: true });''',
    "deep global state watch",
)

runtime = replace_once(
    runtime,
    '''function queueGlobalStateRefresh() {
  if (globalStateRefreshQueued) {
    return;
  }
  globalStateRefreshQueued = true;
  queueMicrotask(() => {
    globalStateRefreshQueued = false;
    void refreshAllScopesForGlobalState();
  });
}

async function refreshAllScopesForGlobalState() {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules) {
    return;
  }

  await Promise.all(Object.entries(payload.scopes).map(async ([scopeId, serializedScope]) => {
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
    '''function queueGlobalStateRefresh(key) {
  dirtyGlobalStateKeys.add(key);
  if (globalStateRefreshQueued) {
    return;
  }
  globalStateRefreshQueued = true;
  queueMicrotask(() => {
    globalStateRefreshQueued = false;
    const changedKeys = new Set(dirtyGlobalStateKeys);
    dirtyGlobalStateKeys.clear();
    void refreshScopesForGlobalState(changedKeys);
  });
}

async function refreshScopesForGlobalState(changedKeys) {
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
    "targeted client refresh",
)

runtime = replace_once(
    runtime,
    '''    async createScope(serializedScope, route) {
      const stateRefs = {};
      const asyncDataRefs = {};''',
    '''    async createScope(serializedScope, route) {
      const stateRefs = {};
      const globalStateKeys = new Set(Array.isArray(serializedScope.globalStateKeys) ? serializedScope.globalStateKeys : []);
      const asyncDataRefs = {};''',
    "client scope global key set",
)

runtime = replace_once(
    runtime,
    '''        useGlobalState(key, factory) {
          return useClientGlobalState(key, factory);
        },''',
    '''        useGlobalState(key, factory) {
          const normalizedKey = String(key || "").trim();
          if (normalizedKey) {
            globalStateKeys.add(normalizedKey);
          }
          return useClientGlobalState(key, factory);
        },''',
    "client records global key",
)

runtime = replace_once(
    runtime,
    '''      const scope = await definition.script(setupContext);
      await Promise.allSettled(mountedCallbacks.map((callback) => callback()));
      return { scope, props, stateRefs, asyncDataRefs, pendingCompletions };''',
    '''      const scope = await definition.script(setupContext);
      serializedScope.globalStateKeys = [...globalStateKeys];
      await Promise.allSettled(mountedCallbacks.map((callback) => callback()));
      return { scope, props, stateRefs, globalStateKeys, asyncDataRefs, pendingCompletions };''',
    "client persists global keys",
)

runtime_path.write_text(runtime)


test_path = Path("tests/global-state.test.ts")
test = test_path.read_text()
test = replace_once(
    test,
    '''    expect(result.payload.globalState).toEqual({ session: { visits: 1 } });
    expect(result.html.match(/>1<\\/span>/g)?.length).toBe(2);
    expect(Object.values(result.payload.scopes).every((scope) => Object.keys(scope.state).length === 0)).toBe(true);''',
    '''    expect(result.payload.globalState).toEqual({ session: { visits: 1 } });
    expect(result.html.match(/>1<\\/span>/g)?.length).toBe(2);
    expect(Object.values(result.payload.scopes).filter((scope) => scope.globalStateKeys?.includes("session"))).toHaveLength(2);
    expect(Object.values(result.payload.scopes).every((scope) => Object.keys(scope.state).length === 0)).toBe(true);''',
    "SSR global key metadata test",
)
test = replace_once(
    test,
    '''    expect(source).toContain("function useClientGlobalState");
    expect(source).toContain("async function refreshAllScopesForGlobalState");
    expect(source).toContain("useGlobalState(key, factory)");''',
    '''    expect(source).toContain("function useClientGlobalState");
    expect(source).toContain("const dirtyGlobalStateKeys = new Set()");
    expect(source).toContain("async function refreshScopesForGlobalState");
    expect(source).toContain('deep: true');
    expect(source).toContain("serializedScope.globalStateKeys");
    expect(source).toContain("useGlobalState(key, factory)");''',
    "client targeting test",
)
test_path.write_text(test)

Path(".github/workflows/optimize-global-state.yml").unlink(missing_ok=True)
Path(".github/scripts/optimize-global-state.py").unlink(missing_ok=True)
