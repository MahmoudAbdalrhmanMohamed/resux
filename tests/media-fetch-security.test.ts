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
    "::ffff:127.0.0.1",
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
    )).resolves.toEqual([]);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("does not trust a spoofed same-origin metadata host", async () => {
    await expect(assertSafeResuxMediaUrl(
      new URL("http://169.254.169.254/latest/meta-data/"),
      "http://169.254.169.254",
      async () => {
        throw new Error("literal IPs should not require DNS");
      },
    )).rejects.toMatchObject({
      code: "unsafe_url",
      statusCode: 400,
    });
  });

  it("rejects remote hostnames that resolve to private networks", async () => {
    await expect(assertSafeResuxMediaUrl(
      new URL("https://media.example.test/image.jpg"),
      "https://app.example.test",
      async () => ["10.20.30.40"],
    )).rejects.toMatchObject({
      code: "unsafe_url",
      statusCode: 400,
    });
  });

  it("validates every redirect before following it", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data/" },
    }));

    await expect(fetchResuxMediaSource(
      new URL("https://media.example.test/image.jpg"),
      {
        requestOrigin: "https://app.example.test",
        maxBytes: 1024,
      },
      {
        fetch: fetchMock as typeof fetch,
        resolveAddresses: async () => ["93.184.216.34"],
      },
    )).rejects.toMatchObject({
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

    await vi.advanceTimersByTimeAsync(101);
    await expect(request).rejects.toMatchObject({
      code: "timeout",
      statusCode: 504,
    });
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

    const result = await fetchResuxMediaSource(
      new URL("https://media.example.test/image.jpg"),
      {
        requestOrigin: "https://app.example.test",
        maxBytes: 1024,
      },
      {
        fetch: fetchMock as typeof fetch,
        resolveAddresses: async () => ["93.184.216.34"],
      },
    );

    expect(result.response.status).toBe(503);
    expect(result.body).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("stops reading responses that exceed the configured byte limit", async () => {
    const fetchMock = vi.fn(async () => new Response("12345", { status: 200 }));

    let thrown: unknown;
    try {
      await fetchResuxMediaSource(
        new URL("https://media.example.test/image.jpg"),
        {
          requestOrigin: "https://app.example.test",
          maxBytes: 4,
        },
        {
          fetch: fetchMock as typeof fetch,
          resolveAddresses: async () => ["93.184.216.34"],
        },
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
