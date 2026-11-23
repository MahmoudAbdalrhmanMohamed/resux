import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { enforceBuildGuard } from "../src/halal-core/enforce.js";
import { checkOnDiskReportSignature } from "../src/halal-core/tamper/verifyReportSignature.js";

describe("Bug 6: Halal report signing secret in local builds", () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "resux-halal-bug6-"));
    delete process.env.RESUX_HALAL_REPORT_SIGNING_SECRET;
    delete process.env.RESUX_HALAL_REPORT_REQUIRE_AUTHENTICATED;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates an ephemeral signing secret and logs a warning when signing secret is unset in local build", async () => {
    const outDir = path.join(tempDir, ".resux");
    await mkdir(outDir, { recursive: true });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await enforceBuildGuard(tempDir, outDir, { ignoreTestEnv: true });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("RESUX_HALAL_REPORT_SIGNING_SECRET is not configured")
    );

    // Verify halal-report.json was generated and has a valid HMAC signature
    const check = checkOnDiskReportSignature(outDir, {
      secret: process.env.RESUX_HALAL_REPORT_SIGNING_SECRET,
      requireAuthenticated: true
    });
    expect(check.valid).toBe(true);

    const reportContent = JSON.parse(await readFile(path.join(outDir, "halal-report.json"), "utf8"));
    expect(reportContent.signature).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);

    warnSpy.mockRestore();
  });

  it("requires signing secret with helpful error when requireAuthenticated is explicitly enabled", async () => {
    const outDir = path.join(tempDir, ".resux");
    await mkdir(outDir, { recursive: true });

    // Create policy with requireAuthenticated = true
    await writeFile(
      path.join(tempDir, "resux.halal.config.ts"),
      `export default { halalAI: { requireAuthenticated: true } };`,
      "utf8"
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });

    await expect(
      enforceBuildGuard(tempDir, outDir, { ignoreTestEnv: true })
    ).rejects.toThrow("process.exit(1)");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("RESUX_HALAL_REPORT_SIGNING_SECRET must be configured with at least 32 characters when Halal report authentication is enabled")
    );

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
