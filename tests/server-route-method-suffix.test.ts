import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Regression: `server/api/hello.get.ts` must be served at /api/hello for GET only (the Nitro file-name convention the
// scaffold generates), not at the literal path /api/hello.get for every method.

async function write(root: string, file: string, source: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), source, "utf8");
}

type Match = { route: { path: string; method: string | null }; params: Record<string, string> } | null;

describe("method suffix in server route file names", () => {
  it("strips .get/.post from the route path and restricts the route to that method", async () => {
    const root = path.join(os.tmpdir(), `resux-route-method-suffix-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    await write(root, "package.json", JSON.stringify({ name: "route-method-suffix", private: true, type: "module" }));
    await write(root, "pages/index.vue", `<template><main>ok</main></template>`);
    const handler = `export default defineEventHandler(() => ({ ok: true }));\n`;
    await write(root, "server/api/hi.get.ts", handler);
    await write(root, "server/api/hi.post.ts", handler);
    await write(root, "server/api/any.ts", handler);
    await write(root, "server/api/index.get.ts", handler);
    await write(root, "server/routes/health.get.ts", handler);
    await write(root, "server/api/users/[id].delete.ts", handler);
    // A name that only looks like a suffix is part of the path.
    await write(root, "server/api/get.ts", handler);

    await buildProject(root, outDir);

    const manifest = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8")) as {
      serverHandlers: Array<{ path: string; method?: string }>;
    };
    const summary = manifest.serverHandlers.map((entry) => `${entry.method ?? "ANY"} ${entry.path}`).sort();
    expect(summary).toEqual([
      "ANY /api/any",
      "ANY /api/get",
      "DELETE /api/users/:id",
      "GET /api",
      "GET /api/hi",
      "GET /health",
      "POST /api/hi",
    ]);

    // The generated route map lists each path once even when GET and POST share it.
    const routeMap = await readFile(path.join(outDir, "server-routes.d.ts"), "utf8");
    expect(routeMap.match(/"\/api\/hi": unknown;/g)).toHaveLength(1);

    // Run the generated matcher with the real handler table.
    const source = await readFile(path.join(outDir, "server", "manifest.mjs"), "utf8");
    const tail = source.slice(source.indexOf("export function matchServerHandler")).replace(/^export /gm, "");
    const table = manifest.serverHandlers.map((entry) => `{ path: ${JSON.stringify(entry.path)}, method: ${JSON.stringify(entry.method ?? null)}, match: createMatcher(${JSON.stringify(entry.path)}) }`).join(",\n");
    const matchServerHandler = new Function(`const serverHandlers = [${table}];\n${tail}\nreturn matchServerHandler;`)() as (pathname: string, method?: string) => Match;

    expect(matchServerHandler("/api/hi", "GET")?.route).toMatchObject({ path: "/api/hi", method: "GET" });
    expect(matchServerHandler("/api/hi", "POST")?.route).toMatchObject({ path: "/api/hi", method: "POST" });
    expect(matchServerHandler("/api/hi", "PUT")).toBeNull();
    expect(matchServerHandler("/api/hi.get", "GET")).toBeNull();
    expect(matchServerHandler("/api/any", "PATCH")?.route.path).toBe("/api/any");
    expect(matchServerHandler("/api", "GET")?.route.path).toBe("/api");
    expect(matchServerHandler("/api", "POST")).toBeNull();
    expect(matchServerHandler("/health", "GET")?.route.path).toBe("/health");
    expect(matchServerHandler("/api/users/7", "DELETE")?.params).toEqual({ id: "7" });
    expect(matchServerHandler("/api/users/7", "GET")).toBeNull();
    expect(matchServerHandler("/api/get", "GET")?.route.path).toBe("/api/get");
  }, 60000);
});
