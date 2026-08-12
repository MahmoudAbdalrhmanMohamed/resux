import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectServerRuntimeDependencyNames,
  copyRuntimeDependencyTree,
} from "../src/deploy/runtime-dependencies.js";

async function writePackage(
  appRoot: string,
  name: string,
  manifest: Record<string, unknown> = {},
) {
  const root = path.join(appRoot, "node_modules", ...name.split("/"));
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({
    name,
    version: "1.0.0",
    main: "index.js",
    ...manifest,
  }), "utf8");
  await writeFile(path.join(root, "index.js"), "module.exports = {};\n", "utf8");
}

describe("server runtime dependency closure", () => {
  it("copies installed peer dependencies required by a server package", async () => {
    const root = path.join(os.tmpdir(), `resux-peer-deps-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const runtimeRoot = path.join(root, ".vercel", "output", "functions", "index.func");
    await mkdir(runtimeRoot, { recursive: true });
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture", private: true }), "utf8");

    await writePackage(root, "fixture-server-package", {
      peerDependencies: {
        "fixture-peer": "^1.0.0",
        "fixture-optional-peer": "^1.0.0",
      },
      peerDependenciesMeta: {
        "fixture-optional-peer": { optional: true },
      },
    });
    await writePackage(root, "fixture-peer");

    await copyRuntimeDependencyTree(
      root,
      runtimeRoot,
      "fixture-server-package",
      "test runtime",
    );

    const copiedRoot = path.join(runtimeRoot, "node_modules");
    expect(JSON.parse(await readFile(path.join(copiedRoot, "fixture-server-package", "package.json"), "utf8")).name)
      .toBe("fixture-server-package");
    expect(JSON.parse(await readFile(path.join(copiedRoot, "fixture-peer", "package.json"), "utf8")).name)
      .toBe("fixture-peer");
  });

  it("does not classify Node built-ins as npm server dependencies", async () => {
    const root = path.join(os.tmpdir(), `resux-builtins-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, "server.mjs"), `
import fs from "node:fs";
import path from "path";
import scoped from "@scope/runtime";
import plain from "plain-runtime/subpath";
export { fs, path, scoped, plain };
`, "utf8");

    await expect(collectServerRuntimeDependencyNames(root)).resolves.toEqual([
      "@scope/runtime",
      "plain-runtime",
    ]);
  });
});
