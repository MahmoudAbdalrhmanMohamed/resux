import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { generateReviewSignature, type SignedReviewApproval } from "./signedReviewFile.js";

export function verifyReviewApproval(
  appRoot: string,
  currentStatus: string
): { approved: boolean; reason?: string } {
  // If the status is already allowed/warning, we don't need a review approval
  if (currentStatus === "allowed" || currentStatus === "warning") {
    return { approved: true };
  }

  // A review approval CANNOT approve a clearly blocked project!
  if (currentStatus === "blocked") {
    return { approved: false, reason: "Review approvals cannot override clearly blocked projects." };
  }

  const approvalPath = path.join(appRoot, "halal-review-approval.json");
  if (!existsSync(approvalPath)) {
    return { approved: false, reason: "No review approval file found (halal-review-approval.json)." };
  }

  try {
    const raw = readFileSync(approvalPath, "utf8");
    const approval: SignedReviewApproval = JSON.parse(raw);

    const { signature, ...rest } = approval;
    const recalculated = generateReviewSignature(rest);

    if (recalculated !== signature) {
      return { approved: false, reason: "Review approval file signature is invalid or tampered." };
    }

    const expiryDate = new Date(approval.expires);
    if (expiryDate.getTime() < Date.now()) {
      return { approved: false, reason: `Review approval has expired on ${approval.expires}.` };
    }

    return { approved: true };
  } catch (err: any) {
    return { approved: false, reason: `Failed to read or parse review approval: ${err.message}` };
  }
}
