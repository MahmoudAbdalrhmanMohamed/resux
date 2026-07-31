import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateReportSignature } from "../src/halal-core/report/signReport.js";
import { checkOnDiskReportSignature } from "../src/halal-core/tamper/verifyReportSignature.js";

const tempRoots: string[] = [];
const SECRET = "resux-production-report-secret-at-least-32-characters";

afterEach(async () => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("production report authentication", () => {
  it("accepts checksums for local validation but not authenticated production checks", async () => {
    const root = await createTempRoot();
    const report = createReport();
    await writeReport(root, {
      ...report,
      signature: generateReportSignature(report, ""),
    });

    expect(checkOnDiskReportSignature(root).valid).toBe(true);
    expect(checkOnDiskReportSignature(root, { requireAuthenticated: true }).valid).toBe(false);
  });

  it("accepts a report authenticated with the configured private key", async () => {
    const root = await createTempRoot();
    const report = createReport();
    await writeReport(root, {
      ...report,
      signature: generateReportSignature(report, SECRET),
    });

    expect(checkOnDiskReportSignature(root, {
      secret: SECRET,
      requireAuthenticated: true,
    }).valid).toBe(true);
  });
});

function createReport() {
  return {
    status: "allowed" as const,
    riskLevel: "low" as const,
    categories: [],
    confidence: 1,
    reasons: [],
    matchedFiles: [],
    matchedSnippets: [],
    recommendedAction: "None",
    createdDate: new Date().toISOString(),
  };
}

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "resux-report-auth-"));
  tempRoots.push(root);
  await mkdir(root, { recursive: true });
  return root;
}

async function writeReport(root: string, report: unknown): Promise<void> {
  await writeFile(
    path.join(root, "halal-report.json"),
    JSON.stringify(report),
    "utf8",
  );
}
