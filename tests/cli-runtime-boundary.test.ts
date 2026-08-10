import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("CLI runtime boundary", () => {
  it("keeps CLI execution in bin.ts instead of cli.ts", async () => {
    const [binSource, cliSource, nodeSource] = await Promise.all([
      readFile(path.join(root, "src", "bin.ts"), "utf8"),
      readFile(path.join(root, "src", "cli.ts"), "utf8"),
      readFile(path.join(root, "src", "node.ts"), "utf8"),
    ]);

    expect(binSource).toContain("runResuxCli(process.argv.slice(2))");
    expect(cliSource).not.toContain("if (isMainModule())");
    expect(nodeSource).toContain('from "./cli.js"');
  });

  it("executes internal CLI checks through dist/bin.js", async () => {
    const [deploySource, packageSource] = await Promise.all([
      readFile(path.join(root, "scripts", "verify-deploy-targets.mjs"), "utf8"),
      readFile(path.join(root, "package.json"), "utf8"),
    ]);
    expect(deploySource).toContain('path.join(rootDir, "dist", "bin.js")');
    expect(packageSource).toContain("node dist/bin.js init");
  });

  it("keeps build-only and native modules runtime-lazy for edge bundlers", async () => {
    const cliSource = await readFile(path.join(root, "src", "cli.ts"), "utf8");

    expect(cliSource).toContain("async function importRuntimeModule<T>(specifier: string)");
    expect(cliSource).toContain('importRuntimeModule<typeof import("./compiler/index.js")>("./compiler/index.js")');
    expect(cliSource).toContain('importRuntimeModule<typeof import("vite")>("vite")');
    expect(cliSource).toContain('importRuntimeModule<typeof import("@vitejs/plugin-vue")>("@vitejs/plugin-vue")');
    expect(cliSource).toContain('importRuntimeModule<typeof import("sharp")>("sharp")');

    expect(cliSource).not.toContain('await import("./compiler/index.js")');
    expect(cliSource).not.toContain('await import("vite")');
    expect(cliSource).not.toContain('await import("@vitejs/plugin-vue")');
    expect(cliSource).not.toContain('await import("sharp")');
  });
});
