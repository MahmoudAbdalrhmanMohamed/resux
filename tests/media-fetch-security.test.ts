import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertSafeResuxMediaUrl,
  fetchResuxMediaSource,
  isPrivateNetworkAddress,
  ResuxMediaFetchError,
} from "../src/security/media-fetch.js";

afterEach(() => {
  vi.useRealTimers();
});

const PUBLIC_MEDIA_URL = "https://media.example.test/image.jpg";
const APP_ORIGIN = "https://app.example.test";
const PUBLIC_ADDRESS = "93.184.216.34";

function expectUnsafeMediaUrl(
  target: string,
  requestOrigin: string,
  resolveAddresses: (hostname: string) => Promise<string[]>,
  trustedLoopbackPort?: number,
) {
  return expect(assertSafeResuxMediaUrl(
    new URL(target),
    requestOrigin,
    resolveAddresses,
    trustedLoopbackPort,
  )).rejects.toMatchObject({
    code: "unsafe_url",
    statusCode: 400,
  });
}

function fetchPublicMedia(
  dependencies: Parameters<typeof fetchResuxMediaSource>[2],
  options: Partial<Parameters<typeof fetchResuxMediaSource>[1]> = {},
) {
  return fetchResuxMediaSource(
    new URL(PUBLIC_MEDIA_URL),
    {
      requestOrigin: APP_ORIGIN,
      maxBytes: 1024,
      ...options,
    },
    {
      resolveAddresses: async () => [PUBLIC_ADDRESS],
      ...dependencies,
    },
  );
}

describe("remote media fetch security", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "fec0::1",
    "::ffff:127.0.0.1",
    "64:ff9b::7f00:1",
    "2002:7f00:1::",
  ])("rejects private or local address %s", (address) => {
    expect(isPrivateNetworkAddress(address)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "2606:4700:4700::1111",
  ])("accepts publicly routable address %s", (address) => {
    expect(isPrivateNetworkAddress(address)).toBe(false);
  });

  it("allows same-origin media without DNS checks", async () => {
    const resolver = vi.fn(async () => {
      throw new Error("resolver should not run");
    });

    await expect(assertSafeResuxMediaUrl(
      new URL("http://localhost:3000/public/hero.jpg"),
      "http://localhost:3000",
      resolver,
      3000,
    )).resolves.toEqual([]);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("does not trust a spoofed loopback origin for a different local port", async () => {
    await expectUnsafeMediaUrl(
      "http://127.0.0.1:6379/private",
      "http://127.0.0.1:6379",
      async () => {
        throw new Error("literal IPs should not require DNS");
      },
      3000,
    );
  });

  it("does not trust a spoofed same-origin metadata host", async () => {
    await expectUnsafeMediaUrl(
      "http://169.254.169.254/latest/meta-data/",
      "http://169.254.169.254",
      async () => {
        throw new Error("literal IPs should not require DNS");
      },
    );
  });

  it("rejects remote hostnames that resolve to private networks", async () => {
    await expectUnsafeMediaUrl(
      PUBLIC_MEDIA_URL,
      APP_ORIGIN,
      async () => ["10.20.30.40"],
    );
  });

  it("validates every redirect before following it", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data/" },
    }));

    await expect(fetchPublicMedia({
      fetch: fetchMock as typeof fetch,
    })).rejects.toMatchObject({
      code: "unsafe_url",
      statusCode: 400,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enforces the deadline while DNS resolution is still pending", async () => {
    vi.useFakeTimers();
    const request = fetchResuxMediaSource(
      new URL("https://slow-dns.example.test/image.jpg"),
      {
        requestOrigin: "https://app.example.test",
        maxBytes: 1024,
        timeoutMs: 100,
      },
      {
        fetch: vi.fn() as unknown as typeof fetch,
        resolveAddresses: () => new Promise<string[]>(() => undefined),
      },
    );

    const rejection = expect(request).rejects.toMatchObject({
      code: "timeout",
      statusCode: 504,
    });
    await vi.advanceTimersByTimeAsync(101);
    await rejection;
  });

  it("cancels non-success upstream bodies before returning the status", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("upstream error"));
      },
      cancel,
    });
    const fetchMock = vi.fn(async () => new Response(body, { status: 503 }));

    const result = await fetchPublicMedia({
      fetch: fetchMock as typeof fetch,
    });

    expect(result.response.status).toBe(503);
    expect(result.body).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("tries each validated DNS address until one connects", async () => {
    const pinnedFetch = vi.fn()
      .mockRejectedValueOnce(new Error("first address unreachable"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const result = await fetchPublicMedia({
      resolveAddresses: async () => [PUBLIC_ADDRESS, "1.1.1.1"],
      isCloudflareRuntime: () => false,
      fetchPinnedNode: pinnedFetch,
    });

    expect(pinnedFetch).toHaveBeenCalledTimes(2);
    expect(result.body?.toString("utf8")).toBe("ok");
  });

  it("stops reading responses that exceed the configured byte limit", async () => {
    const fetchMock = vi.fn(async () => new Response("12345", { status: 200 }));

    let thrown: unknown;
    try {
      await fetchPublicMedia(
        { fetch: fetchMock as typeof fetch },
        { maxBytes: 4 },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ResuxMediaFetchError);
    expect(thrown).toMatchObject({
      code: "too_large",
      statusCode: 413,
    });
  });

  it("rejects credentials in media source URLs", async () => {
    await expect(assertSafeResuxMediaUrl(
      new URL("https://user:secret@media.example.test/image.jpg"),
      "https://app.example.test",
      async () => ["93.184.216.34"],
    )).rejects.toMatchObject({
      code: "unsafe_url",
      statusCode: 400,
    });
  });
});
