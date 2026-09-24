import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

export const RESUX_MEDIA_FETCH_TIMEOUT_MS = 30_000;
export const RESUX_IMAGE_MAX_SOURCE_BYTES = 32 * 1024 * 1024;
export const RESUX_VIDEO_MAX_SOURCE_BYTES = 256 * 1024 * 1024;
const RESUX_MEDIA_MAX_REDIRECTS = 5;

export type ResuxMediaFetchErrorCode =
  | "unsafe_url"
  | "timeout"
  | "too_large"
  | "too_many_redirects"
  | "network";

export class ResuxMediaFetchError extends Error {
  readonly code: ResuxMediaFetchErrorCode;
  readonly statusCode: number;

  constructor(code: ResuxMediaFetchErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "ResuxMediaFetchError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ResuxFetchedMediaSource {
  response: Response;
  body: Buffer | null;
  finalUrl: URL;
}

export interface ResuxMediaFetchDependencies {
  fetch?: typeof globalThis.fetch;
  resolveAddresses?: (hostname: string) => Promise<string[]>;
  isCloudflareRuntime?: () => boolean;
  fetchPinnedNode?: (
    target: URL,
    address: string,
    accept: string | undefined,
    signal: AbortSignal,
  ) => Promise<Response>;
}

function mediaError(
  code: ResuxMediaFetchErrorCode,
  message: string,
  statusCode: number,
): ResuxMediaFetchError {
  return new ResuxMediaFetchError(code, message, statusCode);
}

function mediaTimeoutError(timeoutMs: number): ResuxMediaFetchError {
  return mediaError(
    "timeout",
    `Media source request timed out after ${timeoutMs}ms.`,
    504,
  );
}

async function resolveHostnameAddresses(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%", 1)[0] ?? "";
  const family = isIP(normalized);
  if (family === 4) return isPrivateIpv4(normalized);
  if (family === 6) return isPrivateIpv6(normalized);
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true;
  }
  const [a, b, c] = octets as [number, number, number, number];
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const segments = expandIpv6(address);
  if (!segments) return true;

  const allZero = segments.every((segment) => segment === 0);
  const loopback = segments.slice(0, 7).every((segment) => segment === 0) && segments[7] === 1;
  if (allZero || loopback) return true;

  const first = segments[0] ?? 0;
  if ((first & 0xfe00) === 0xfc00
    || (first & 0xffc0) === 0xfe80
    || (first & 0xffc0) === 0xfec0
    || (first & 0xff00) === 0xff00
    || (first === 0x2001 && segments[1] === 0x0db8)) {
    return true;
  }

  if (first === 0x2002) {
    const high = segments[1] ?? 0;
    const low = segments[2] ?? 0;
    const ipv4 = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    return isPrivateIpv4(ipv4);
  }

  const ipv4Mapped = segments.slice(0, 5).every((segment) => segment === 0)
    && segments[5] === 0xffff;
  const ipv4Compatible = segments.slice(0, 6).every((segment) => segment === 0);
  const nat64 = first === 0x64
    && segments[1] === 0xff9b
    && segments.slice(2, 6).every((segment) => segment === 0);
  if (!ipv4Mapped && !ipv4Compatible && !nat64) return false;

  const ipv4 = `${(segments[6] ?? 0) >> 8}.${(segments[6] ?? 0) & 0xff}.${(segments[7] ?? 0) >> 8}.${(segments[7] ?? 0) & 0xff}`;
  return isPrivateIpv4(ipv4);
}

function expandIpv6(address: string): number[] | null {
  let input = address;
  let ipv4Tail: number[] = [];
  const lastColon = input.lastIndexOf(":");
  const possibleIpv4 = lastColon >= 0 ? input.slice(lastColon + 1) : input;
  if (possibleIpv4.includes(".")) {
    if (isIP(possibleIpv4) !== 4) return null;
    const octets = possibleIpv4.split(".").map(Number);
    ipv4Tail = [
      ((octets[0] ?? 0) << 8) | (octets[1] ?? 0),
      ((octets[2] ?? 0) << 8) | (octets[3] ?? 0),
    ];
    input = input.slice(0, lastColon) + ":ipv4";
  }

  const halves = input.split("::");
  if (halves.length > 2) return null;

  const parseHalf = (value: string): number[] | null => {
    if (!value) return [];
    const parsed: number[] = [];
    for (const part of value.split(":")) {
      if (part === "ipv4") {
        parsed.push(...ipv4Tail);
      } else if (/^[0-9a-f]{1,4}$/i.test(part)) {
        parsed.push(Number.parseInt(part, 16));
      } else {
        return null;
      }
    }
    return parsed;
  };

  const left = parseHalf(halves[0] ?? "");
  const right = parseHalf(halves[1] ?? "");
  if (!left || !right) return null;
  if (halves.length === 1) return left.length === 8 ? left : null;

  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

function hostnameNeedsDnsValidation(hostname: string): boolean {
  return isIP(hostname.toLowerCase().replace(/^\[|\]$/g, "")) === 0;
}

function isLoopbackDevelopmentHost(hostname: string): boolean {
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "127.0.0.1"
    || hostname === "::1";
}

export async function assertSafeResuxMediaUrl(
  target: URL,
  _requestOrigin: string,
  resolveAddresses: (hostname: string) => Promise<string[]> = resolveHostnameAddresses,
  trustedLoopbackPort?: number,
): Promise<string[]> {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw mediaError("unsafe_url", "Media sources must use HTTP or HTTPS.", 400);
  }
  if (target.username || target.password) {
    throw mediaError("unsafe_url", "Media source URLs cannot contain credentials.", 400);
  }

  const hostname = target.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const targetPort = target.port
    ? Number(target.port)
    : target.protocol === "https:"
      ? 443
      : 80;
  if (
    Number.isInteger(trustedLoopbackPort)
    && trustedLoopbackPort! > 0
    && trustedLoopbackPort! <= 65_535
    && targetPort === trustedLoopbackPort
    && isLoopbackDevelopmentHost(hostname)
  ) {
    return [];
  }
  if (!hostname || hostname.endsWith(".local")) {
    throw mediaError("unsafe_url", "Media source resolves to a local or private network target.", 400);
  }

  if (!hostnameNeedsDnsValidation(hostname)) {
    if (isPrivateNetworkAddress(hostname)) {
      throw mediaError("unsafe_url", "Media source resolves to a local or private network target.", 400);
    }
    return [hostname];
  }

  let addresses: string[];
  try {
    addresses = await resolveAddresses(hostname);
  } catch {
    throw mediaError("network", "Media source hostname could not be resolved.", 502);
  }
  const uniqueAddresses = [...new Set(addresses)];
  if (uniqueAddresses.length === 0 || uniqueAddresses.some(isPrivateNetworkAddress)) {
    throw mediaError("unsafe_url", "Media source resolves to a local or private network target.", 400);
  }
  return uniqueAddresses;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isCloudflareWorkersRuntime(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function toResponseHeaders(rawHeaders: string[]): Headers {
  const headers = new Headers();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (name && value !== undefined) headers.append(name, value);
  }
  return headers;
}

function fetchPinnedNodeMediaUrl(
  target: URL,
  address: string,
  accept: string | undefined,
  signal: AbortSignal,
): Promise<Response> {
  const request = target.protocol === "https:" ? httpsRequest : httpRequest;
  const requestHeaders: Record<string, string> = {
    host: target.host,
    "accept-encoding": "identity",
  };
  if (accept) requestHeaders.accept = accept;

  return new Promise((resolve, reject) => {
    const req = request({
      protocol: target.protocol,
      hostname: address,
      port: target.port || undefined,
      method: "GET",
      path: `${target.pathname}${target.search}`,
      headers: requestHeaders,
      signal,
      ...(target.protocol === "https:" ? { servername: target.hostname } : {}),
    }, (incoming) => {
      const status = incoming.statusCode ?? 502;
      const init: ResponseInit = {
        status,
        statusText: incoming.statusMessage,
        headers: toResponseHeaders(incoming.rawHeaders),
      };
      if (status === 204 || status === 205 || status === 304) {
        incoming.resume();
        resolve(new Response(null, init));
        return;
      }
      const body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
      resolve(new Response(body, init));
    });
    req.once("error", reject);
    req.end();
  });
}

async function raceAgainstAbort<T>(
  operation: Promise<T>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<T> {
  if (signal.aborted) throw mediaTimeoutError(timeoutMs);

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(mediaTimeoutError(timeoutMs));
    signal.addEventListener("abort", onAbort, { once: true });
    void operation.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

async function fetchValidatedMediaUrl(
  target: URL,
  addresses: string[],
  accept: string | undefined,
  signal: AbortSignal,
  dependencies: ResuxMediaFetchDependencies,
): Promise<Response> {
  const init: RequestInit = {
    headers: accept ? { accept } : undefined,
    redirect: "manual",
    signal,
  };
  if (dependencies.fetch) return dependencies.fetch(target, init);

  const cloudflare = dependencies.isCloudflareRuntime?.() ?? isCloudflareWorkersRuntime();
  if (!cloudflare && addresses.length > 0) {
    const pinnedFetch = dependencies.fetchPinnedNode ?? fetchPinnedNodeMediaUrl;
    let lastError: unknown;
    for (const address of addresses) {
      try {
        return await pinnedFetch(target, address, accept, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError ?? mediaError("network", "Failed to fetch media source.", 502);
  }

  if (typeof globalThis.fetch !== "function") {
    throw mediaError("network", "Fetch is unavailable in this runtime.", 502);
  }
  return globalThis.fetch(target, init);
}

function sourceTooLargeError(maxBytes: number): ResuxMediaFetchError {
  return mediaError(
    "too_large",
    `Media source exceeds the ${maxBytes}-byte safety limit.`,
    413,
  );
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const rawLength = response.headers.get("content-length");
  if (rawLength) {
    const contentLength = Number(rawLength);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw sourceTooLargeError(maxBytes);
    }
  }

  if (!response.body) {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > maxBytes) throw sourceTooLargeError(maxBytes);
    return body;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw sourceTooLargeError(maxBytes);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function cancelResponseBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

export async function fetchResuxMediaSource(
  sourceUrl: URL,
  options: {
    requestOrigin: string;
    accept?: string;
    maxBytes: number;
    timeoutMs?: number;
    trustedLoopbackPort?: number;
  },
  dependencies: ResuxMediaFetchDependencies = {},
): Promise<ResuxFetchedMediaSource> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? RESUX_MEDIA_FETCH_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let currentUrl = new URL(sourceUrl);

  try {
    for (let redirects = 0; redirects <= RESUX_MEDIA_MAX_REDIRECTS; redirects += 1) {
      const addresses = await raceAgainstAbort(
        assertSafeResuxMediaUrl(
          currentUrl,
          options.requestOrigin,
          dependencies.resolveAddresses ?? resolveHostnameAddresses,
          redirects === 0 ? options.trustedLoopbackPort : undefined,
        ),
        controller.signal,
        timeoutMs,
      );

      let response: Response;
      try {
        response = await fetchValidatedMediaUrl(
          currentUrl,
          addresses,
          options.accept,
          controller.signal,
          dependencies,
        );
      } catch (error) {
        if (controller.signal.aborted) throw mediaTimeoutError(timeoutMs);
        if (error instanceof ResuxMediaFetchError) throw error;
        throw mediaError(
          "network",
          error instanceof Error
            ? `Failed to fetch media source: ${error.message}`
            : "Failed to fetch media source.",
          502,
        );
      }

      if (isRedirectStatus(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          await cancelResponseBody(response);
          return { response, body: null, finalUrl: currentUrl };
        }
        await cancelResponseBody(response);
        if (redirects >= RESUX_MEDIA_MAX_REDIRECTS) {
          throw mediaError(
            "too_many_redirects",
            "Media source exceeded the redirect safety limit.",
            502,
          );
        }
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (!response.ok) {
        await cancelResponseBody(response);
        return { response, body: null, finalUrl: currentUrl };
      }

      const body = await readBodyWithLimit(response, options.maxBytes);
      return { response, body, finalUrl: currentUrl };
    }
  } catch (error) {
    if (controller.signal.aborted && !(error instanceof ResuxMediaFetchError)) {
      throw mediaTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  throw mediaError(
    "too_many_redirects",
    "Media source exceeded the redirect safety limit.",
    502,
  );
}
