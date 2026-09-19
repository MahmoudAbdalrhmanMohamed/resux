import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getResumeBootstrapSource } from "../src/runtime/resume.js";

describe("resume bootstrap performance budget", () => {
  it("keeps the initial interaction bootstrap within its explicit byte budgets", async () => {
    const budgets = JSON.parse(
      await readFile(path.join(process.cwd(), "runtime-size-budget.json"), "utf8"),
    ) as {
      resumeBootstrapBytes: number;
      resumeBootstrapGzipBytes: number;
    };
    const source = getResumeBootstrapSource({ eventNames: ["click", "submit"] });

    expect(Buffer.byteLength(source)).toBeLessThanOrEqual(budgets.resumeBootstrapBytes);
    expect(gzipSync(source).byteLength).toBeLessThanOrEqual(budgets.resumeBootstrapGzipBytes);
  });
});
