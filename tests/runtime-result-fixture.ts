import type { RenderResult } from "../src/runtime/index.js";

export function createRuntimeResult(
  html: string,
  overrides: Partial<RenderResult["payload"]> = {},
): RenderResult {
  const payload = Object.assign(
    {
      route: { path: "/", params: {}, query: {} },
      scopes: {},
      modules: {},
    },
    overrides,
  );
  return { html, head: {}, payload } as RenderResult;
}
