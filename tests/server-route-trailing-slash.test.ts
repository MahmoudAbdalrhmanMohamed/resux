import { describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Regression: Nitro serves a server route with a trailing slash (/api/any/) and with percent-encoded characters in a
// static segment (/api/an%79). `resux dev` and `resux start` answered 404 for both, and a malformed escape such as
// %E0%A4%A in a param crashed the matcher with a URIError.

async function write(root: string, file: string, source: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), source, "utf8");
}

type Match = { route: { path: string }; params: Record<string, string> } | null;

describe("server route matching of trailing slashes and percent-encoding", () => {
  it("matches like Nitro", async () => {
    const root = path.join(os.tmpdir(), `resux-route-trailing-slash-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    await write(root, "package.json", JSON.stringify({ name: "route-trailing-slash", private: true, type: "module" }));
    await write(root, "pages/index.vue", `<template><main>ok</main></template>`);
    const handler = `export default defineEventHandler(() => ({ ok: true }));\n`;
    await write(root, "server/api/any.ts", handler);
    await write(root, "server/api/index.ts", handler);
    await write(root, "server/api/users/[id].ts", handler);
    await write(root, "server/api/files/[...path].ts", handler);
    await write(root, "server/api/sp ace.ts", handler);

    await buildProject(root, outDir);

    // Run the generated manifest's matcher with the real handler table (handler modules stubbed out).
    const source = await readFile(path.join(outDir, "server", "manifest.mjs"), "utf8");
    const stubs = [...source.matchAll(/^import (\w+) from/gm)].map((match) => match[1]).map((name) => `const ${name} = null;`).join("\n");
    const body = source.split("\n").filter((line) => !line.startsWith("import ")).join("\n").replace(/^export /gm, "");
    const matchServerHandler = new Function(`${stubs}\n${body}\nreturn matchServerHandler;`)() as (pathname: string, method?: string) => Match;

    expect(matchServerHandler("/api/any", "GET")?.route.path).toBe("/api/any");
    // Trailing slash.
    expect(matchServerHandler("/api/any/", "GET")?.route.path).toBe("/api/any");
    expect(matchServerHandler("/api/", "GET")?.route.path).toBe("/api");
    expect(matchServerHandler("/api/users/7/", "GET")?.params).toEqual({ id: "7" });
    expect(matchServerHandler("/api/files/a/b/", "GET")?.params).toEqual({ path: "a/b" });
    // Only one trailing slash is dropped, empty segments stay a miss.
    expect(matchServerHandler("/api/any//", "GET")).toBeNull();
    expect(matchServerHandler("/api//any", "GET")).toBeNull();
    // Percent-encoded static segments.
    expect(matchServerHandler("/api/an%79", "GET")?.route.path).toBe("/api/any");
    expect(matchServerHandler("/api/sp%20ace", "GET")?.route.path).toBe("/api/sp ace");
    // Params are decoded once, and a malformed escape stays as typed instead of throwing.
    expect(matchServerHandler("/api/users/a%20b", "GET")?.params).toEqual({ id: "a b" });
    expect(matchServerHandler("/api/users/a%2Fb", "GET")?.params).toEqual({ id: "a/b" });
    expect(matchServerHandler("/api/users/%2541", "GET")?.params).toEqual({ id: "%41" });
    expect(matchServerHandler("/api/users/%E0%A4%A", "GET")?.params).toEqual({ id: "%E0%A4%A" });
    // Misses stay misses.
    expect(matchServerHandler("/api/users", "GET")).toBeNull();
    expect(matchServerHandler("/api/users/1/2", "GET")).toBeNull();
    expect(matchServerHandler("/nope/", "GET")).toBeNull();
  }, 60000);
});
