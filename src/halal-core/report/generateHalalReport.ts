import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { evaluateRules } from "../rules/defaultBlockedRules.js";
import { generateReportSignature } from "./signReport.js";
import type { HalalCheckResult } from "../status.js";
import type { ResuxHalalPolicy } from "../config.js";

export function generateHalalReport(
  scannedData: any,
  policy: ResuxHalalPolicy,
  outDir: string
): HalalCheckResult {
  const baseReport = evaluateRules(scannedData, policy);
  
  // Attach date and signature
  const createdDate = new Date().toISOString();
  const reportToSign: Omit<HalalCheckResult, "signature"> = {
    ...baseReport,
    createdDate
  };

  const signature = generateReportSignature(reportToSign);
  const finalReport: HalalCheckResult = {
    ...reportToSign,
    signature
  };

  // Write JSON report
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const reportPath = path.join(outDir, "halal-report.json");
  writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), "utf8");

  // Write Markdown summary report for humans
  const mdPath = path.join(outDir, "halal-report.md");
  const mdContent = `
# ResuxJS Halal Core Security Report

- **Generated At**: ${createdDate}
- **Framework Status**: **${finalReport.status.toUpperCase()}**
- **Risk Level**: **${finalReport.riskLevel.toUpperCase()}**
- **Confidence**: ${(finalReport.confidence * 100).toFixed(0)}%
- **Signature**: \`${signature}\`

## Categories Detected
${finalReport.categories.map(c => `- ${c}`).join("\n") || "No policy categories violated."}

## Reasons
${finalReport.reasons.map(r => `- ${r}`).join("\n") || "No warning elements flagged."}

## Action Required
${finalReport.recommendedAction}
  `.trim();

  writeFileSync(mdPath, mdContent, "utf8");

  return finalReport;
}
