import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
}

async function resolveHostnameAddresses(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%", 1)[0] ?? "";
  const family = isIP(normalized);
  if (family === 4) {
    return isPrivateIpv4(normalized);
  }
  if (family === 6) {
    return isPrivateIpv6(normalized);
  }
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
  if (!segments) {
    return true;
  }

  const allZero = segments.every((segment) => segment === 0);
  const loopback = segments.slice(0, 7).every((segment) => segment === 0) && segments[7] === 1;
  if (allZero || loopback) {
    return true;
  }

  const first = segments[0] ?? 0;
  if ((first & 0xfe00) === 0xfc00
    || (first & 0xffc0) === 0xfe80
    || (first & 0xff00) === 0xff00
    || (first === 0x2001 && segments[1] === 0x0db8)) {
    return true;
  }

  const ipv4Mapped = segments.slice(0, 5).every((segment) => segment === 0)
    && segments[5] === 0xffff;
  const ipv4Compatible = segments.slice(0, 6).every((segment) => segment === 0);
  if (ipv4Mapped || ipv4Compatible) {
    const ipv4 = `${(segments[6] ?? 0) >> 8}.${(segments[6] ?? 0) & 0xff}.${(segments[7] ?? 0) >> 8}.${(segments[7] ?? 0) & 0xff}`;
    return isPrivateIpv4(ipv4);
  }

  return false;
}

function expandIpv6(address: string): number[] | null {
  let input = address;
  let ipv4Tail: number[] = [];
  const lastColon = input.lastIndexOf(":");
  const possibleIpv4 = lastColon >= 0 ? input.slice(lastColon + 1) : input;
  if (possibleIpv4.includes(".")) {
    if (isIP(possibleIpv4) !== 4) {
      return null;
    }
    const octets = possibleIpv4.split(".").map(Number);
    ipv4Tail = [
      ((octets[0] ?? 0) << 8) | (octets[1] ?? 0),
      ((octets[2] ?? 0) << 8) | (octets[3] ?? 0),
    ];
    input = input.slice(0, lastColon) + ":ipv4";
  }

  const halves = input.split("::");
  if (halves.length > 2) {
    return null;
  }
  const parseHalf = (value: string): number[] | null => {
    if (!value) return [];
    const parts = value.split(":");
    const parsed: number[] = [];
    for (const part of parts) {
      if (part === "ipv4") {
        parsed.push(...ipv4Tail);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/i.test(part)) {
        return null;
      }
      parsed.push(Number.parseInt(part, 16));
    }
    return parsed;
  };

  const left = parseHalf(halves[0] ?? "");
  const right = parseHalf(halves[1] ?? "");
  if (!left || !right) {
    return null;
  }
  if (halves.length === 1) {
    return left.length === 8 ? left : null;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 1) {
    return null;
  }
  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

function hostnameNeedsDnsValidation(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return isIP(normalized) === 0;
}

export async function assertSafeResuxMediaUrl(
  target: URL,
  requestOrigin: string,
  resolveAddresses: (hostname: string) => Promise<string[]> = resolveHostnameAddresses,
): Promise<void> {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new ResuxMediaFetchError("unsafe_url", "Media sources must use HTTP or HTTPS.", 400);
  }
  if (target.username || target.password) {
    throw new ResuxMediaFetchError("unsafe_url", "Media source URLs cannot contain credentials.", 400);
  }

  let origin: URL | null = null;
  try {
    origin = new URL(requestOrigin);
  } catch {
    // Treat malformed request origins as untrusted rather than skipping checks.
  }
  if (origin && target.origin === origin.origin) {
    return;
  }

  const hostname = target.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")) {
    throw new ResuxMediaFetchError("unsafe_url", "Media source resolves to a local or private network target.", 400);
  }

  if (!hostnameNeedsDnsValidation(hostname)) {
    if (isPrivateNetworkAddress(hostname)) {
      throw new ResuxMediaFetchError("unsafe_url", "Media source resolves to a local or private network target.", 400);
    }
    return;
  }

  let addresses: string[];
  try {
    addresses = await resolveAddresses(hostname);
  } catch {
    throw new ResuxMediaFetchError("network", "Media source hostname could not be resolved.", 502);
  }
  if (addresses.length === 0 || addresses.some(isPrivateNetworkAddress)) {
    throw new ResuxMediaFetchError("unsafe_url", "Media source resolves to a local or private network target.", 400);
  }
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const rawLength = response.headers.get("content-length");
  if (rawLength) {
    const contentLength = Number(rawLength);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new ResuxMediaFetchError(
        "too_large",
        `Media source exceeds the ${maxBytes}-byte safety limit.`,
        413,
      );
    }
  }

  if (!response.body) {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > maxBytes) {
      throw new ResuxMediaFetchError(
        "too_large",
        `Media source exceeds the ${maxBytes}-byte safety limit.`,
        413,
      );
    }
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
        throw new ResuxMediaFetchError(
          "too_large",
          `Media source exceeds the ${maxBytes}-byte safety limit.`,
          413,
        );
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

export async function fetchResuxMediaSource(
  sourceUrl: URL,
  options: {
    requestOrigin: string;
    accept?: string;
    maxBytes: number;
    timeoutMs?: number;
  },
  dependencies: ResuxMediaFetchDependencies = {},
): Promise<ResuxFetchedMediaSource> {
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new ResuxMediaFetchError("network", "Fetch is unavailable in this runtime.", 502);
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? RESUX_MEDIA_FETCH_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let currentUrl = new URL(sourceUrl);

  try {
    for (let redirects = 0; redirects <= RESUX_MEDIA_MAX_REDIRECTS; redirects += 1) {
      await assertSafeResuxMediaUrl(
        currentUrl,
        options.requestOrigin,
        dependencies.resolveAddresses ?? resolveHostnameAddresses,
      );

      let response: Response;
      try {
        response = await fetchImpl(currentUrl, {
          headers: options.accept ? { accept: options.accept } : undefined,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new ResuxMediaFetchError(
            "timeout",
            `Media source request timed out after ${timeoutMs}ms.`,
            504,
          );
        }
        throw new ResuxMediaFetchError(
          "network",
          error instanceof Error ? `Failed to fetch media source: ${error.message}` : "Failed to fetch media source.",
          502,
        );
      }

      if (isRedirectStatus(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return { response, body: null, finalUrl: currentUrl };
        }
        if (redirects >= RESUX_MEDIA_MAX_REDIRECTS) {
          throw new ResuxMediaFetchError(
            "too_many_redirects",
            "Media source exceeded the redirect safety limit.",
            502,
          );
        }
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      const body = response.ok ? await readBodyWithLimit(response, options.maxBytes) : null;
      return { response, body, finalUrl: currentUrl };
    }
  } catch (error) {
    if (controller.signal.aborted && !(error instanceof ResuxMediaFetchError)) {
      throw new ResuxMediaFetchError(
        "timeout",
        `Media source request timed out after ${timeoutMs}ms.`,
        504,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  throw new ResuxMediaFetchError("too_many_redirects", "Media source exceeded the redirect safety limit.", 502);
}
