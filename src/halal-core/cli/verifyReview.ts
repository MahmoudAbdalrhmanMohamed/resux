import { verifyReviewApproval } from "../review/verifyReviewApproval.js";
import { scanProject } from "../scanner/scanProject.js";
import { evaluateRules } from "../rules/defaultBlockedRules.js";
import { loadProjectPolicy } from "../config.js";

export async function runHalalVerifyReview(appRoot: string): Promise<boolean> {
  const policy = await loadProjectPolicy(appRoot);
  const scanned = scanProject(appRoot);
  const report = evaluateRules(scanned, policy);

  const check = verifyReviewApproval(appRoot, report.status);
  if (check.approved) {
    console.log("\x1b[32m[resux-halal-core] Review approval verified successfully.\x1b[0m");
    return true;
  } else {
    console.error(`\x1b[31m[resux-halal-core] Review approval verification failed: ${check.reason}\x1b[0m`);
    return false;
  }
}
