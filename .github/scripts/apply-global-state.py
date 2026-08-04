from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
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
    '  useState<T>(key: string, factory?: () => T): Ref<T>;\n  useAsyncData<T>',
    '  useState<T>(key: string, factory?: () => T): Ref<T>;\n  useGlobalState<T>(key: string, factory?: () => T): Ref<T>;\n  useAsyncData<T>',
    "SetupContext useGlobalState type",
)

runtime = replace_once(
    runtime,
    '  scopes: Record<string, SerializedScope>;\n  modules: Record<string, string>;',
    '  scopes: Record<string, SerializedScope>;\n  globalState?: Record<string, JsonValue>;\n  modules: Record<string, string>;',
    "ResuxPayload globalState type",
)

runtime = replace_once(
    runtime,
    '''class ResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly headEntries: HeadEntry[] = [];
  private readonly styleIds = new Set<string>();

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly runtimeConfig: RuntimeConfig = { public: {} }
  ) {}''',
    '''class ResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly globalStateRefs: Record<string, Ref<unknown>> = {};
  private readonly headEntries: HeadEntry[] = [];
  private readonly styleIds = new Set<string>();
  private readonly resuxApp: ResuxAppLike;

  constructor(
    private readonly route: RouteContext,
    private readonly components: Record<string, ComponentDefinition>,
    private readonly modules: Record<string, string>,
    private readonly runtimeConfig: RuntimeConfig = { public: {} }
  ) {
    this.resuxApp = createResuxApp(route, modules, runtimeConfig);
  }''',
    "sync renderer shared app and global state",
)

runtime = replace_once(
    runtime,
    '''    const resuxApp = createResuxApp(this.route, this.modules, this.runtimeConfig);
    const setupContext = createServerSetupContext(this.route, props, stateRefs, asyncDataRefs, this.headEntries, resuxApp, this.runtimeConfig);
    const scope = await withActiveResuxApp(resuxApp, () => definition.script(setupContext));''',
    '''    const setupContext = createServerSetupContext(
      this.route,
      props,
      stateRefs,
      asyncDataRefs,
      this.headEntries,
      this.resuxApp,
      this.runtimeConfig,
      this.globalStateRefs
    );
    const scope = await withActiveResuxApp(this.resuxApp, () => definition.script(setupContext));''',
    "sync renderer setup context",
)

runtime = replace_once(
    runtime,
    '''    return {
      route: this.route,
      scopes,
      modules: this.modules,
      config: publicRuntimeConfig(this.runtimeConfig)
    };''',
    '''    return {
      route: this.route,
      scopes,
      globalState: serializeRefs(this.globalStateRefs),
      modules: this.modules,
      config: publicRuntimeConfig(this.runtimeConfig)
    };''',
    "sync renderer payload",
)

runtime = replace_once(
    runtime,
    '''  resuxApp: ResuxAppLike,
  runtimeConfig: RuntimeConfig
): SetupContext {''',
    '''  resuxApp: ResuxAppLike,
  runtimeConfig: RuntimeConfig,
  globalStateRefs: Record<string, Ref<unknown>> = {}
): SetupContext {''',
    "server setup context global refs parameter",
)

runtime = replace_once(
    runtime,
    '''    useState<T>(key: string, factory?: () => T): Ref<T> {
      if (stateRefs[key]) {
        return stateRefs[key] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useState("${key}")`);
      const stateRef = ref(value as T);
      stateRefs[key] = stateRef as Ref<unknown>;
      return stateRef;
    },

    useAsyncData<T>''',
    '''    useState<T>(key: string, factory?: () => T): Ref<T> {
      if (stateRefs[key]) {
        return stateRefs[key] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useState("${key}")`);
      const stateRef = ref(value as T);
      stateRefs[key] = stateRef as Ref<unknown>;
      return stateRef;
    },

    useGlobalState<T>(key: string, factory?: () => T): Ref<T> {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) {
        throw new Error("useGlobalState(key) requires a non-empty key.");
      }
      if (globalStateRefs[normalizedKey]) {
        return globalStateRefs[normalizedKey] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, `useGlobalState("${normalizedKey}")`);
      const stateRef = ref(value as T);
      globalStateRefs[normalizedKey] = stateRef as Ref<unknown>;
      return stateRef;
    },

    useAsyncData<T>''',
    "server useGlobalState implementation",
)

runtime = replace_once(
    runtime,
    '''export class AsyncResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly styleIds = new Set<string>();''',
    '''export class AsyncResuxRenderer {
  private nextScopeId = 0;
  private readonly scopes: Record<string, ScopeRecord> = {};
  private readonly globalStateRefs: Record<string, Ref<unknown>> = {};
  private readonly styleIds = new Set<string>();''',
    "async renderer global state field",
)

runtime = replace_once(
    runtime,
    '''      this.headEntries,
      this.resuxApp,
      this.runtimeConfig
    );''',
    '''      this.headEntries,
      this.resuxApp,
      this.runtimeConfig,
      this.globalStateRefs
    );''',
    "async renderer setup context",
)

runtime = replace_once(
    runtime,
    '''    return {
      route: this.route,
      scopes,
      modules: this.modules,
      vueIslands: this.vueIslands,
      config: publicRuntimeConfig(this.runtimeConfig)
    };''',
    '''    return {
      route: this.route,
      scopes,
      globalState: serializeRefs(this.globalStateRefs),
      modules: this.modules,
      vueIslands: this.vueIslands,
      config: publicRuntimeConfig(this.runtimeConfig)
    };''',
    "async renderer payload",
)

runtime = replace_once(
    runtime,
    '''  const payload: ResuxPayload = {
    route,
    scopes: {},
    modules,
    config: publicRuntimeConfig(runtimeConfig)
  };''',
    '''  const payload: ResuxPayload = {
    route,
    scopes: {},
    globalState: {},
    modules,
    config: publicRuntimeConfig(runtimeConfig)
  };''',
    "server app initial payload",
)

runtime = replace_once(
    runtime,
    '''const clientProvides = globalThis.__RESUX_PROVIDES__ ||= {};
const RESUX_LAZY_PLACEHOLDER_SRC''',
    '''const clientProvides = globalThis.__RESUX_PROVIDES__ ||= {};
const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();
let globalStateRefreshQueued = false;
const RESUX_LAZY_PLACEHOLDER_SRC''',
    "client global refs registry",
)

runtime = replace_once(
    runtime,
    '''    route: routeOverride ?? { path: "/", params: {}, query: {} },
    scopes: {},
    modules: {},''',
    '''    route: routeOverride ?? { path: "/", params: {}, query: {} },
    scopes: {},
    globalState: {},
    modules: {},''',
    "client fallback payload",
)

client_helpers = r'''
function useClientGlobalState(key, factory) {
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
      assertJsonSerializable(stateRef.value, 'useGlobalState("' + normalizedKey + '")');
      const currentPayload = globalThis.__RESUX__;
      if (currentPayload) {
        currentPayload.globalState ||= {};
        currentPayload.globalState[normalizedKey] = stateRef.value;
      }
      queueGlobalStateRefresh();
    }, { flush: "post" });

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
}

function queueGlobalStateRefresh() {
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
}

'''
runtime = replace_once(
    runtime,
    'export function createClientComponent(definition) {',
    client_helpers + 'export function createClientComponent(definition) {',
    "client global state helpers",
)

runtime = replace_once(
    runtime,
    '''        useState(key, factory) {
          if (!stateRefs[key]) {
            const hasValue = serializedScope.state && Object.prototype.hasOwnProperty.call(serializedScope.state, key);
            stateRefs[key] = ref(hasValue ? serializedScope.state[key] : factory?.());
          }
          return stateRefs[key];
        },
        useAsyncData(key, handler) {''',
    '''        useState(key, factory) {
          if (!stateRefs[key]) {
            const hasValue = serializedScope.state && Object.prototype.hasOwnProperty.call(serializedScope.state, key);
            stateRefs[key] = ref(hasValue ? serializedScope.state[key] : factory?.());
          }
          return stateRefs[key];
        },
        useGlobalState(key, factory) {
          return useClientGlobalState(key, factory);
        },
        useAsyncData(key, handler) {''',
    "client setup useGlobalState",
)

runtime = replace_once(
    runtime,
    '''    globalThis.__RESUX__ = mergePersistentLayoutPayload(previousPayload, nextPayload, preserved.scopeIds);''',
    '''    globalThis.__RESUX__ = mergeClientGlobalState(
      mergePersistentLayoutPayload(previousPayload, nextPayload, preserved.scopeIds)
    );''',
    "navigation global state persistence",
)

runtime = replace_once(
    runtime,
    '''function mergePersistentLayoutPayload(previousPayload, nextPayload, preservedScopeIds) {
  if (!previousPayload || !previousPayload.scopes || !nextPayload || !nextPayload.scopes) {
    return nextPayload;
  }

  for (const scopeId of preservedScopeIds) {
    if (previousPayload.scopes[scopeId]) {
      nextPayload.scopes[scopeId] = previousPayload.scopes[scopeId];
    }
  }

  return nextPayload;
}''',
    '''function mergePersistentLayoutPayload(previousPayload, nextPayload, preservedScopeIds) {
  if (!nextPayload) {
    return nextPayload;
  }

  if (previousPayload && previousPayload.scopes && nextPayload.scopes) {
    for (const scopeId of preservedScopeIds) {
      if (previousPayload.scopes[scopeId]) {
        nextPayload.scopes[scopeId] = previousPayload.scopes[scopeId];
      }
    }
  }

  return nextPayload;
}''',
    "persistent layout payload merge",
)

runtime_path.write_text(runtime)


globals_path = Path("src/globals.ts")
globals_text = globals_path.read_text()
globals_text = replace_once(
    globals_text,
    '  const useState: <T = unknown>(key: string, factory?: () => T) => Ref<T>;\n  const useAsyncData:',
    '  const useState: <T = unknown>(key: string, factory?: () => T) => Ref<T>;\n  const useGlobalState: <T = unknown>(key: string, factory?: () => T) => Ref<T>;\n  const useAsyncData:',
    "global type declaration",
)
globals_path.write_text(globals_text)


compiler_path = Path("src/compiler/index.ts")
compiler = compiler_path.read_text()
compiler = replace_once(
    compiler,
    '  "useState",\n  "useAsyncData",',
    '  "useState",\n  "useGlobalState",\n  "useAsyncData",',
    "handler allowed globals",
)
compiler = replace_once(
    compiler,
    '  { from: "resuxjs", name: "useState" },\n  { from: "resuxjs", name: "useFetch" },',
    '  { from: "resuxjs", name: "useState" },\n  { from: "resuxjs", name: "useGlobalState" },\n  { from: "resuxjs", name: "useFetch" },',
    "builtin auto import",
)
compiler_path.write_text(compiler)


test_path = Path("tests/global-state.test.ts")
test_path.write_text(r'''import { describe, expect, it } from "vitest";
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
''')

# Remove the temporary automation from the resulting feature commit.
Path(".github/workflows/apply-global-state.yml").unlink(missing_ok=True)
Path(".github/scripts/apply-global-state.py").unlink(missing_ok=True)
