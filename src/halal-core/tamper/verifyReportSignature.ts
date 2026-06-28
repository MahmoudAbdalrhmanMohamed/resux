import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isReportValid } from "../report/verifyReport.js";

export function checkOnDiskReportSignature(outDir: string): { valid: boolean; reason?: string } {
  const reportPath = path.join(outDir, "halal-report.json");
  if (!existsSync(reportPath)) {
    return { valid: false, reason: "Halal Core report file is missing." };
  }

  try {
    const content = JSON.parse(readFileSync(reportPath, "utf8"));
    return isReportValid(content);
  } catch (err: any) {
    return { valid: false, reason: `Failed to read or parse Halal Core report: ${err.message}` };
  }
}
