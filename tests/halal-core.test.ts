import { describe, it, expect } from "vitest";
import { evaluateRules } from "../src/halal-core/rules/defaultBlockedRules.js";
import { validatePolicyConfig } from "../src/halal-core/config.js";
import { generateReportSignature } from "../src/halal-core/report/signReport.js";
import { verifyReportSignature, isReportValid } from "../src/halal-core/report/verifyReport.js";
import { verifyReviewApproval } from "../src/halal-core/review/verifyReviewApproval.js";
import { generateReviewSignature, type SignedReviewApproval } from "../src/halal-core/review/signedReviewFile.js";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";

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

      const signature = generateReportSignature(report);
      const signedReport = { ...report, signature };

      expect(verifyReportSignature(signedReport)).toBe(true);
      expect(isReportValid(signedReport).valid).toBe(true);

      // Modify the status field (tamper attempt)
      const tamperedReport = { ...signedReport, status: "allowed" as any };
      tamperedReport.status = "blocked" as any;
      expect(verifyReportSignature(tamperedReport)).toBe(false);
      expect(isReportValid(tamperedReport).valid).toBe(false);
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

      const signature = generateReportSignature(report);
      const signedReport = { ...report, signature };

      const check = isReportValid(signedReport);
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

      const signature = generateReviewSignature(approvalPayload);
      const signed = { ...approvalPayload, signature };

      // Write mock approval file to disk
      writeFileSync(approvalFile, JSON.stringify(signed, null, 2), "utf8");

      try {
        const check = verifyReviewApproval(appRoot, "review_required");
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

});
