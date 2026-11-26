import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { getClientRuntimeSource } from "resuxjs/runtime";

// Render context shared by the SSR tests.
export function ssrRenderContext(scopeId: string, scope: Record<string, unknown>) {
  return {
    scope,
    scopeId,
    moduleId: "m0",
    route: { path: "/", params: {}, query: {} },
    runtimeConfig: { public: {} },
    components: {},
    layouts: {},
    pageMeta: {}
  };
}

// Writes the client runtime + a component module to a temp dir, boots them in
// a happy-dom window with the given HTML, and returns the scope records. The
// component source must use __RUNTIME__ as the runtime import specifier.
export async function bootClientComponent(componentSource: string, html: string, scopeIds: string[] = ["s0"]) {
  const tempDir = path.join(os.tmpdir(), `resux-template-ref-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(tempDir, { recursive: true });
  const runtimeFile = path.join(tempDir, "runtime-client.mjs");
  const componentFile = path.join(tempDir, "component.mjs");
  await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
  await writeFile(
    componentFile,
    componentSource.replace("__RUNTIME__", JSON.stringify(pathToFileURL(runtimeFile).href)),
    "utf8"
  );

  const window = new Window({ url: "http://localhost/" });
  window.document.body.innerHTML = html;

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousResux = (globalThis as Record<string, unknown>).__RESUX__;

  const scopeStates = Object.fromEntries(
    scopeIds.map((id) => [id, { id, moduleId: "m0", state: {}, asyncData: {} }])
  );
  const route = { path: "/", params: {}, query: {} };
  Object.assign(globalThis, {
    document: window.document,
    window,
    __RESUX__: { route, scopes: scopeStates, modules: { m0: pathToFileURL(componentFile).href } }
  });

  const { default: comp } = await import(`${pathToFileURL(componentFile).href}?t=${Date.now()}`);
  const scopeRecords: Record<string, any> = {};
  for (const id of scopeIds) {
    scopeRecords[id] = await comp.createScope(scopeStates[id], route);
  }

  return {
    window,
    comp,
    scopeRecords,
    restore: () => Object.assign(globalThis, {
      document: previousDocument,
      window: previousWindow,
      __RESUX__: previousResux
    })
  };
}

// Maps compiled expressions to runnable functions over the given scope values.
export function registeredExpressions(component: { expressions?: { id: string; transformed: string }[] }, scopeValues: Record<string, unknown>) {
  return Object.fromEntries(
    (component.expressions ?? []).map((expr) => [
      expr.id,
      (scope: Record<string, unknown>) => {
        const keys = Object.keys(scopeValues);
        const vals = keys.map((k) => scope[k]);
        return new Function(...keys, `return (${expr.transformed});`)(...vals);
      }
    ])
  );
}
