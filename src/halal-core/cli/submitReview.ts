import { createReviewRequest } from "../review/createReviewRequest.js";
import { loadProjectPolicy } from "../config.js";
import path from "node:path";

export async function runHalalSubmitReview(appRoot: string, outDir: string): Promise<string> {
  const policy = await loadProjectPolicy(appRoot);
  const requestPath = createReviewRequest(appRoot, policy, outDir);

  console.log(`\x1b[32m[resux-halal-core] Prepared compliance review request bundle at:\x1b[0m`);
  console.log(`  ${requestPath}`);
  console.log(`\nPlease submit this file to your organization's compliance authority.`);
  console.log("Upon approval, you will receive a signed halal-review-approval.json file to place in the project root.");

  return requestPath;
}
