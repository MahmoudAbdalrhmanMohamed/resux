from pathlib import Path

runtime = Path('src/runtime/index.ts').read_text()
test = Path('tests/global-state.test.ts').read_text()
patterns = {
    'serialized scope': '  state: Record<string, JsonValue>;\n  asyncData: Record<string, SerializedAsyncData>;',
    'scope record': '  props: Record<string, unknown>;\n  stateRefs: Record<string, Ref<unknown>>;\n  asyncDataRefs: Record<string, AsyncDataResource<unknown>>;',
    'renderer declarations': '    const stateRefs: Record<string, Ref<unknown>> = {};\n    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};',
    'renderer pass': '      this.runtimeConfig,\n      this.globalStateRefs\n    );',
    'renderer store': '      props,\n      stateRefs,\n      asyncDataRefs',
    'payload scope': '        props: serializeProps(scope.props),\n        state: serializeRefs(scope.stateRefs),\n        asyncData: serializeAsyncData(scope.asyncDataRefs)',
    'setup signature': '  runtimeConfig: RuntimeConfig,\n  globalStateRefs: Record<string, Ref<unknown>> = {}\n): SetupContext {',
    'server key': '      if (!normalizedKey) {\n        throw new Error("useGlobalState(key) requires a non-empty key.");\n      }\n      if (globalStateRefs[normalizedKey]) {',
    'client constants': 'const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();\nlet globalStateRefreshQueued = false;',
    'watch queue': '      queueGlobalStateRefresh();\n    }, { flush: "post" });',
    'queue function': 'function queueGlobalStateRefresh() {',
    'refresh function': 'async function refreshAllScopesForGlobalState() {',
    'client scope': '    async createScope(serializedScope, route) {\n      const stateRefs = {};\n      const asyncDataRefs = {};',
    'client useGlobal': '        useGlobalState(key, factory) {\n          return useClientGlobalState(key, factory);\n        },',
    'client return': '      const scope = await definition.script(setupContext);\n      await Promise.allSettled(mountedCallbacks.map((callback) => callback()));\n      return { scope, props, stateRefs, asyncDataRefs, pendingCompletions };',
}
lines = [f'{name}: {runtime.count(pattern)}' for name, pattern in patterns.items()]
needle = patterns['renderer store']
start = 0
index = 0
while True:
    position = runtime.find(needle, start)
    if position < 0:
        break
    index += 1
    line = runtime.count('\n', 0, position) + 1
    context_start = max(0, position - 120)
    context_end = min(len(runtime), position + len(needle) + 120)
    context = runtime[context_start:context_end].replace('\n', '\\n')
    lines.append(f'renderer store match {index} line {line}: {context}')
    start = position + 1
lines.extend([
    f'test server block: {test.count("    expect(result.payload.globalState).toEqual({ session: { visits: 1 } });")}',
    f'test source function: {test.count("    expect(source).toContain(\"async function refreshAllScopesForGlobalState\");")}',
])
Path('.github/global-state-pattern-counts.txt').write_text('\n'.join(lines) + '\n')
