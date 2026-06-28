export interface SignedReviewApproval {
  projectName: string;
  status: "allowed" | "review_required";
  reasons: string;
  reviewerId: string;
  signature: string;
  expires: string;
  evidenceHash: string;
}

const REVIEW_SIGNING_SECRET = "resuxjs-halal-core-review-secret-key-2026";

import { createHmac } from "node:crypto";

export function generateReviewSignature(approval: Omit<SignedReviewApproval, "signature">): string {
  const content = [
    approval.projectName,
    approval.status,
    approval.reasons,
    approval.reviewerId,
    approval.expires,
    approval.evidenceHash
  ].join("::");

  return createHmac("sha256", REVIEW_SIGNING_SECRET)
    .update(content)
    .digest("hex");
}
