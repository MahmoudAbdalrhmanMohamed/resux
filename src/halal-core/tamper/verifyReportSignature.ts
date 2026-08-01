import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  isReportValid,
  type ReportVerificationOptions,
} from "../report/verifyReport.js";

export function checkOnDiskReportSignature(
  outDir: string,
  options: ReportVerificationOptions = {},
): { valid: boolean; reason?: string } {
  const reportPath = path.join(outDir, "halal-report.json");
  if (!existsSync(reportPath)) {
    return { valid: false, reason: "Halal Core report file is missing." };
  }

  try {
    const content = JSON.parse(readFileSync(reportPath, "utf8"));
    return isReportValid(content, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, reason: `Failed to read or parse Halal Core report: ${message}` };
  }
}
