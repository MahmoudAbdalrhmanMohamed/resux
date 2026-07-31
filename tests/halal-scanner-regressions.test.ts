import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanContentFiles } from "../src/halal-core/scanner/scanContent.js";

const tempRoots: string[] = [];

afterEach(async () => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("halal scanner regressions", () => {
  it("does not follow directory symlinks outside the project", async () => {
    const projectRoot = await createTempRoot("resux-scan-project-");
    const externalRoot = await createTempRoot("resux-scan-external-");
    await writeFile(path.join(projectRoot, "safe.ts"), "export const safe = true;\n", "utf8");
    await writeFile(path.join(externalRoot, "outside.ts"), "export const outside = true;\n", "utf8");
    await symlink(externalRoot, path.join(projectRoot, "linked-external"), "dir");

    const results = scanContentFiles(projectRoot, projectRoot);

    expect(results.map((entry) => entry.file)).toContain("safe.ts");
    expect(results.map((entry) => entry.file)).not.toContain("linked-external/outside.ts");
  });

  it("does not loop through a symlink back to the project", async () => {
    const projectRoot = await createTempRoot("resux-scan-cycle-");
    await mkdir(path.join(projectRoot, "nested"), { recursive: true });
    await writeFile(path.join(projectRoot, "nested", "entry.ts"), "export {};\n", "utf8");
    await symlink(projectRoot, path.join(projectRoot, "nested", "cycle"), "dir");

    const results = scanContentFiles(projectRoot, projectRoot);

    expect(results.map((entry) => entry.file)).toEqual(["nested/entry.ts"]);
  });

  it("applies literal ignored directories to every descendant", async () => {
    const projectRoot = await createTempRoot("resux-scan-ignore-");
    await mkdir(path.join(projectRoot, "coverage", "nested"), { recursive: true });
    await writeFile(path.join(projectRoot, "coverage", "nested", "ignored.ts"), "ignored\n", "utf8");
    await writeFile(path.join(projectRoot, "included.ts"), "included\n", "utf8");

    const results = scanContentFiles(
      projectRoot,
      projectRoot,
      new Set(["coverage"]),
    );

    expect(results.map((entry) => entry.file)).toEqual(["included.ts"]);
  });

  it("reads only the bounded prefix of large source files", async () => {
    const projectRoot = await createTempRoot("resux-scan-large-");
    await writeFile(path.join(projectRoot, "large.ts"), "a".repeat(150_000), "utf8");

    const results = scanContentFiles(projectRoot, projectRoot);

    expect(results).toHaveLength(1);
    expect(Buffer.byteLength(results[0].text, "utf8")).toBe(100_000);
  });
});

async function createTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}
