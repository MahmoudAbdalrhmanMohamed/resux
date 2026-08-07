import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";

describe("resuxjs/ui browser boundary", () => {
  it("does not emit a runtime dependency on Node-only Resux Kit", () => {
    const source = readFileSync(new URL("../src/ui/index.ts", import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
      },
      fileName: "src/ui/index.ts",
    }).outputText;

    expect(source).toContain('import type { ResuxModuleDefinition } from "../kit/index.js";');
    expect(output).not.toContain('../kit/index.js');
    expect(output).not.toContain('node:async_hooks');
  });
});
