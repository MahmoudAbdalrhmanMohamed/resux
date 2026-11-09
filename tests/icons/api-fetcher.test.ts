import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchIconifyIcon } from "../../src/icons/api-fetcher.js";
import { IconCacheManager } from "../../src/icons/cache.js";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("api fetcher", () => {
  it("fetches icon from api and parses svg data", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        `<svg viewBox="0 0 24 24"><path d="M1 1h10v10H1z"/></svg>`,
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const cache = new IconCacheManager();
    const result = await fetchIconifyIcon("mdi:test", "https://icons.example.test", cache);

    expect(result).not.toBeNull();
    expect(result?.viewBox).toBe("0 0 24 24");
    expect(result?.path).toBe("M1 1h10v10H1z");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://icons.example.test/mdi/test.svg");
  });

  it("handles non-200 responses gracefully", async () => {
    globalThis.fetch = vi.fn(async () => new Response("Not found", { status: 404 })) as unknown as typeof fetch;

    const cache = new IconCacheManager();
    const result = await fetchIconifyIcon("mdi:missing", "https://icons.example.test", cache);
    expect(result).toBeNull();
  });

  it("deduplicates concurrent fetches for the same icon", async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(`<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>`, { status: 200 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const cache = new IconCacheManager();
    const [first, second] = await Promise.all([
      fetchIconifyIcon("lucide:bell", "https://icons.example.test", cache),
      fetchIconifyIcon("lucide:bell", "https://icons.example.test", cache),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });
});
