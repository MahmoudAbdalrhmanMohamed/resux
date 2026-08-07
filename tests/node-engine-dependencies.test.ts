import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface PackageLockEntry {
  version?: string;
  engines?: { node?: string };
}

interface PackageLock {
  packages?: Record<string, PackageLockEntry>;
}

describe("Node engine dependency compatibility", () => {
  it("keeps the Nitro toolchain compatible with the advertised Node 20 minimum", async () => {
    const root = process.cwd();
    const packageJson = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    ) as {
      engines?: { node?: string };
      dependencies?: Record<string, string>;
    };
    const lock = JSON.parse(
      await readFile(path.join(root, "package-lock.json"), "utf8"),
    ) as PackageLock;

    expect(packageJson.engines?.node).toBe(">=20.19.0");
    expect(packageJson.dependencies?.nitropack).toBe("~2.12.6");

    const nitro = lock.packages?.["node_modules/nitropack"];
    expect(nitro?.version).toMatch(/^2\.12\./);
    expect(nitro?.engines?.node).toContain("20.19.0");

    const visualizer = lock.packages?.["node_modules/rollup-plugin-visualizer"];
    expect(visualizer?.version).toMatch(/^6\./);
    expect(visualizer?.engines?.node).not.toBe(">=22");
  });
});
