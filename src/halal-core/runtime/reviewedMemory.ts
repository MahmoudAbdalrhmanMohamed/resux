import { createHash } from "node:crypto";
import {
  createIntegritySignature,
  verifyIntegritySignature,
} from "../crypto/integrity.js";
import { serializeRuntimeContent } from "./serializeRuntimeContent.js";
import type {
  HalalRuntimeContent,
  HalalRuntimeReviewInput,
  SignedHalalRuntimeDecision,
} from "./types.js";

const REVIEW_SECRET_ENV = "RESUX_HALAL_REVIEW_SECRET";

export function createRuntimeContentFingerprint(
  content: HalalRuntimeContent,
  maxContentCharacters?: number,
): string {
  const serialized = serializeRuntimeContent(content, maxContentCharacters);
  return createHash("sha256").update(serialized).digest("hex");
}

export function createSignedHalalRuntimeDecision(
  content: HalalRuntimeContent,
  review: HalalRuntimeReviewInput,
  secret?: string,
): SignedHalalRuntimeDecision {
  const unsigned = {
    version: 1 as const,
    fingerprint: createRuntimeContentFingerprint(content),
    status: review.status,
    categories: normalizeCategories(review.categories),
    reason: requireText(review.reason, "Review reason"),
    reviewerId: requireText(review.reviewerId, "Reviewer ID"),
    createdAt: new Date().toISOString(),
    ...(review.expiresAt ? { expiresAt: validateDate(review.expiresAt, "Review expiry") } : {}),
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
    || !Array.isArray(decision.categories)
    || decision.categories.some((entry) => typeof entry !== "string")) {
    return false;
  }

  const createdAt = Date.parse(String(decision.createdAt));
  if (!Number.isFinite(createdAt)) {
    return false;
  }
  if (decision.expiresAt !== undefined) {
    const expiresAt = Date.parse(String(decision.expiresAt));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
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
  maxContentCharacters?: number,
): SignedHalalRuntimeDecision | undefined {
  if (!decisions?.length) {
    return undefined;
  }

  const fingerprint = createRuntimeContentFingerprint(content, maxContentCharacters);
  return decisions.find((decision) =>
    decision.fingerprint === fingerprint
    && verifySignedHalalRuntimeDecision(decision, secret));
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

function validateDate(value: string, label: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return new Date(timestamp).toISOString();
}

function isValidStatus(value: unknown): boolean {
  return value === "allowed"
    || value === "warning"
    || value === "review_required"
    || value === "blocked";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
