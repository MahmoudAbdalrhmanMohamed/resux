import type { HalalCheckResult } from "../status.js";

export function formatTerminalReport(report: HalalCheckResult): string {
  const lines: string[] = [];

  if (report.status === "blocked") {
    lines.push("\x1b[31m\x1b[1mResux Halal Core blocked this project.\x1b[0m\n");
  } else if (report.status === "review_required") {
    lines.push("\x1b[33m\x1b[1mResux Halal Core review required for this project.\x1b[0m\n");
  } else if (report.status === "warning") {
    lines.push("\x1b[33mResux Halal Core warning issue.\x1b[0m\n");
  } else {
    lines.push("\x1b[32mResux Halal Core checks passed successfully.\x1b[0m\n");
  }

  lines.push(`Status: ${report.status}`);
  lines.push(`Risk Level: ${report.riskLevel}`);
  lines.push(`Category: ${report.categories.join(", ") || "none"}`);
  lines.push(`Confidence: ${(report.confidence * 100).toFixed(0)}%`);
  
  if (report.matchedFiles.length > 0) {
    lines.push("\nDetected:");
    report.matchedFiles.slice(0, 10).forEach(file => {
      lines.push(`- ${file}`);
    });
    if (report.matchedFiles.length > 10) {
      lines.push(`- ...and ${report.matchedFiles.length - 10} more files`);
    }
  }

  lines.push("\nReason:");
  if (report.reasons.length > 0) {
    report.reasons.forEach(r => lines.push(`- ${r}`));
  } else {
    lines.push("No policy infractions triggered.");
  }

  lines.push("\nAction:");
  lines.push(report.recommendedAction);

  return lines.join("\n");
}
