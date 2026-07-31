import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateReportSignature } from "../src/halal-core/report/signReport.js";
import { isReportValid, verifyReportSignature } from "../src/halal-core/report/verifyReport.js";
import {
  generateReviewSignature,
  type SignedReviewApproval,
} from "../src/halal-core/review/signedReviewFile.js";
import { verifyReviewApproval } from "../src/halal-core/review/verifyReviewApproval.js";

const tempRoots: string[] = [];
const REPORT_SECRET = "resux-test-report-signing-secret-at-least-32-characters";
const REVIEW_SECRET = "resux-test-review-signing-secret-at-least-32-characters";

afterEach(async () => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("halal integrity regressions", () => {
  it("covers every report field with a canonical signature", () => {
    const report = createReport();
    const signed = {
      ...report,
      signature: generateReportSignature(report, REPORT_SECRET),
    };

    expect(verifyReportSignature(signed, {
      secret: REPORT_SECRET,
      requireAuthenticated: true,
    })).toBe(true);

    expect(verifyReportSignature({
      ...signed,
      matchedSnippets: ["changed after signing"],
    }, { secret: REPORT_SECRET })).toBe(false);

    expect(verifyReportSignature({
      ...signed,
      recommendedAction: "Changed after signing",
    }, { secret: REPORT_SECRET })).toBe(false);

    expect(verifyReportSignature({
      ...signed,
      createdDate: new Date(Date.now() + 60_000).toISOString(),
    }, { secret: REPORT_SECRET })).toBe(false);
  });

  it("rejects invalid and unexpectedly future report dates", () => {
    const invalidDateReport = createReport({ createdDate: "not-a-date" });
    const invalidSigned = {
      ...invalidDateReport,
      signature: generateReportSignature(invalidDateReport),
    };
    expect(isReportValid(invalidSigned).reason).toContain("invalid");

    const futureReport = createReport({
      createdDate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    const futureSigned = {
      ...futureReport,
      signature: generateReportSignature(futureReport),
    };
    expect(isReportValid(futureSigned).reason).toContain("future");
  });

  it("requires a private key for review approval signatures", () => {
    expect(() => generateReviewSignature(createApproval(), "")).toThrow(/must be configured/);
  });

  it("rejects approvals for another project or with invalid expiry", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resux-review-integrity-"));
    tempRoots.push(root);

    const approval = createApproval();
    const signed: SignedReviewApproval = {
      ...approval,
      signature: generateReviewSignature(approval, REVIEW_SECRET),
    };
    await writeFile(
      path.join(root, "halal-review-approval.json"),
      JSON.stringify(signed),
      "utf8",
    );

    expect(verifyReviewApproval(root, "review_required", {
      secret: REVIEW_SECRET,
      projectName: "Different project",
    }).approved).toBe(false);

    const invalidExpiry = { ...approval, expires: "not-a-date" };
    await writeFile(
      path.join(root, "halal-review-approval.json"),
      JSON.stringify({
        ...invalidExpiry,
        signature: generateReviewSignature(invalidExpiry, REVIEW_SECRET),
      }),
      "utf8",
    );

    expect(verifyReviewApproval(root, "review_required", {
      secret: REVIEW_SECRET,
      projectName: approval.projectName,
    }).reason).toContain("invalid");
  });
});

function createReport(overrides: Record<string, unknown> = {}) {
  return {
    status: "allowed" as const,
    riskLevel: "low" as const,
    categories: [],
    confidence: 1,
    reasons: [],
    matchedFiles: [],
    matchedSnippets: ["safe"],
    recommendedAction: "None",
    explanation: "Reviewed",
    createdDate: new Date().toISOString(),
    ...overrides,
  };
}

function createApproval(): Omit<SignedReviewApproval, "signature"> {
  return {
    projectName: "News World",
    status: "allowed",
    reasons: "Legitimate journalistic activities verified.",
    reviewerId: "reviewer-01",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    evidenceHash: "evidence-hash",
  };
}
