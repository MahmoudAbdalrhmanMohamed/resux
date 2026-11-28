import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Regression: Nitro prefers a static route over a `[param]` route, and a `[param]` route over a `[...catch]` route.
// Resux ordered server handlers by path text, so `/api/u/[id]` shadowed `/api/u/me` in `resux dev` and `resux start`.

async function write(root: string, file: string, source: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), source, "utf8");
}

type Match = { route: { path: string; method: string | null }; params: Record<string, string> } | null;

describe("server route priority", () => {
  it("ranks static before param before catch-all", async () => {
    const root = path.join(os.tmpdir(), `resux-route-priority-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    await write(root, "package.json", JSON.stringify({ name: "route-priority", private: true, type: "module" }));
    await write(root, "pages/index.vue", `<template><main>ok</main></template>`);
    const handler = `export default defineEventHandler(() => ({ ok: true }));\n`;
    for (const file of [
      "u/me.ts",
      "u/[id].ts",
      "u/[...slug].ts",
      "a/b/c.ts",
      "a/[x]/c.ts",
      "a/[x]/[y].ts",
      "a/[...all].ts",
      "v/me.ts",
      "v/[id].get.ts",
      "m/me.get.ts",
      "m/[id].post.ts",
      "q/me.get.ts",
      "q/[id].ts",
    ]) await write(root, `server/api/${file}`, handler);

    await buildProject(root, outDir);

    const source = await readFile(path.join(outDir, "server", "manifest.mjs"), "utf8");
    const stubs = [...source.matchAll(/^import (\w+) from/gm)].map((match) => match[1]).map((name) => `const ${name} = null;`).join("\n");
    const body = source.split("\n").filter((line) => !line.startsWith("import ")).join("\n").replace(/^export /gm, "");
    const matchServerHandler = new Function(`${stubs}\n${body}\nreturn matchServerHandler;`)() as (pathname: string, method?: string) => Match;
    const route = (pathname: string, method = "GET") => matchServerHandler(pathname, method)?.route.path;

    // Same expectations as the Nitro output.
    expect(route("/api/u/me")).toBe("/api/u/me");
    expect(route("/api/u/5")).toBe("/api/u/:id");
    expect(route("/api/u/5/6")).toBe("/api/u/:slug*");
    expect(route("/api/u")).toBe("/api/u/:slug*");
    expect(route("/api/a/b/c")).toBe("/api/a/b/c");
    expect(route("/api/a/z/c")).toBe("/api/a/:x/c");
    expect(route("/api/a/z/y")).toBe("/api/a/:x/:y");
    expect(route("/api/a/z/y/w")).toBe("/api/a/:all*");
    // A static any-method route beats a param route that is restricted to GET.
    expect(route("/api/v/me")).toBe("/api/v/me");
    expect(route("/api/v/5")).toBe("/api/v/:id");
    expect(route("/api/v/5", "POST")).toBeUndefined();
    // A method-restricted static route does not shadow a param route for another method.
    expect(route("/api/m/me", "GET")).toBe("/api/m/me");
    expect(route("/api/m/me", "POST")).toBe("/api/m/:id");
    expect(route("/api/m/5", "GET")).toBeUndefined();
    expect(route("/api/q/me", "GET")).toBe("/api/q/me");
    expect(route("/api/q/me", "POST")).toBe("/api/q/:id");
  }, 60000);
});
