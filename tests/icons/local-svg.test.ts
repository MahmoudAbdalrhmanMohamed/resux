import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  loadLocalSvgIconSync,
  loadLocalSvgIcon,
  clearLocalSvgCache,
} from "../../src/icons/local-svg.js";

const testDir = path.resolve(process.cwd(), "tests/fixtures/test-icons");

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
  await writeFile(
    path.join(testDir, "test-star.svg"),
    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  );
});

afterAll(async () => {
  clearLocalSvgCache();
  await rm(testDir, { recursive: true, force: true }).catch(() => undefined);
});

describe("local svg loader", () => {
  it("loads a local SVG file synchronously", () => {
    const icon = loadLocalSvgIconSync("test-star", "tests/fixtures/test-icons");
    expect(icon).not.toBeNull();
    expect(icon?.viewBox).toBe("0 0 24 24");
    expect(icon?.path).toContain("M12 2l3.09");
  });

  it("loads a local SVG file asynchronously and caches it", async () => {
    const icon = await loadLocalSvgIcon("test-star", "tests/fixtures/test-icons");
    expect(icon).not.toBeNull();
    expect(icon?.viewBox).toBe("0 0 24 24");

    // Second call reads from cache
    const cached = await loadLocalSvgIcon("test-star", "tests/fixtures/test-icons");
    expect(cached).toBe(icon);
  });

  it("returns null for non-existent icons", async () => {
    const icon = await loadLocalSvgIcon("does-not-exist", "tests/fixtures/test-icons");
    expect(icon).toBeNull();
  });

  it("prevents directory traversal attempts", () => {
    const icon = loadLocalSvgIconSync("../../../etc/passwd", "tests/fixtures/test-icons");
    expect(icon).toBeNull();
  });
});
