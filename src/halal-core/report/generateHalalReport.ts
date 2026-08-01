import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { evaluateRules } from "../rules/defaultBlockedRules.js";
import {
  generateReportChecksum,
  generateReportSignature,
} from "./signReport.js";
import type { HalalCheckResult } from "../status.js";
import type { ResuxHalalPolicy } from "../config.js";

export interface GenerateHalalReportOptions {
  requireAuthenticated?: boolean;
  signingSecret?: string;
}

export function generateHalalReport(
  scannedData: any,
  policy: ResuxHalalPolicy,
  outDir: string,
  options: GenerateHalalReportOptions = {},
): HalalCheckResult {
  const baseReport = evaluateRules(scannedData, policy);

  const createdDate = new Date().toISOString();
  const reportToSign: Omit<HalalCheckResult, "signature"> = {
    ...baseReport,
    createdDate,
  };

  const signature = options.requireAuthenticated === true
    ? generateReportSignature(reportToSign, options.signingSecret)
    : generateReportChecksum(reportToSign);
  const finalReport: HalalCheckResult = {
    ...reportToSign,
    signature,
  };

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const reportPath = path.join(outDir, "halal-report.json");
  writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), "utf8");

  const mdPath = path.join(outDir, "halal-report.md");
  const mdContent = `
# ResuxJS Halal Core Security Report

- **Generated At**: ${createdDate}
- **Framework Status**: **${finalReport.status.toUpperCase()}**
- **Risk Level**: **${finalReport.riskLevel.toUpperCase()}**
- **Confidence**: ${(finalReport.confidence * 100).toFixed(0)}%
- **Signature**: \`${signature}\`

## Categories Detected
${finalReport.categories.map((category) => `- ${category}`).join("\n") || "No policy categories violated."}

## Reasons
${finalReport.reasons.map((reason) => `- ${reason}`).join("\n") || "No warning elements flagged."}

## Action Required
${finalReport.recommendedAction}
  `.trim();

  writeFileSync(mdPath, mdContent, "utf8");

  return finalReport;
}
