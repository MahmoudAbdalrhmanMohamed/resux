import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPathWithinBoundary,
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

  it("fails closed on malformed URL encoding", () => {
    expect(resolveRequestPathWithinBoundary(
      publicRoot,
      publicRoot,
      "/bad-%E0%A4%A",
    )).toBeNull();
  });
});
