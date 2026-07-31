import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface IntegrityOptions {
  envName: string;
  secret?: string;
  requireSecret?: boolean;
}

export function createIntegritySignature(value: unknown, options: IntegrityOptions): string {
  const payload = stableSerialize(value);
  const secret = resolveIntegritySecret(options);

  if (secret) {
    const digest = createHmac("sha256", secret).update(payload).digest("hex");
    return `hmac-sha256:${digest}`;
  }

  const digest = createHash("sha256").update(payload).digest("hex");
  return `sha256:${digest}`;
}

export function verifyIntegritySignature(
  value: unknown,
  signature: unknown,
  options: IntegrityOptions,
): boolean {
  if (typeof signature !== "string") {
    return false;
  }

  const separator = signature.indexOf(":");
  if (separator <= 0) {
    return false;
  }

  const algorithm = signature.slice(0, separator);
  if (algorithm !== "hmac-sha256" && algorithm !== "sha256") {
    return false;
  }
  if (options.requireSecret === true && algorithm !== "hmac-sha256") {
    return false;
  }

  let expected: string;
  try {
    if (algorithm === "hmac-sha256") {
      expected = createIntegritySignature(value, { ...options, requireSecret: true });
    } else {
      expected = createIntegritySignature(value, { ...options, secret: undefined, requireSecret: false });
    }
  } catch {
    return false;
  }

  return constantTimeEqual(expected, signature);
}

export function isAuthenticatedIntegritySignature(signature: unknown): boolean {
  return typeof signature === "string" && signature.startsWith("hmac-sha256:");
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeJsonValue(value));
}

function resolveIntegritySecret(options: IntegrityOptions): string | undefined {
  const secret = options.secret ?? process.env[options.envName];
  if (secret === undefined || secret === "") {
    if (options.requireSecret === true) {
      throw new Error(
        `${options.envName} must be configured with at least 32 characters before creating authenticated signatures.`,
      );
    }
    return undefined;
  }

  if (secret.length < 32) {
    throw new Error(`${options.envName} must contain at least 32 characters.`);
  }
  return secret;
}

function normalizeJsonValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Integrity payloads cannot contain non-finite numbers.");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => entry === undefined ? null : normalizeJsonValue(entry));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const entry = (value as Record<string, unknown>)[key];
      if (entry !== undefined) {
        output[key] = normalizeJsonValue(entry);
      }
    }
    return output;
  }
  throw new Error(`Integrity payloads must be JSON-serializable; received ${typeof value}.`);
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
