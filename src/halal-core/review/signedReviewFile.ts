import {
  createIntegritySignature,
  verifyIntegritySignature,
} from "../crypto/integrity.js";

export interface SignedReviewApproval {
  projectName: string;
  status: "allowed" | "review_required";
  reasons: string;
  reviewerId: string;
  signature: string;
  expires: string;
  evidenceHash: string;
}

const REVIEW_SIGNING_ENV = "RESUX_HALAL_REVIEW_SIGNING_SECRET";

export function generateReviewSignature(
  approval: Omit<SignedReviewApproval, "signature">,
  secret?: string,
): string {
  return createIntegritySignature(approval, {
    envName: REVIEW_SIGNING_ENV,
    secret,
    requireSecret: true,
  });
}

export function verifyReviewSignature(
  approval: SignedReviewApproval,
  secret?: string,
): boolean {
  if (!approval || typeof approval !== "object" || !approval.signature) {
    return false;
  }
  const { signature, ...rest } = approval;
  return verifyIntegritySignature(rest, signature, {
    envName: REVIEW_SIGNING_ENV,
    secret,
    requireSecret: true,
  });
}
