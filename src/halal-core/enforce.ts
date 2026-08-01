import { scanProject } from "./scanner/scanProject.js";
import { evaluateRules } from "./rules/defaultBlockedRules.js";
import { loadProjectPolicy } from "./config.js";
import { formatTerminalReport } from "./report/formatTerminalReport.js";
import { generateHalalReport } from "./report/generateHalalReport.js";
import { createReviewEvidenceHash } from "./review/signedReviewFile.js";
import { verifyReviewApproval } from "./review/verifyReviewApproval.js";
import { checkOnDiskReportSignature } from "./tamper/verifyReportSignature.js";
import { verifyCoreIntegrity } from "./tamper/verifyCoreIntegrity.js";

export async function enforceDevGuard(appRoot: string, outDir: string): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  if (!verifyCoreIntegrity(appRoot)) {
    console.error("[resux-halal-core] Framework integrity compromised.");
    process.exit(1);
  }

  const policy = await loadProjectPolicy(appRoot);
  const scanned = scanProject(appRoot);
  const report = evaluateRules(scanned, policy);

  const isStrict = policy.halalAI?.strict === true;

  if (report.status === "review_required") {
    const checkReview = verifyReviewApproval(appRoot, report.status, {
      projectName: policy.projectName,
      evidenceHash: createReviewEvidenceHash(report),
    });
    if (!checkReview.approved) {
      console.error(formatTerminalReport(report));
      console.error(`\x1b[31m[resux-halal-core] Cannot start dev server: ${checkReview.reason}\x1b[0m`);
      process.exit(1);
    }
  } else if (report.status === "blocked") {
    console.error(formatTerminalReport(report));
    console.error("\x1b[31m[resux-halal-core] Cannot start dev server: Project violates safety policy.\x1b[0m");
    process.exit(1);
  } else if (report.status === "warning") {
    console.warn(formatTerminalReport(report));
    if (isStrict) {
      console.error("\x1b[31m[resux-halal-core] Dev startup blocked: Strict mode enabled and warnings found.\x1b[0m");
      process.exit(1);
    }
  }
}

export async function enforceBuildGuard(appRoot: string, outDir: string): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  if (!verifyCoreIntegrity(appRoot)) {
    console.error("[resux-halal-core] Framework integrity compromised.");
    process.exit(1);
  }

  const policy = await loadProjectPolicy(appRoot);
  const scanned = scanProject(appRoot);
  const report = generateHalalReport(scanned, policy, outDir);

  const blockProductionBuild = policy.halalAI?.blockProductionBuild !== false;
  const isStrict = policy.halalAI?.strict === true;

  if (report.status === "review_required") {
    const checkReview = verifyReviewApproval(appRoot, report.status, {
      projectName: policy.projectName,
      evidenceHash: createReviewEvidenceHash(report),
    });
    if (!checkReview.approved) {
      console.error(formatTerminalReport(report));
      console.error(`\x1b[31m[resux-halal-core] Build failed: ${checkReview.reason}\x1b[0m`);
      process.exit(1);
    }
  } else if (report.status === "blocked") {
    if (blockProductionBuild) {
      console.error(formatTerminalReport(report));
      console.error("\x1b[31m[resux-halal-core] Build failed: Project violates safety policy.\x1b[0m");
      process.exit(1);
    } else {
      console.warn(formatTerminalReport(report));
      console.warn("\x1b[33m[resux-halal-core] Warning: build-time safety violations found, proceeding due to blockProductionBuild = false.\x1b[0m");
    }
  } else if (report.status === "warning" && isStrict) {
    console.error(formatTerminalReport(report));
    console.error("\x1b[31m[resux-halal-core] Build failed: Strict mode enabled and warnings found.\x1b[0m");
    process.exit(1);
  }
}

export function enforcePreviewGuard(outDir: string): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  const check = checkOnDiskReportSignature(outDir);
  if (!check.valid) {
    console.error(`\x1b[31m[resux-halal-core] Preview rejected: ${check.reason}\x1b[0m`);
    process.exit(1);
  }
}

export function enforceProductionServerGuard(outDir: string): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  const check = checkOnDiskReportSignature(outDir, { requireAuthenticated: true });
  if (!check.valid) {
    console.error(`\x1b[31m[resux-halal-core] Production server startup rejected: ${check.reason}\x1b[0m`);
    process.exit(1);
  }
}

export function enforceDeploymentGuard(outDir: string): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  const check = checkOnDiskReportSignature(outDir, { requireAuthenticated: true });
  if (!check.valid) {
    console.error(`\x1b[31m[resux-halal-core] Deployment rejected: ${check.reason}\x1b[0m`);
    process.exit(1);
  }
}
