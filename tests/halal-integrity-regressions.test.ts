import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createIntegritySignature,
  stableSerialize,
  verifyIntegritySignature,
} from "../src/halal-core/crypto/integrity.js";
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

  it("covers own __proto__ fields with canonical signatures", () => {
    const original = JSON.parse('{"__proto__":{"role":"reader"},"status":"allowed"}') as Record<string, unknown>;
    const tampered = JSON.parse('{"__proto__":{"role":"admin"},"status":"allowed"}') as Record<string, unknown>;
    const options = {
      envName: "RESUX_TEST_INTEGRITY_SECRET",
      secret: REPORT_SECRET,
      requireSecret: true,
    };
    const signature = createIntegritySignature(original, options);

    expect(stableSerialize(original)).toContain('"__proto__":{"role":"reader"}');
    expect(verifyIntegritySignature(original, signature, options)).toBe(true);
    expect(verifyIntegritySignature(tampered, signature, options)).toBe(false);
  });

  it("rejects invalid and unexpectedly future report dates", () => {
    const invalidDateReport = createReport({ createdDate: "not-a-date" });
    const invalidSigned = {
      ...invalidDateReport,
      signature: generateReportSignature(invalidDateReport, REPORT_SECRET),
    };
    expect(isReportValid(invalidSigned, { secret: REPORT_SECRET }).reason).toContain("invalid");

    const futureReport = createReport({
      createdDate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    const futureSigned = {
      ...futureReport,
      signature: generateReportSignature(futureReport, REPORT_SECRET),
    };
    expect(isReportValid(futureSigned, { secret: REPORT_SECRET }).reason).toContain("future");
  });

  it("requires a private key for review approval signatures", () => {
    expect(() => generateReviewSignature(createApproval(), "")).toThrow(/must be configured/);
  });

  it("requires project and evidence binding for review approvals", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resux-review-binding-"));
    tempRoots.push(root);

    const approval = createApproval();
    await writeApproval(root, approval);

    expect(verifyReviewApproval(root, "review_required", {
      secret: REVIEW_SECRET,
      evidenceHash: approval.evidenceHash,
    }).reason).toContain("project name");

    expect(verifyReviewApproval(root, "review_required", {
      secret: REVIEW_SECRET,
      projectName: approval.projectName,
    }).reason).toContain("evidence hash");
  });

  it("rejects approvals for another project or with invalid expiry", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resux-review-integrity-"));
    tempRoots.push(root);

    const approval = createApproval();
    await writeApproval(root, approval);

    expect(verifyReviewApproval(root, "review_required", {
      secret: REVIEW_SECRET,
      projectName: "Different project",
      evidenceHash: approval.evidenceHash,
    }).approved).toBe(false);

    const invalidExpiry = { ...approval, expires: "not-a-date" };
    await writeApproval(root, invalidExpiry);

    expect(verifyReviewApproval(root, "review_required", {
      secret: REVIEW_SECRET,
      projectName: approval.projectName,
      evidenceHash: approval.evidenceHash,
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

async function writeApproval(
  root: string,
  approval: Omit<SignedReviewApproval, "signature">,
): Promise<void> {
  await writeFile(
    path.join(root, "halal-review-approval.json"),
    JSON.stringify({
      ...approval,
      signature: generateReviewSignature(approval, REVIEW_SECRET),
    }),
    "utf8",
  );
}
