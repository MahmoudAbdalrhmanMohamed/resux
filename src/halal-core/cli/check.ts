import { scanProject } from "../scanner/scanProject.js";
import { evaluateRules } from "../rules/defaultBlockedRules.js";
import { loadProjectPolicy } from "../config.js";
import { formatTerminalReport } from "../report/formatTerminalReport.js";
import { verifyReviewApproval } from "../review/verifyReviewApproval.js";

export async function runHalalCheck(appRoot: string, outDir: string): Promise<boolean> {
  const policy = await loadProjectPolicy(appRoot);
  const scanned = scanProject(appRoot);
  const report = evaluateRules(scanned, policy);

  let verified = true;
  let reviewMsg = "";

  if (report.status === "review_required") {
    const checkReview = verifyReviewApproval(appRoot, report.status);
    if (checkReview.approved) {
      report.status = "allowed"; // Upgraded since review is approved!
      report.recommendedAction = "Review approval verified. Project build allowed.";
    } else {
      verified = false;
      reviewMsg = checkReview.reason || "Review approval required.";
    }
  } else if (report.status === "blocked") {
    verified = false;
  }

  const output = formatTerminalReport(report);
  console.log(output);

  if (!verified) {
    if (reviewMsg) {
      console.error(`\x1b[31m[resux-halal-core] Compliance check failed: ${reviewMsg}\x1b[0m`);
    }
    return false;
  }

  return true;
}
