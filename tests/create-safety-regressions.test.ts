import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCreateResux } from "../src/create.js";

const tempRoots: string[] = [];

afterEach(async () => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("create command safety regressions", () => {
  it("refuses --force through a symbolic-link target without deleting its contents", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resux-create-symlink-"));
    tempRoots.push(root);
    const victim = path.join(root, "victim");
    const linkedTarget = path.join(root, "linked-project");
    const sentinel = path.join(victim, "keep.txt");
    await mkdir(victim, { recursive: true });
    await writeFile(sentinel, "keep-me\n", "utf8");
    await symlink(victim, linkedTarget, "dir");

    await expect(runCreateResux([
      linkedTarget,
      "--yes",
      "--no-install",
      "--force",
    ])).rejects.toThrow("symbolic link");

    await expect(readFile(sentinel, "utf8")).resolves.toBe("keep-me\n");
  });
});
