import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const delegatedUrls: string[] = [];

vi.mock("../src/cli.js", () => ({
  createResuxNodeHandler: () => (request: any, response: any) => {
    delegatedUrls.push(request.url ?? "");
    response.writeHead(200, {
      "content-type": request.url?.includes("video") ? "video/mp4" : "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    });
    response.end("ok");
  },
}));

const { createResuxNodeHandler } = await import("../src/node.js");

function createResponse() {
  const headers = new Map<string, unknown>();
  let statusCode = 0;
  let body = "";

  const response: any = {
    setHeader(name: string, value: unknown) {
      headers.set(name.toLowerCase(), value);
    },
    writeHead(code: number, statusOrHeaders?: string | Record<string, unknown>, maybeHeaders?: Record<string, unknown>) {
      statusCode = code;
      const suppliedHeaders = typeof statusOrHeaders === "string" ? maybeHeaders : statusOrHeaders;
      for (const [name, value] of Object.entries(suppliedHeaders ?? {})) {
        headers.set(name.toLowerCase(), value);
      }
      return response;
    },
    end(value?: string) {
      body = value ?? "";
    },
  };

  return {
    response,
    read() {
      return { headers, statusCode, body };
    },
  };
}

describe("serverless generated media", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delegatedUrls.length = 0;
    process.env.VERCEL = "1";
    delete process.env.NETLIFY;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.LAMBDA_TASK_ROOT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rewrites cached generated images to the stateless image transform endpoint", () => {
    const handler = createResuxNodeHandler();
    const { response, read } = createResponse();
    const request: any = {
      url: "/_resux/generated/images/e456411b.avif?src=%2Fmedia-test%2Fimages%2Fhero-square.jpg&w=1200&f=avif&q=90&cache=7d",
    };

    handler(request, response);

    expect(delegatedUrls).toEqual([
      "/__resux/image?src=%2Fmedia-test%2Fimages%2Fhero-square.jpg&w=1200&f=avif&q=90&cache=7d",
    ]);
    expect(read().statusCode).toBe(200);
    expect(read().headers.get("cache-control")).toBe("public, max-age=604800, s-maxage=604800");
    expect(read().headers.get("cdn-cache-control")).toBe("public, max-age=604800");
    expect(read().headers.get("vercel-cdn-cache-control")).toBe("public, max-age=604800");
    expect(read().headers.get("x-resux-cache")).toBe("stateless");
  });

  it("rewrites cached generated videos without requiring a writable public directory", () => {
    const handler = createResuxNodeHandler();
    const { response, read } = createResponse();
    const request: any = {
      url: "/_resux/generated/videos/abcd1234.mp4?src=%2Fmedia-test%2Fvideos%2Fsample-video.mp4&f=mp4&q=80&cache=1d",
    };

    handler(request, response);

    expect(delegatedUrls).toEqual([
      "/__resux/video?src=%2Fmedia-test%2Fvideos%2Fsample-video.mp4&f=mp4&q=80&cache=1d",
    ]);
    expect(read().headers.get("cache-control")).toBe("public, max-age=86400, s-maxage=86400");
  });

  it("keeps local Node and uncached requests on the existing generated-media handler", () => {
    delete process.env.VERCEL;
    const localHandler = createResuxNodeHandler();
    const localResponse = createResponse();
    localHandler({
      url: "/_resux/generated/images/local.webp?src=%2Fhero.jpg&w=640&f=webp&cache=1d",
    } as any, localResponse.response);

    process.env.VERCEL = "1";
    const uncachedHandler = createResuxNodeHandler();
    const uncachedResponse = createResponse();
    uncachedHandler({
      url: "/_resux/generated/images/uncached.webp?src=%2Fhero.jpg&w=640&f=webp&cache=false",
    } as any, uncachedResponse.response);

    expect(delegatedUrls).toEqual([
      "/_resux/generated/images/local.webp?src=%2Fhero.jpg&w=640&f=webp&cache=1d",
      "/_resux/generated/images/uncached.webp?src=%2Fhero.jpg&w=640&f=webp&cache=false",
    ]);
  });
});
