import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Regression: server handlers, server middleware and server plugins are written to .resux/server/<kind>/, so a
// relative import to another project file used to fail the build with "Module not found".

async function write(root: string, file: string, source: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), source, "utf8");
}

describe("relative imports from server handlers, middleware and plugins", () => {
  it("builds and compiles the imported project files into the build output", async () => {
    const root = path.join(os.tmpdir(), `resux-server-relative-imports-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    await write(root, "package.json", JSON.stringify({ name: "server-relative-imports", private: true, type: "module" }));
    await write(root, "pages/index.vue", `<template><main>ok</main></template>`);
    await write(root, "lib/hello.ts", `export const hello = (name: string): string => "hi " + name;\n`);
    await write(root, "lib/nested/deep.ts", `import { hello } from "../hello";\nexport const deep = (): string => hello("deep");\n`);
    await write(root, "lib/index.ts", `export * from "./nested/deep";\nexport { hello } from "./hello";\n`);
    await write(
      root,
      "server/api/hi.get.ts",
      `import { hello } from "../../lib/hello";\nimport { deep } from "~/lib";\nexport default defineEventHandler(() => ({ msg: hello("handler"), deep: deep() }));\n`,
    );
    await write(
      root,
      "server/middleware/trace.ts",
      `import { hello } from "../../lib/hello";\nexport default defineEventHandler(() => { hello("middleware"); });\n`,
    );
    await write(
      root,
      "plugins/probe.server.ts",
      `import { hello } from "../lib/hello";\nexport default defineResuxPlugin(() => { hello("plugin"); });\n`,
    );

    await buildProject(root, outDir);

    const serverDir = path.join(outDir, "server");
    const handler = await readFile(path.join(serverDir, "handlers", "h0.mjs"), "utf8");
    expect(handler).toContain('from "../imported/lib/hello.mjs"');
    expect(handler).toContain('from "../imported/lib/index.mjs"');
    expect(handler).not.toContain("../../lib/hello");

    const middleware = await readFile(path.join(serverDir, "request-middleware", "s0.mjs"), "utf8");
    expect(middleware).toContain('from "../imported/lib/hello.mjs"');

    const pluginFiles = await readdir(path.join(serverDir, "resux-plugins"));
    const plugin = await readFile(path.join(serverDir, "resux-plugins", pluginFiles[0]), "utf8");
    expect(plugin).toContain('from "../imported/lib/hello.mjs"');

    expect(await readFile(path.join(serverDir, "imported", "lib", "hello.mjs"), "utf8")).toContain("hello");
    // Re-exports in a barrel file are followed too.
    expect(await readFile(path.join(serverDir, "imported", "lib", "index.mjs"), "utf8")).toContain('./nested/deep.mjs');
  }, 60000);
  it("keeps an unresolved re-export a build error instead of emitting an empty module", async () => {
    const root = path.join(os.tmpdir(), `resux-server-relative-imports-missing-${Date.now()}`);
    await write(root, "package.json", JSON.stringify({ name: "server-relative-imports-missing", private: true, type: "module" }));
    await write(root, "pages/index.vue", `<template><main>ok</main></template>`);
    await write(root, "lib/index.ts", `export * from "./missing.ts";\nexport const a = 1;\n`);
    await write(root, "server/api/hi.ts", `import { a } from "../../lib";\nexport default defineEventHandler(() => ({ a }));\n`);

    await expect(buildProject(root, path.join(root, ".resux"))).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "server", "imported", "lib", "missing.mjs"), "utf8")).rejects.toThrow();
  }, 60000);

  it("re-evaluates compiled helper imports per build in dev only", async () => {
    const root = path.join(os.tmpdir(), `resux-server-relative-imports-dev-${Date.now()}`);
    await write(root, "package.json", JSON.stringify({ name: "server-relative-imports-dev", private: true, type: "module" }));
    await write(root, "pages/index.vue", `<template><main>ok</main></template>`);
    await write(root, "lib/hello.ts", `export const hello = (): string => "hi";\n`);
    await write(root, "lib/wrap.ts", `import { hello } from "./hello";\nexport const wrap = (): string => hello();\n`);
    await write(root, "server/api/hi.ts", `import { wrap } from "../../lib/wrap";\nexport default defineEventHandler(() => ({ msg: wrap() }));\n`);

    const devOut = path.join(root, ".resux-dev");
    await buildProject(root, devOut, { vite: "dev" });
    const devHandler = await readFile(path.join(devOut, "server", "handlers", "h0.mjs"), "utf8");
    expect(devHandler).toMatch(/from "\.\.\/imported\/lib\/wrap\.mjs\?t=\d+"/);
    expect(await readFile(path.join(devOut, "server", "imported", "lib", "wrap.mjs"), "utf8")).toMatch(/from "\.\/hello\.mjs\?t=\d+"/);

    const prodOut = path.join(root, ".resux-prod");
    await buildProject(root, prodOut);
    const prodHandler = await readFile(path.join(prodOut, "server", "handlers", "h0.mjs"), "utf8");
    expect(prodHandler).toContain('from "../imported/lib/wrap.mjs"');
    expect(await readFile(path.join(prodOut, "server", "imported", "lib", "wrap.mjs"), "utf8")).toContain('from "./hello.mjs"');
  }, 60000);
});
