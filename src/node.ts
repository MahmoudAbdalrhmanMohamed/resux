import type { OutgoingHttpHeaders, ServerResponse } from "node:http";
import {
  createResuxNodeHandler as createCliResuxNodeHandler,
  type ResuxNodeHandlerOptions,
} from "./cli.js";

export type { ResuxNodeHandlerOptions } from "./cli.js";

const GENERATED_IMAGE_PREFIX = "/_resux/generated/images/";
const GENERATED_VIDEO_PREFIX = "/_resux/generated/videos/";
const STATELESS_IMAGE_PATH = "/__resux/image";
const STATELESS_VIDEO_PATH = "/__resux/video";

function parseCacheMaxAgeSeconds(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || ["false", "0", "off", "no"].includes(normalized)) {
    return undefined;
  }
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return 86400;
  }

  const directNumber = Number(normalized);
  if (Number.isFinite(directNumber) && directNumber > 0) {
    return Math.max(1, Math.round(directNumber));
  }

  const durationMatch = /^(\d+)\s*(s|m|h|d|w)$/.exec(normalized);
  if (!durationMatch) {
    return undefined;
  }

  const amount = Number(durationMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  const unit = durationMatch[2];
  const multiplier =
    unit === "s" ? 1
      : unit === "m" ? 60
        : unit === "h" ? 3600
          : unit === "d" ? 86400
            : 604800;
  return Math.max(1, Math.round(amount * multiplier));
}

function isStatelessDeploymentRuntime(): boolean {
  return Boolean(
    process.env.VERCEL
    || process.env.VERCEL_ENV
    || process.env.AWS_LAMBDA_FUNCTION_NAME
    || process.env.LAMBDA_TASK_ROOT
    || process.env.NETLIFY,
  );
}

function resolveStatelessGeneratedMediaRequest(rawUrl: string | undefined): {
  url: string;
  maxAgeSeconds: number;
} | null {
  if (!rawUrl) {
    return null;
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(rawUrl, "http://resux.local");
  } catch {
    return null;
  }

  const cacheValue = requestUrl.searchParams.get("cache") ?? requestUrl.searchParams.get("c");
  const maxAgeSeconds = parseCacheMaxAgeSeconds(cacheValue);
  if (!maxAgeSeconds) {
    return null;
  }

  const hasSource = Boolean(
    requestUrl.searchParams.get("src")
    || requestUrl.searchParams.get("url")
    || requestUrl.searchParams.get("original"),
  );
  if (!hasSource) {
    return null;
  }

  if (requestUrl.pathname.startsWith(GENERATED_IMAGE_PREFIX)) {
    requestUrl.pathname = STATELESS_IMAGE_PATH;
  } else if (requestUrl.pathname.startsWith(GENERATED_VIDEO_PREFIX)) {
    requestUrl.pathname = STATELESS_VIDEO_PATH;
  } else {
    return null;
  }

  return {
    url: `${requestUrl.pathname}${requestUrl.search}`,
    maxAgeSeconds,
  };
}

function withGeneratedMediaCacheHeaders(
  response: ServerResponse,
  maxAgeSeconds: number,
): void {
  const originalWriteHead = response.writeHead.bind(response);
  const cacheControl = `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`;
  const cdnCacheControl = `public, max-age=${maxAgeSeconds}`;
  const overrides: OutgoingHttpHeaders = {
    "cache-control": cacheControl,
    "cdn-cache-control": cdnCacheControl,
    "vercel-cdn-cache-control": cdnCacheControl,
    "x-resux-cache": "stateless",
  };

  response.writeHead = ((statusCode: number, ...args: any[]) => {
    if (statusCode >= 200 && statusCode < 300) {
      if (typeof args[0] === "string") {
        if (args[1] && typeof args[1] === "object" && !Array.isArray(args[1])) {
          args[1] = { ...args[1], ...overrides };
        } else if (!args[1]) {
          args[1] = { ...overrides };
        }
      } else if (args[0] && typeof args[0] === "object" && !Array.isArray(args[0])) {
        args[0] = { ...args[0], ...overrides };
      } else if (!args[0]) {
        args[0] = { ...overrides };
      } else {
        for (const [name, value] of Object.entries(overrides)) {
          if (value !== undefined) {
            response.setHeader(name, value as string | number | readonly string[]);
          }
        }
      }
    }

    return originalWriteHead(statusCode, ...args as Parameters<ServerResponse["writeHead"]> extends [number, ...infer Rest] ? Rest : never);
  }) as ServerResponse["writeHead"];
}

export function createResuxNodeHandler(options: ResuxNodeHandlerOptions = {}) {
  const handler = createCliResuxNodeHandler(options);

  if (!isStatelessDeploymentRuntime()) {
    return handler;
  }

  return (request: Parameters<typeof handler>[0], response: Parameters<typeof handler>[1]): void => {
    const rewritten = resolveStatelessGeneratedMediaRequest(request.url);
    if (rewritten) {
      request.url = rewritten.url;
      withGeneratedMediaCacheHeaders(response, rewritten.maxAgeSeconds);
    }
    handler(request, response);
  };
}
