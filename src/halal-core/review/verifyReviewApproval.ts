import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  verifyReviewSignature,
  type SignedReviewApproval,
} from "./signedReviewFile.js";

export interface ReviewApprovalVerificationOptions {
  secret?: string;
  projectName?: string;
  evidenceHash?: string;
  now?: number;
}

export function verifyReviewApproval(
  appRoot: string,
  currentStatus: string,
  options: ReviewApprovalVerificationOptions = {},
): { approved: boolean; reason?: string } {
  if (currentStatus === "allowed" || currentStatus === "warning") {
    return { approved: true };
  }

  if (currentStatus === "blocked") {
    return { approved: false, reason: "Review approvals cannot override clearly blocked projects." };
  }

  const expectedProjectName = options.projectName?.trim();
  if (!expectedProjectName) {
    return { approved: false, reason: "Review approval verification requires the current project name." };
  }
  const expectedEvidenceHash = options.evidenceHash?.trim();
  if (!expectedEvidenceHash) {
    return { approved: false, reason: "Review approval verification requires the current project evidence hash." };
  }

  const approvalPath = path.join(appRoot, "halal-review-approval.json");
  if (!existsSync(approvalPath)) {
    return { approved: false, reason: "No review approval file found (halal-review-approval.json)." };
  }

  try {
    const raw = readFileSync(approvalPath, "utf8");
    const approval = JSON.parse(raw) as SignedReviewApproval;

    if (!isValidApprovalShape(approval)) {
      return { approved: false, reason: "Review approval file has an invalid structure." };
    }
    if (approval.status !== "allowed") {
      return { approved: false, reason: "Review approval must explicitly grant allowed status." };
    }
    if (!verifyReviewSignature(approval, options.secret)) {
      return { approved: false, reason: "Review approval signature is invalid or cannot be authenticated." };
    }
    if (approval.projectName !== expectedProjectName) {
      return { approved: false, reason: "Review approval belongs to a different project." };
    }
    if (approval.evidenceHash !== expectedEvidenceHash) {
      return { approved: false, reason: "Review approval evidence does not match the current project scan." };
    }

    const expiryTime = Date.parse(approval.expires);
    if (!Number.isFinite(expiryTime)) {
      return { approved: false, reason: "Review approval expiry date is invalid." };
    }
    if (expiryTime <= (options.now ?? Date.now())) {
      return { approved: false, reason: `Review approval has expired on ${approval.expires}.` };
    }

    return { approved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { approved: false, reason: `Failed to read or parse review approval: ${message}` };
  }
}

function isValidApprovalShape(value: unknown): value is SignedReviewApproval {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const approval = value as Record<string, unknown>;
  return typeof approval.projectName === "string"
    && (approval.status === "allowed" || approval.status === "review_required")
    && typeof approval.reasons === "string"
    && typeof approval.reviewerId === "string"
    && typeof approval.signature === "string"
    && typeof approval.expires === "string"
    && typeof approval.evidenceHash === "string";
}
