import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPathWithinBoundary,
  prepareSafeFileWriteWithinBoundary,
  resolveRequestPathWithinBoundary,
} from "../src/security/path-boundary.js";

describe("filesystem path boundary security", () => {
  const root = path.resolve(path.join(process.cwd(), "tmp-boundary-fixture"));
  const publicRoot = path.join(root, "public");

  it("distinguishes real descendants from sibling paths with the same prefix", () => {
    expect(isPathWithinBoundary(
      publicRoot,
      path.join(publicRoot, "images", "hero.png"),
    )).toBe(true);

    expect(isPathWithinBoundary(
      publicRoot,
      path.join(root, "publicity", "secret.txt"),
    )).toBe(false);
  });

  it("rejects percent-encoded traversal into a prefix-matching sibling", () => {
    expect(resolveRequestPathWithinBoundary(
      publicRoot,
      publicRoot,
      "/%2e%2e%2fpublicity%2fsecret.txt",
    )).toBeNull();
  });

  it("keeps generated media writes inside the exact generated directory", () => {
    const generatedImages = path.join(publicRoot, "_resux", "generated", "images");

    expect(resolveRequestPathWithinBoundary(
      publicRoot,
      generatedImages,
      "/_resux/generated/images/hero.webp",
    )).toBe(path.join(generatedImages, "hero.webp"));

    expect(resolveRequestPathWithinBoundary(
      publicRoot,
      generatedImages,
      "/_resux/generated/images/%2e%2e%2fimages-private%2fsecret.webp",
    )).toBeNull();
  });

  it("rejects symlinked ancestors before generated-media writes", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "resux-boundary-"));
    try {
      const appRoot = path.join(fixture, "app");
      const outside = path.join(fixture, "outside");
      const resuxRoot = path.join(appRoot, "public", "_resux");
      await mkdir(resuxRoot, { recursive: true });
      await mkdir(outside, { recursive: true });

      const generatedLink = path.join(resuxRoot, "generated");
      await symlink(
        outside,
        generatedLink,
        process.platform === "win32" ? "junction" : "dir",
      );

      await expect(prepareSafeFileWriteWithinBoundary(
        appRoot,
        path.join(generatedLink, "images", "hero.webp"),
      )).rejects.toThrow(/symbolic link/i);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it("creates missing safe parent directories without recursive symlink traversal", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "resux-boundary-"));
    try {
      const appRoot = path.join(fixture, "app");
      await mkdir(appRoot);
      const target = path.join(
        appRoot,
        "public",
        "_resux",
        "generated",
        "images",
        "hero.webp",
      );

      await expect(prepareSafeFileWriteWithinBoundary(appRoot, target)).resolves.toBe(target);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it("fails closed on malformed URL encoding", () => {
    expect(resolveRequestPathWithinBoundary(
      publicRoot,
      publicRoot,
      "/bad-%E0%A4%A",
    )).toBeNull();
  });
});
