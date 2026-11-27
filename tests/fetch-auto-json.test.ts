import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createServerSetupContext,
  getClientRuntimeSource,
  type ResuxAppLike,
  type RouteContext,
  type RuntimeConfig,
} from "resuxjs/runtime";

afterEach(() => {
  vi.unstubAllGlobals();
});

function createContext(fetchMock: ReturnType<typeof vi.fn>) {
  const route: RouteContext = { path: "/", params: {}, query: {}, origin: "https://example.com" };
  const runtimeConfig: RuntimeConfig = { public: {} };
  const app = {
    route,
    payload: { state: {}, data: {} },
    $config: runtimeConfig,
    provides: {},
    provide() {},
  } as unknown as ResuxAppLike;
  vi.stubGlobal("fetch", fetchMock);
  return createServerSetupContext(route, {}, Object.create(null), Object.create(null), [], app, runtimeConfig);
}

const okJson = () =>
  new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });

describe("$fetch plain-object bodies (server)", () => {
  it("stringifies a plain object body and sets the JSON content type", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => okJson());
    const context = createContext(fetchMock);
    await context.$fetch("/api/orders", { method: "POST", body: { id: 1, tags: ["a"] } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"id":1,"tags":["a"]}');
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(init.method).toBe("POST");
  });

  it("stringifies an array body and keeps a content type the caller set", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => okJson());
    const context = createContext(fetchMock);
    await context.$fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/vnd.api+json" },
      body: [1, 2],
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe("[1,2]");
    expect(new Headers(init.headers).get("content-type")).toBe("application/vnd.api+json");
  });

  it("leaves string and URLSearchParams bodies untouched", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => okJson());
    const context = createContext(fetchMock);
    const params = new URLSearchParams({ a: "1" });
    await context.$fetch("/api/a", { method: "POST", body: "raw" });
    await context.$fetch("/api/b", { method: "POST", body: params });
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe("raw");
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(params);
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).has("content-type")).toBe(false);
  });

  it("does not deduplicate useFetch calls whose plain-object bodies differ", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      new Response(String(init?.body), { status: 200, headers: { "content-type": "application/json" } }));
    const context = createContext(fetchMock);
    const first = context.useFetch<{ n: number }>("/api/items", { method: "POST", body: { n: 1 } });
    const second = context.useFetch<{ n: number }>("/api/items", { method: "POST", body: { n: 2 } });
    await Promise.all([first.refresh?.(), second.refresh?.()]);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    const bodies = fetchMock.mock.calls.map((call) => (call[1] as RequestInit).body);
    expect(bodies).toContain('{"n":1}');
    expect(bodies).toContain('{"n":2}');
  });

  it("throws an error with status, statusMessage and parsed data", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ reason: "bad" }), { status: 422, statusText: "Unprocessable", headers: { "content-type": "application/json" } }));
    const context = createContext(fetchMock);
    const error = await context.$fetch("/api/orders").catch((e: unknown) => e) as Error & Record<string, unknown>;
    expect(error.message).toBe("Fetch failed for https://example.com/api/orders: 422");
    expect(error.status).toBe(422);
    expect(error.statusMessage).toBe("Unprocessable");
    expect(error.data).toEqual({ reason: "bad" });
  });

  it("keeps a non-JSON error body as text", async () => {
    const fetchMock = vi.fn(async () => new Response("down for maintenance", { status: 503, statusText: "Service Unavailable" }));
    const context = createContext(fetchMock);
    const error = await context.$fetch("/api/x").catch((e: unknown) => e) as Error & Record<string, unknown>;
    expect(error.status).toBe(503);
    expect(error.data).toBe("down for maintenance");
  });
});

describe("$fetch plain-object bodies (browser runtime source)", () => {
  const source = getClientRuntimeSource();
  const start = source.indexOf("function isPlainJsonBody");
  const end = source.indexOf("function createFetchAsyncDataKey");
  type Helpers = {
    prepareFetchInit: (init?: Record<string, unknown>) => RequestInit | undefined;
    createFetchError: (url: string, response: Response) => Promise<Error & Record<string, unknown>>;
  };
  const load = (): Helpers =>
    new Function(source.slice(start, end) + "\nreturn { prepareFetchInit, createFetchError };")() as Helpers;

  it("contains the helpers", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it("stringifies plain object bodies and sets the content type", () => {
    const helpers = load();
    const init = helpers.prepareFetchInit({ method: "POST", body: { a: 1 } }) as RequestInit;
    expect(init.body).toBe('{"a":1}');
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
  });

  it("returns other inits unchanged", () => {
    const helpers = load();
    const init = { method: "POST", body: "raw" };
    expect(helpers.prepareFetchInit(init)).toBe(init);
    expect(helpers.prepareFetchInit(undefined)).toBeUndefined();
  });

  it("builds an error with status, statusMessage and data", async () => {
    const helpers = load();
    const response = new Response(JSON.stringify({ reason: "bad" }), { status: 400, statusText: "Bad Request" });
    const error = await helpers.createFetchError("/api/x", response);
    expect(error.message).toBe("Fetch failed for /api/x: 400");
    expect(error.status).toBe(400);
    expect(error.statusMessage).toBe("Bad Request");
    expect(error.data).toEqual({ reason: "bad" });
  });
});
