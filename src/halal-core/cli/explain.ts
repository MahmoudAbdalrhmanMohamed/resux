import { scanProject } from "../scanner/scanProject.js";
import { evaluateRules } from "../rules/defaultBlockedRules.js";
import { loadProjectPolicy } from "../config.js";

export async function runHalalExplain(appRoot: string): Promise<void> {
  const policy = await loadProjectPolicy(appRoot);
  const scanned = scanProject(appRoot);
  const report = evaluateRules(scanned, policy);

  console.log("\x1b[1mResux Halal Core Explanation Report\x1b[0m\n");
  console.log(`Final Decision: \x1b[1m${report.status.toUpperCase()}\x1b[0m`);
  console.log(`Risk Score: \x1b[1m${report.riskLevel.toUpperCase()}\x1b[0m`);
  console.log(`Confidence Level: ${(report.confidence * 100).toFixed(0)}%\n`);

  console.log("\x1b[1mDetailed Violations/Matches:\x1b[0m");
  if (report.reasons.length === 0) {
    console.log("No violations or warning points found in this project.");
    return;
  }

  for (let i = 0; i < report.reasons.length; i++) {
    console.log(`\nMatch #${i + 1}:`);
    console.log(`  - \x1b[33mReason\x1b[0m: ${report.reasons[i]}`);
    if (report.matchedFiles[i]) {
      console.log(`  - \x1b[34mFile\x1b[0m: ${report.matchedFiles[i]}`);
    }
    if (report.matchedSnippets[i]) {
      console.log(`  - \x1b[36mSnippet\x1b[0m: "${report.matchedSnippets[i]}"`);
    }
  }

  console.log("\n\x1b[1mResolution Guideline:\x1b[0m");
  if (report.status === "blocked") {
    console.log("To resolve this block, you must remove the flagged files, endpoints, or dependencies.");
  } else if (report.status === "review_required") {
    console.log("This project falls into a category requiring compliance review. Please submit a review request.");
  }
}
