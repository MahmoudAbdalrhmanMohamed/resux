import { createHash } from "node:crypto";
import {
  createIntegritySignature,
  verifyIntegritySignature,
} from "../crypto/integrity.js";
import { serializeRuntimeContentCanonical } from "./serializeRuntimeContent.js";
import type {
  HalalRuntimeContent,
  HalalRuntimeReviewInput,
  SignedHalalRuntimeDecision,
} from "./types.js";

const REVIEW_SECRET_ENV = "RESUX_HALAL_REVIEW_SECRET";
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const STATUS_RANK: Record<SignedHalalRuntimeDecision["status"], number> = {
  allowed: 0,
  warning: 1,
  review_required: 2,
  blocked: 3,
};

export function createRuntimeContentFingerprint(
  content: HalalRuntimeContent,
  _maxContentCharacters?: number,
): string {
  const canonical = serializeRuntimeContentCanonical(content);
  return createHash("sha256").update(canonical).digest("hex");
}

export function createSignedHalalRuntimeDecision(
  content: HalalRuntimeContent,
  review: HalalRuntimeReviewInput,
  secret?: string,
): SignedHalalRuntimeDecision {
  const createdAt = new Date();
  const unsigned = {
    version: 1 as const,
    fingerprint: createRuntimeContentFingerprint(content),
    status: review.status,
    categories: normalizeCategories(review.categories),
    reason: requireText(review.reason, "Review reason"),
    reviewerId: requireText(review.reviewerId, "Reviewer ID"),
    createdAt: createdAt.toISOString(),
    ...(review.expiresAt
      ? { expiresAt: validateFutureDate(review.expiresAt, "Review expiry", createdAt.getTime()) }
      : {}),
  };

  return {
    ...unsigned,
    signature: createIntegritySignature(unsigned, {
      envName: REVIEW_SECRET_ENV,
      secret,
      requireSecret: true,
    }),
  };
}

export function verifySignedHalalRuntimeDecision(
  decision: unknown,
  secret?: string,
): decision is SignedHalalRuntimeDecision {
  if (!isRecord(decision) || decision.version !== 1 || typeof decision.signature !== "string") {
    return false;
  }
  if (!isValidStatus(decision.status)
    || typeof decision.fingerprint !== "string"
    || !/^[a-f0-9]{64}$/.test(decision.fingerprint)
    || typeof decision.reason !== "string"
    || !decision.reason.trim()
    || typeof decision.reviewerId !== "string"
    || !decision.reviewerId.trim()
    || typeof decision.createdAt !== "string"
    || !Array.isArray(decision.categories)
    || decision.categories.some((entry) => typeof entry !== "string")) {
    return false;
  }

  const createdAt = Date.parse(decision.createdAt);
  if (!Number.isFinite(createdAt) || createdAt > Date.now() + MAX_CLOCK_SKEW_MS) {
    return false;
  }
  if (decision.expiresAt !== undefined) {
    if (typeof decision.expiresAt !== "string") {
      return false;
    }
    const expiresAt = Date.parse(decision.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt <= createdAt) {
      return false;
    }
  }

  const { signature, ...unsigned } = decision;
  return verifyIntegritySignature(unsigned, signature, {
    envName: REVIEW_SECRET_ENV,
    secret,
    requireSecret: true,
  });
}

export function findReviewedRuntimeDecision(
  content: HalalRuntimeContent,
  decisions: readonly SignedHalalRuntimeDecision[] | undefined,
  secret?: string,
  _maxContentCharacters?: number,
): SignedHalalRuntimeDecision | undefined {
  if (!decisions?.length) {
    return undefined;
  }

  const fingerprint = createRuntimeContentFingerprint(content);
  let selected: SignedHalalRuntimeDecision | undefined;

  for (const decision of decisions) {
    if (decision.fingerprint !== fingerprint
      || !verifySignedHalalRuntimeDecision(decision, secret)) {
      continue;
    }
    if (!selected || isNewerOrStricter(decision, selected)) {
      selected = decision;
    }
  }

  return selected;
}

function isNewerOrStricter(
  candidate: SignedHalalRuntimeDecision,
  current: SignedHalalRuntimeDecision,
): boolean {
  const candidateCreatedAt = Date.parse(candidate.createdAt);
  const currentCreatedAt = Date.parse(current.createdAt);
  if (candidateCreatedAt !== currentCreatedAt) {
    return candidateCreatedAt > currentCreatedAt;
  }
  return STATUS_RANK[candidate.status] > STATUS_RANK[current.status];
}

function normalizeCategories(categories: string[] | undefined): string[] {
  if (!categories) return [];
  return [...new Set(categories.map((entry) => entry.trim()).filter(Boolean))].slice(0, 50);
}

function requireText(value: string, label: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized.slice(0, 2_000);
}

function validateFutureDate(value: string, label: string, createdAt: number): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} must be a valid date.`);
  }
  if (timestamp <= createdAt) {
    throw new Error(`${label} must be later than the review creation time.`);
  }
  return new Date(timestamp).toISOString();
}

function isValidStatus(value: unknown): value is SignedHalalRuntimeDecision["status"] {
  return value === "allowed"
    || value === "warning"
    || value === "review_required"
    || value === "blocked";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
