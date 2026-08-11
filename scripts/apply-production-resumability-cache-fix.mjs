import { readFile, writeFile } from "node:fs/promises";

const compilerPath = new URL("../src/compiler/index.ts", import.meta.url);
const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
const testPath = new URL("../tests/client-asset-cache-regressions.test.ts", import.meta.url);

function replaceExact(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing replacement target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Replacement target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let compiler = await readFile(compilerPath, "utf8");
compiler = replaceExact(
  compiler,
  'const require = createRequire(import.meta.url);\n',
  'const require = createRequire(import.meta.url);\n\nconst CLIENT_ASSET_CACHE_REVISION = "20260811-1";\nconst CLIENT_RUNTIME_IMPORT = `/__resux/runtime-client.mjs?v=${CLIENT_ASSET_CACHE_REVISION}`;\nfunction revisionClientAsset(url: string): string {\n  return `${url}?v=${CLIENT_ASSET_CACHE_REVISION}`;\n}\n',
  "client asset cache revision constants"
);
compiler = replaceExact(
  compiler,
  '          external: (id: string) => id === "/__resux/runtime-client.mjs",\n          output: {\n            format: "es",\n',
  '          external: (id: string) => id === "/__resux/runtime-client.mjs",\n          output: {\n            format: "es",\n            paths: (id: string) => id === "/__resux/runtime-client.mjs" ? CLIENT_RUNTIME_IMPORT : id,\n',
  "vite runtime external output path"
);
compiler = replaceExact(
  compiler,
  'JSON.stringify(`/__resux/handlers/${component.id}.mjs`)',
  'JSON.stringify(revisionClientAsset(`/__resux/handlers/${component.id}.mjs`))',
  "handler manifest cache revision"
);
compiler = replaceExact(
  compiler,
  'JSON.stringify(`/__resux/vue-islands/${island.name}.mjs`)',
  'JSON.stringify(revisionClientAsset(`/__resux/vue-islands/${island.name}.mjs`))',
  "vue island manifest cache revision"
);
compiler = replaceExact(
  compiler,
  '      resux.addRouteRule("/__resux/runtime-client.mjs", { cache: assetCache });\n      resux.addRouteRule("/__resux/handlers/**", { cache: assetCache });\n      resux.addRouteRule("/__resux/vue-islands/**", { cache: assetCache });\n',
  '      // These JavaScript endpoints use stable filenames. Never mark them immutable: a stale\n      // runtime paired with newly generated handlers breaks the resumability contract.\n      resux.addRouteRule("/__resux/runtime-client.mjs", { cache: false });\n      resux.addRouteRule("/__resux/handlers/**", { cache: false });\n      resux.addRouteRule("/__resux/vue-islands/**", { cache: false });\n',
  "stable resumability asset cache policy"
);
await writeFile(compilerPath, compiler, "utf8");

let runtime = await readFile(runtimePath, "utf8");
runtime = replaceExact(
  runtime,
  'import type { ComputedRef, Ref, WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from "../reactivity/index.js";\n\n',
  'import type { ComputedRef, Ref, WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from "../reactivity/index.js";\n\nconst RESUX_CLIENT_ASSET_REVISION = "20260811-1";\nconst RESUX_CLIENT_RUNTIME_URL = `/__resux/runtime-client.mjs?v=${RESUX_CLIENT_ASSET_REVISION}`;\n\n',
  "runtime cache revision constants"
);
runtime = replaceExact(
  runtime,
  '    \'<script type="module" src="/__resux/runtime-client.mjs"></script>\',\n',
  '    `<script type="module" src="${RESUX_CLIENT_RUNTIME_URL}"></script>`,\n',
  "renderDocument runtime URL"
);
await writeFile(runtimePath, runtime, "utf8");

const testSource = `import { readFile } from "node:fs/promises";\nimport { describe, expect, it } from "vitest";\nimport { renderDocument, type RenderResult } from "resuxjs/runtime";\n\ndescribe("client asset cache regressions", () => {\n  it("bootstraps the runtime with the resumability cache revision", () => {\n    const result: RenderResult = {\n      html: "<main>ok</main>",\n      payload: {\n        route: { path: "/", params: {}, query: {} },\n        scopes: {},\n        modules: {}\n      },\n      head: {}\n    };\n\n    const html = renderDocument(result);\n    expect(html).toContain('/__resux/runtime-client.mjs?v=20260811-1');\n  });\n\n  it("rewrites generated client imports and handler URLs to the same revision", async () => {\n    const compilerSource = await readFile(new URL("../src/compiler/index.ts", import.meta.url), "utf8");\n    expect(compilerSource).toContain('CLIENT_RUNTIME_IMPORT = \\`/__resux/runtime-client.mjs?v=\\${CLIENT_ASSET_CACHE_REVISION}\\`');\n    expect(compilerSource).toContain('paths: (id: string) => id === "/__resux/runtime-client.mjs" ? CLIENT_RUNTIME_IMPORT : id');\n    expect(compilerSource).toContain('revisionClientAsset(\\`/__resux/handlers/\\${component.id}.mjs\\`)');\n  });\n\n  it("does not immutable-cache stable resumability JavaScript endpoints", async () => {\n    const compilerSource = await readFile(new URL("../src/compiler/index.ts", import.meta.url), "utf8");\n    expect(compilerSource).toContain('resux.addRouteRule("/__resux/runtime-client.mjs", { cache: false })');\n    expect(compilerSource).toContain('resux.addRouteRule("/__resux/handlers/**", { cache: false })');\n    expect(compilerSource).toContain('resux.addRouteRule("/__resux/vue-islands/**", { cache: false })');\n  });\n});\n`;
await writeFile(testPath, testSource, "utf8");

console.log("Applied production resumability cache fix.");
