import { afterEach, describe, expect, it, vi } from "vitest";
import iconsModule, {
  fetchIconifyIcon,
  normalizeIconApiProvider,
} from "../src/icons/index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("icon runtime regressions", () => {
  it("uses the configured provider and preserves every path", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => ({
      ok: true,
      text: async () => `
        <svg viewBox='0 0 32 32'>
          <path d='M1 1h10v10H1z' opacity='.4'/>
          <path d="M20 20h5v5h-5z"/>
        </svg>
      `,
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchIconifyIcon(
      "audit-suite:multi-path",
      "https://icons.example.test/base/",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://icons.example.test/base/audit-suite/multi-path.svg",
    );
    expect(result?.viewBox).toBe("0 0 32 32");
    expect(result?.paths).toEqual([
      { d: "M1 1h10v10H1z", opacity: ".4" },
      { d: "M20 20h5v5h-5z", opacity: undefined },
    ]);
  });

  it("deduplicates concurrent requests per provider and icon", async () => {
    let resolveResponse!: (value: { ok: boolean; text: () => Promise<string> }) => void;
    const response = new Promise<{ ok: boolean; text: () => Promise<string> }>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn(() => response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = fetchIconifyIcon("audit-suite:dedupe", "https://icons.example.test");
    const second = fetchIconifyIcon("audit-suite:dedupe", "https://icons.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse({
      ok: true,
      text: async () => `<svg viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>`,
    });

    await expect(first).resolves.toEqual(await second);
  });

  it("aborts icon requests that exceed the fetch timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const request = fetchIconifyIcon("audit-suite:timeout", "https://icons.example.test");
    await vi.advanceTimersByTimeAsync(10_001);
    await expect(request).resolves.toBeNull();
  });

  it("rejects oversized icon responses before caching them", async () => {
    const fetchMock = vi.fn(async () => new Response("x".repeat(300 * 1024), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchIconifyIcon(
      "audit-suite:oversized",
      "https://icons.example.test",
    )).resolves.toBeNull();
  });

  it("evicts old dynamically fetched icons instead of growing the cache forever", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => '<svg viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>',
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    for (let index = 0; index < 257; index += 1) {
      await fetchIconifyIcon(`audit-cache:icon-${index}`, "https://icons.example.test");
    }
    expect(fetchMock).toHaveBeenCalledTimes(257);

    await fetchIconifyIcon("audit-cache:icon-0", "https://icons.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(258);
  });

  it("normalizes provider configuration into runtime config", () => {
    expect(normalizeIconApiProvider("javascript:alert(1)")).toBe("https://api.iconify.design");
    expect(normalizeIconApiProvider("//icons.attacker.example/base"))
      .toBe("https://api.iconify.design");
    expect(normalizeIconApiProvider("/internal/icons/")).toBe("/internal/icons");
    expect(normalizeIconApiProvider("https://icons.example.test/base////"))
      .toBe("https://icons.example.test/base");

    const configs: unknown[] = [];
    iconsModule.setup({
      collections: [],
      component: "Icon",
      mode: "svg",
      apiProvider: "https://icons.example.test/base/",
      lazy: true,
    }, {
      extendRuntimeConfig(config: unknown) {
        configs.push(config);
      },
    } as any);

    expect(configs[0]).toMatchObject({
      public: {
        icons: {
          apiProvider: "https://icons.example.test/base",
          lazy: true,
        },
      },
    });
  });
});
