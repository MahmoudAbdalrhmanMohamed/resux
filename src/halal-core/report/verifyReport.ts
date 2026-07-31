import type { HalalCheckResult } from "../status.js";
import {
  isAuthenticatedIntegritySignature,
  verifyIntegritySignature,
} from "../crypto/integrity.js";

const REPORT_SIGNING_ENV = "RESUX_HALAL_REPORT_SIGNING_SECRET";
const REPORT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface ReportVerificationOptions {
  secret?: string;
  requireAuthenticated?: boolean;
  now?: number;
}

export function verifyReportSignature(
  report: HalalCheckResult,
  options: ReportVerificationOptions = {},
): boolean {
  if (!report || typeof report !== "object" || !report.signature) {
    return false;
  }

  const { signature, ...rest } = report;
  return verifyIntegritySignature(rest, signature, {
    envName: REPORT_SIGNING_ENV,
    secret: options.secret,
    requireSecret: options.requireAuthenticated === true,
  });
}

export function isReportValid(
  report: HalalCheckResult,
  options: ReportVerificationOptions = {},
): { valid: boolean; reason?: string } {
  if (!report || typeof report !== "object") {
    return { valid: false, reason: "No report provided." };
  }

  if (!verifyReportSignature(report, options)) {
    return { valid: false, reason: "Report integrity check is invalid or the report has been modified." };
  }

  if (options.requireAuthenticated === true && !isAuthenticatedIntegritySignature(report.signature)) {
    return { valid: false, reason: "Report requires an authenticated HMAC signature." };
  }

  if (report.status === "blocked") {
    return { valid: false, reason: `Project is blocked: ${report.reasons.join(", ")}` };
  }

  if (typeof report.createdDate !== "string" || !report.createdDate.trim()) {
    return { valid: false, reason: "Report creation date is missing." };
  }

  const createdAt = Date.parse(report.createdDate);
  if (!Number.isFinite(createdAt)) {
    return { valid: false, reason: "Report creation date is invalid." };
  }

  const now = options.now ?? Date.now();
  if (createdAt > now + MAX_CLOCK_SKEW_MS) {
    return { valid: false, reason: "Report creation date is unexpectedly in the future." };
  }
  if (now - createdAt > REPORT_MAX_AGE_MS) {
    return { valid: false, reason: "Report has expired (must be re-generated within 30 days)." };
  }

  return { valid: true };
}
