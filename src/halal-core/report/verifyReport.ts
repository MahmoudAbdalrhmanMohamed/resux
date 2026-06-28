import { generateReportSignature } from "./signReport.js";
import type { HalalCheckResult } from "../status.js";

export function verifyReportSignature(report: HalalCheckResult): boolean {
  if (!report || !report.signature) {
    return false;
  }

  const { signature, ...rest } = report;
  const recalculated = generateReportSignature(rest);
  return recalculated === signature;
}

export function isReportValid(report: HalalCheckResult): { valid: boolean; reason?: string } {
  if (!report) {
    return { valid: false, reason: "No report provided." };
  }

  if (!verifyReportSignature(report)) {
    return { valid: false, reason: "Report signature is invalid or has been tampered with." };
  }

  if (report.status === "blocked") {
    return { valid: false, reason: `Project is blocked: ${report.reasons.join(", ")}` };
  }

  // Optional: check created date (expiration check e.g. 30 days for builds)
  if (report.createdDate) {
    const created = new Date(report.createdDate);
    const ageInDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 30) {
      return { valid: false, reason: "Report has expired (must be re-generated within 30 days)." };
    }
  }

  return { valid: true };
}
