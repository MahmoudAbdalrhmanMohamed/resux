import type { HalalCheckResult } from "../status.js";
import { createIntegritySignature } from "../crypto/integrity.js";

const REPORT_SIGNING_ENV = "RESUX_HALAL_REPORT_SIGNING_SECRET";

export function generateReportSignature(
  report: Omit<HalalCheckResult, "signature">,
  secret?: string,
): string {
  return createIntegritySignature(report, {
    envName: REPORT_SIGNING_ENV,
    secret,
    requireSecret: true,
  });
}

export function generateReportChecksum(
  report: Omit<HalalCheckResult, "signature">,
): string {
  return createIntegritySignature(report, {
    envName: REPORT_SIGNING_ENV,
    secret: "",
    requireSecret: false,
  });
}
