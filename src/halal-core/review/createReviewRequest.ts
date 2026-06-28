import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { scanProject } from "../scanner/scanProject.js";
import { createProjectSummary } from "../ai/createProjectSummary.js";
import type { ResuxHalalPolicy } from "../config.js";

export function createReviewRequest(
  appRoot: string,
  policy: ResuxHalalPolicy,
  outDir: string
): string {
  const scanned = scanProject(appRoot);
  const summary = createProjectSummary(scanned);

  const requestPayload = {
    projectName: policy.projectName || summary.projectName,
    projectType: policy.projectType || "unknown",
    description: policy.description || summary.projectDescription,
    reviewContact: policy.reviewContact || {},
    evidence: policy.evidence || [],
    projectSummary: summary,
    timestamp: new Date().toISOString()
  };

  const targetPath = path.join(outDir, "halal-review-request.json");
  writeFileSync(targetPath, JSON.stringify(requestPayload, null, 2), "utf8");

  return targetPath;
}
