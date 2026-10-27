import { describe, it, expect } from "vitest";
import { evaluateRules } from "../src/halal-core/rules/defaultBlockedRules.js";
import { validatePolicyConfig, loadProjectDotEnv, loadMainResuxConfig } from "../src/halal-core/config.js";
import { generateReportSignature } from "../src/halal-core/report/signReport.js";
import { verifyReportSignature, isReportValid } from "../src/halal-core/report/verifyReport.js";
import { verifyReviewApproval } from "../src/halal-core/review/verifyReviewApproval.js";
import { generateReviewSignature, type SignedReviewApproval } from "../src/halal-core/review/signedReviewFile.js";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const REPORT_SECRET = "resux-halal-core-report-secret-at-least-32-characters";
const REVIEW_SECRET = "resux-halal-core-review-secret-at-least-32-characters";

describe("resux-halal-core Unit & System Tests", () => {
  
  describe("Rule Engine Matches", () => {
    it("should allow safe educational platforms", () => {
      const data = {
        routes: ["/", "/about", "/learn/math"],
        pages: ["index.vue", "about.vue", "math.vue"],
        components: ["NavBar.vue", "Calculator.vue"],
        metadata: { title: "Math Learning Center", description: "Learn arithmetic and geometry" },
        envNames: ["PORT"],
        dependencies: { vue: "^3.0.0" },
        i18nWords: ["welcome", "score"],
        contentTexts: [{ file: "math.vue", text: "const sum = 1 + 2;" }],
        endpoints: ["api.mathlearning.org"]
      };
      
      const policy = { projectName: "Math Class" };
      const report = evaluateRules(data, policy);
      
      expect(report.status).toBe("allowed");
      expect(report.riskLevel).toBe("low");
      expect(report.categories.length).toBe(0);
    });

    it("should warn on news websites containing violence terms", () => {
      const data = {
        routes: ["/news/war-update"],
        pages: ["war-update.vue"],
        components: [],
        metadata: {},
        envNames: [],
        dependencies: {},
        i18nWords: [],
        contentTexts: [{ file: "war-update.vue", text: "Reports of weapons sales and explosives in the conflict zone." }],
        endpoints: []
      };
      
      const policy = { projectType: "news" }; // news policy bypass
      const report = evaluateRules(data, policy);
      
      expect(report.status).toBe("review_required");
      expect(report.riskLevel).toBe("high");
      expect(report.categories).toContain("violence_harm");
    });

    it("should block a real gambling application", () => {
      const data = {
        routes: ["/casino/slots"],
        pages: ["slots.vue"],
        components: ["SlotMachine.vue"],
        metadata: { title: "Mega Win Casino", description: "Bet and win real cash jackpots" },
        envNames: ["CASINO_API_KEY"],
        dependencies: { "casino-odds-calculator": "^1.0.0" },
        i18nWords: ["jackpot", "spin", "wager"],
        contentTexts: [{ file: "slots.vue", text: "const betAmount = 100; playSlots();" }],
        endpoints: ["api.casino.com"]
      };
      
      const policy = { projectName: "Betting System" };
      const report = evaluateRules(data, policy);
      
      expect(report.status).toBe("blocked");
      expect(report.riskLevel).toBe("high");
      expect(report.categories).toContain("haram_business");
    });

    it("should block phishing credential stealers", () => {
      const data = {
        routes: ["/secure/login-bank"],
        pages: ["login-bank.vue"],
        components: [],
        metadata: { title: "Bank Account Verification" },
        envNames: [],
        dependencies: {},
        i18nWords: [],
        contentTexts: [{ file: "login-bank.vue", text: "Submit your card-stealer details here for verification." }],
        endpoints: []
      };
      
      const policy = {};
      const report = evaluateRules(data, policy);
      
      expect(report.status).toBe("blocked");
      expect(report.riskLevel).toBe("critical");
      expect(report.categories).toContain("illegal_criminal");
    });

    it("should allow legitimate UI styling with shadow-carding or carding style configurations", () => {
      const data = {
        routes: ["/", "/products"],
        pages: ["index.vue", "products.vue"],
        components: ["Products.vue"],
        metadata: { title: "Medical Supplies Marketplace" },
        envNames: [],
        dependencies: {},
        i18nWords: [],
        contentTexts: [
          { file: "products.vue", text: "class='shadow-carding bg-white rounded-lg'" },
          { file: "tailwind.config.js", text: "carding: '0px 4px 6px -2px #10182808'" }
        ],
        endpoints: []
      };

      const policy = {};
      const report = evaluateRules(data, policy);

      expect(report.status).toBe("allowed");
      expect(report.riskLevel).toBe("low");
      expect(report.categories.length).toBe(0);
    });

    it("should block malicious carding instructions and tutorials", () => {
      const data = {
        routes: ["/forum/carding-methods"],
        pages: ["carding-methods.vue"],
        components: [],
        metadata: { title: "Carding Tutorial" },
        envNames: [],
        dependencies: {},
        i18nWords: [],
        contentTexts: [{ file: "carding-methods.vue", text: "Learn carding methods and cvv shop tricks here." }],
        endpoints: []
      };

      const policy = {};
      const report = evaluateRules(data, policy);

      expect(report.status).toBe("blocked");
      expect(report.riskLevel).toBe("critical");
      expect(report.categories).toContain("illegal_criminal");
    });
  });

  describe("Config Policy Constraints", () => {
    it("should accept valid custom strict rules", () => {
      const config = {
        projectName: "Kids Safe Portal",
        stricterRules: { blockAiChatWithoutModeration: true }
      };
      const parsed = validatePolicyConfig(config);
      expect(parsed.projectName).toBe("Kids Safe Portal");
      expect(parsed.stricterRules?.blockAiChatWithoutModeration).toBe(true);
    });

    it("should reject any attempts to disable the safety filter", () => {
      expect(() => {
        validatePolicyConfig({ enabled: false });
      }).toThrow(/not permitted to disable, bypass, or weaken/);

      expect(() => {
        validatePolicyConfig({ ignoreCoreRules: true });
      }).toThrow(/not permitted to disable, bypass, or weaken/);

      expect(() => {
        validatePolicyConfig({ halalGuard: false });
      }).toThrow(/not permitted to disable, bypass, or weaken/);
    });
  });

  describe("Report Cryptographic Signatures & Expiration", () => {
    it("should successfully verify signed reports and detect edits/tampering", () => {
      const report = {
        status: "allowed" as const,
        riskLevel: "low" as const,
        categories: [],
        confidence: 1.0,
        reasons: [],
        matchedFiles: [],
        matchedSnippets: [],
        recommendedAction: "None",
        createdDate: new Date().toISOString()
      };

      const signature = generateReportSignature(report, REPORT_SECRET);
      const signedReport = { ...report, signature };
      const verificationOptions = { secret: REPORT_SECRET, requireAuthenticated: true };

      expect(verifyReportSignature(signedReport, verificationOptions)).toBe(true);
      expect(isReportValid(signedReport, verificationOptions).valid).toBe(true);

      // Modify the status field (tamper attempt)
      const tamperedReport = { ...signedReport, status: "allowed" as any };
      tamperedReport.status = "blocked" as any;
      expect(verifyReportSignature(tamperedReport, verificationOptions)).toBe(false);
      expect(isReportValid(tamperedReport, verificationOptions).valid).toBe(false);
    });

    it("should mark reports that are more than 30 days old as expired", () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const report = {
        status: "allowed" as const,
        riskLevel: "low" as const,
        categories: [],
        confidence: 1.0,
        reasons: [],
        matchedFiles: [],
        matchedSnippets: [],
        recommendedAction: "None",
        createdDate: oldDate
      };

      const signature = generateReportSignature(report, REPORT_SECRET);
      const signedReport = { ...report, signature };

      const check = isReportValid(signedReport, {
        secret: REPORT_SECRET,
        requireAuthenticated: true,
      });
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("expired");
    });
  });

  describe("Review Workflow Verifications", () => {
    it("should allow a news site with review required if signed review approval file exists", () => {
      const appRoot = path.resolve(".");
      const approvalFile = path.join(appRoot, "halal-review-approval.json");

      const approvalPayload: Omit<SignedReviewApproval, "signature"> = {
        projectName: "News World",
        status: "allowed",
        reasons: "Legitimate journalistic activities verified.",
        reviewerId: "reviewer-01",
        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // future expiry
        evidenceHash: "hash-evidence"
      };

      const signature = generateReviewSignature(approvalPayload, REVIEW_SECRET);
      const signed = { ...approvalPayload, signature };

      // Write mock approval file to disk
      writeFileSync(approvalFile, JSON.stringify(signed, null, 2), "utf8");

      try {
        const check = verifyReviewApproval(appRoot, "review_required", {
          secret: REVIEW_SECRET,
          projectName: approvalPayload.projectName,
          evidenceHash: approvalPayload.evidenceHash,
        });
        expect(check.approved).toBe(true);
      } finally {
        if (existsSync(approvalFile)) {
          unlinkSync(approvalFile);
        }
      }
    });

    it("should reject review approvals if the current status is strictly blocked", () => {
      const appRoot = path.resolve(".");
      const check = verifyReviewApproval(appRoot, "blocked");
      expect(check.approved).toBe(false);
      expect(check.reason).toContain("cannot override clearly blocked");
    });
  });

  describe("Project Environment & Config Resolution", () => {
    it("should load .env and .env.local into process.env without overriding existing variables", () => {
      const tempDir = path.join(os.tmpdir(), `resux-halal-env-test-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      const envFile = path.join(tempDir, ".env");
      const envLocalFile = path.join(tempDir, ".env.local");

      writeFileSync(envFile, [
        "# Comment line",
        "TEST_HALAL_KEY=my-secret-token",
        'TEST_QUOTED_KEY="hello-world"',
        "TEST_EXISTING_KEY=from-env-file",
        ""
      ].join("\n"), "utf8");

      writeFileSync(envLocalFile, [
        "TEST_LOCAL_KEY='local-secret'",
        ""
      ].join("\n"), "utf8");

      process.env.TEST_EXISTING_KEY = "already-set-in-shell";

      try {
        loadProjectDotEnv(tempDir);

        expect(process.env.TEST_HALAL_KEY).toBe("my-secret-token");
        expect(process.env.TEST_QUOTED_KEY).toBe("hello-world");
        expect(process.env.TEST_LOCAL_KEY).toBe("local-secret");
        expect(process.env.TEST_EXISTING_KEY).toBe("already-set-in-shell");
      } finally {
        delete process.env.TEST_HALAL_KEY;
        delete process.env.TEST_QUOTED_KEY;
        delete process.env.TEST_LOCAL_KEY;
        delete process.env.TEST_EXISTING_KEY;
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("should transpile and load resux.config.ts in project root without creating .resux/server and cleanly unlink temp files", async () => {
      const tempDir = path.join(os.tmpdir(), `resux-halal-config-test-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      const configFile = path.join(tempDir, "resux.config.ts");
      writeFileSync(configFile, [
        "export default {",
        "  projectName: 'TestHalalApp',",
        "  halalAI: { strict: true }",
        "};",
        ""
      ].join("\n"), "utf8");

      try {
        const config = await loadMainResuxConfig(tempDir);
        expect(config.projectName).toBe("TestHalalApp");
        expect(config.halalAI?.strict).toBe(true);

        const serverDir = path.join(tempDir, ".resux", "server");
        expect(existsSync(serverDir)).toBe(false);

        const files = readdirSync(tempDir);
        const tempFiles = files.filter(f => f.startsWith(".resux-temp-config-"));
        expect(tempFiles.length).toBe(0);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

});
