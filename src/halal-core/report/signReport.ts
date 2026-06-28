import { createHmac } from "node:crypto";
import type { HalalCheckResult } from "../status.js";

const SIGNING_SECRET = "resuxjs-halal-core-secret-signature-salt-2026";

export function generateReportSignature(report: Omit<HalalCheckResult, "signature">): string {
  const contentToSign = [
    report.status,
    report.riskLevel,
    report.categories.join(","),
    report.confidence.toString(),
    report.reasons.join("|"),
    report.matchedFiles.join(",")
  ].join("::");

  return createHmac("sha256", SIGNING_SECRET)
    .update(contentToSign)
    .digest("hex");
}
