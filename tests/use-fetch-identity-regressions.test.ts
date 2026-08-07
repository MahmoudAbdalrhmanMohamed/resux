import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createServerSetupContext,
  type AsyncDataResource,
  type ResuxAppLike,
  type RouteContext,
  type RuntimeConfig,
} from "resuxjs/runtime";

afterEach(() => {
  vi.unstubAllGlobals();
});

function createFetchContext(fetchMock: ReturnType<typeof vi.fn>) {
  const route: RouteContext = {
    path: "/",
    params: {},
    query: {},
    origin: "https://example.com",
  };
  const runtimeConfig: RuntimeConfig = { public: {} };
  const app = {
    route,
    payload: { state: {}, data: {} },
    $config: runtimeConfig,
    provides: {},
    provide() {},
  } as unknown as ResuxAppLike;
  vi.stubGlobal("fetch", fetchMock);

  return createServerSetupContext(
    route,
    {},
    Object.create(null),
    Object.create(null),
    [],
    app,
    runtimeConfig,
  );
}

describe("useFetch request identity regressions", () => {
  it("does not deduplicate same-URL requests with different methods or bodies", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      new Response(JSON.stringify({
        method: init?.method ?? "GET",
        body: init?.body ?? null,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    const context = createFetchContext(fetchMock);

    const first = context.useFetch<{ method: string; body: string }>("/api/items", {
      method: "POST",
      body: "first",
    });
    const second = context.useFetch<{ method: string; body: string }>("/api/items", {
      method: "POST",
      body: "second",
    });

    expect(first).not.toBe(second);
    const [firstSettled, secondSettled] = await Promise.all([
      first as AsyncDataResource<{ method: string; body: string }>,
      second as AsyncDataResource<{ method: string; body: string }>,
    ]);

    expect(firstSettled.data.value).toEqual({ method: "POST", body: "first" });
    expect(secondSettled.data.value).toEqual({ method: "POST", body: "second" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still deduplicates truly identical requests", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const context = createFetchContext(fetchMock);
    const init: RequestInit = {
      method: "POST",
      headers: { "x-test": "same" },
      body: "same",
    };

    const first = context.useFetch("/api/items", init);
    const second = context.useFetch("/api/items", init);

    expect(first).toBe(second);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("distinguishes binary bodies without serializing every byte into the resource key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const context = createFetchContext(fetchMock);
    const firstBytes = new Uint8Array(64 * 1024);
    const secondBytes = new Uint8Array(64 * 1024);
    firstBytes[firstBytes.length - 1] = 1;
    secondBytes[secondBytes.length - 1] = 2;

    const first = context.useFetch("/api/binary", {
      method: "POST",
      body: firstBytes.buffer,
    });
    const second = context.useFetch("/api/binary", {
      method: "POST",
      body: secondBytes.buffer,
    });
    const duplicateFirst = context.useFetch("/api/binary", {
      method: "POST",
      body: firstBytes.buffer,
    });

    expect(first).not.toBe(second);
    expect(first).toBe(duplicateFirst);
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
