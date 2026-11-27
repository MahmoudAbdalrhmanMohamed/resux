import { describe, expect, it } from "vitest";
import { collectPrerenderAsyncDataErrors } from "../src/cli.js";

const failing = {
  scopes: {
    s1: { asyncData: { products: { error: { name: "Error", message: "Fetch failed for /api/products: 500" } } } },
    s2: { asyncData: { ok: { error: null } } },
  },
};

describe("prerender async data errors", () => {
  it("reports captured async data errors when nitro is prerendering", () => {
    expect(collectPrerenderAsyncDataErrors({ "x-nitro-prerender": "%2F" }, failing)).toEqual([
      "products: Fetch failed for /api/products: 500",
    ]);
  });

  it("stays silent for normal requests", () => {
    expect(collectPrerenderAsyncDataErrors({}, failing)).toEqual([]);
  });

  it("stays silent when prerendering succeeded", () => {
    const clean = { scopes: { s1: { asyncData: { ok: { error: null } } }, s2: {} } };
    expect(collectPrerenderAsyncDataErrors({ "x-nitro-prerender": "%2F" }, clean)).toEqual([]);
  });
});
