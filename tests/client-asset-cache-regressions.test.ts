import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderDocument, type RenderResult } from "resuxjs/runtime";

describe("client asset cache regressions", () => {
  it("bootstraps the runtime with the resumability cache revision", () => {
    const result: RenderResult = {
      html: "<main>ok</main>",
      payload: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      head: {}
    };

    const html = renderDocument(result);
    expect(html).toContain("/__resux/runtime-client.mjs?v=20260811-1");
  });

  it("rewrites generated client imports and handler URLs to the same revision", async () => {
    const compilerSource = await readFile(new URL("../src/compiler/index.ts", import.meta.url), "utf8");
    expect(compilerSource).toContain("CLIENT_RUNTIME_IMPORT");
    expect(compilerSource).toContain("paths: (id: string) => id === \"/__resux/runtime-client.mjs\" ? CLIENT_RUNTIME_IMPORT : id");
    expect(compilerSource).toContain("revisionClientAsset(");
    expect(compilerSource).toContain("/__resux/handlers/");
  });

  it("does not immutable-cache stable resumability JavaScript endpoints", async () => {
    const compilerSource = await readFile(new URL("../src/compiler/index.ts", import.meta.url), "utf8");
    expect(compilerSource).toContain("resux.addRouteRule(\"/__resux/runtime-client.mjs\", { cache: false })");
    expect(compilerSource).toContain("resux.addRouteRule(\"/__resux/handlers/**\", { cache: false })");
    expect(compilerSource).toContain("resux.addRouteRule(\"/__resux/vue-islands/**\", { cache: false })");
  });
});
