import { describe, it, expect, vi } from "vitest";
import { resolveIconSync, resolveIconAsync } from "../../src/icons/resolver.js";
import { registerStaticIcon } from "../../src/icons/registry.js";
import { registerOfflineCollection } from "../../src/icons/offline-loader.js";

describe("unified icon resolver", () => {
  it("resolves static icons synchronously", () => {
    registerStaticIcon("test-prefix:icon-a", { path: "M0 0" });
    const resolved = resolveIconSync("test-prefix:icon-a");
    expect(resolved).not.toBeNull();
    expect(resolved?.path).toBe("M0 0");
  });

  it("resolves offline collections synchronously", () => {
    registerOfflineCollection("test-bundle", {
      prefix: "test-bundle",
      icons: {
        check: { body: '<path d="M5 5l5 5"/>' },
      },
    });

    const resolved = resolveIconSync("test-bundle:check");
    expect(resolved).not.toBeNull();
    expect(resolved?.body).toContain("M5 5l5 5");
  });

  it("resolves built-in bare aliases and raw registry keys like hamburger", () => {
    registerStaticIcon("hamburger", { path: "M0 0h24v2H0z" });
    const direct = resolveIconSync("hamburger");
    expect(direct).not.toBeNull();
    expect(direct?.path).toBe("M0 0h24v2H0z");

    const bareMail = resolveIconSync("mail");
    expect(bareMail).not.toBeNull();
  });

  it("resolves via API asynchronously when not available offline", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(`<svg viewBox="0 0 24 24"><path d="M12 12"/></svg>`, { status: 200 })
    ) as unknown as typeof fetch;

    const resolved = await resolveIconAsync("remote-set:sparkle");
    expect(resolved).not.toBeNull();
    expect(resolved?.viewBox).toBe("0 0 24 24");
  });
});
