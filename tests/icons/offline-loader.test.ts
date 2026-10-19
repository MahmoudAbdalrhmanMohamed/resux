import { describe, it, expect, vi } from "vitest";
import {
  loadOfflineIcon,
  registerOfflineCollection,
  clearOfflineCollectionCache,
} from "../../src/icons/offline-loader.js";

describe("offline iconify loader", () => {
  it("resolves registered offline collection icons", () => {
    registerOfflineCollection("test-coll", {
      prefix: "test-coll",
      width: 24,
      height: 24,
      icons: {
        rocket: {
          body: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>',
        },
      },
    });

    const icon = loadOfflineIcon("test-coll", "rocket");
    expect(icon).not.toBeNull();
    expect(icon?.viewBox).toBe("0 0 24 24");
    expect(icon?.path).toContain("M4.5 16.5");
  });

  it("resolves aliases within collection", () => {
    registerOfflineCollection("test-coll", {
      prefix: "test-coll",
      width: 32,
      height: 32,
      icons: {
        circle: {
          body: '<circle cx="16" cy="16" r="10"/>',
        },
      },
      aliases: {
        round: { parent: "circle" },
      },
    });

    const icon = loadOfflineIcon("test-coll", "round");
    expect(icon).not.toBeNull();
    expect(icon?.viewBox).toBe("0 0 32 32");
    expect(icon?.body).toContain("<circle");
  });

  it("returns null for unknown collections or missing icons", () => {
    expect(loadOfflineIcon("non-existent", "test")).toBeNull();
    expect(loadOfflineIcon("test-coll", "missing")).toBeNull();
  });
});
