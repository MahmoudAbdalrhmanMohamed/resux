import { checkRiba } from "./financeRibaRules.js";
import { checkGambling } from "./gamblingRules.js";
import { checkAdult } from "./adultContentRules.js";
import { checkAlcoholDrugVape } from "./alcoholDrugVapeRules.js";
import { checkScamFraud } from "./scamFraudRules.js";
import { checkCyberAbuse } from "./cyberAbuseRules.js";
import { checkViolenceExtremism } from "./violenceExtremismRules.js";
import { checkPrivacyAbuse } from "./privacyAbuseRules.js";
import { checkChildSafety } from "./childSafetyRules.js";
import { checkSelfHarm } from "./selfHarmRules.js";
import { checkHealthHarm } from "./healthHarmRules.js";
import { checkEnvironmentalHarm } from "./environmentalHarmRules.js";
import { checkGeneralHarm } from "./generalHarmRules.js";
import { checkDependencies } from "./dependencyRules.js";
import { checkEndpoints } from "./endpointRules.js";
import type { HalalCheckResult, HalalGuardStatus } from "../status.js";
import type { ResuxHalalPolicy } from "../config.js";

export function evaluateRules(
  scannedData: {
    routes: string[];
    pages: string[];
    components: string[];
    metadata: { title?: string; description?: string; meta?: Record<string, string> };
    envNames: string[];
    dependencies: Record<string, string>;
    i18nWords: string[];
    contentTexts: Array<{ file: string; text: string }>;
    endpoints: string[];
  },
  policy: ResuxHalalPolicy
): HalalCheckResult {
  const matchedFiles = new Set<string>();
  const matchedSnippets: string[] = [];
  const reasons: string[] = [];
  const categories = new Set<string>();
  const matchedCategories = new Set<string>();

  const isEducationOrNewsOrRecovery =
    policy.projectType === "education" ||
    policy.projectType === "news" ||
    policy.projectType === "recovery" ||
    policy.projectType === "academic" ||
    policy.projectType === "cybersecurity_training";

  const halalConfig = policy.halalAI ?? {};
  const categoriesConfig = halalConfig.categories ?? {};

  const scanRoutes = halalConfig.scanRoutes !== false;
  const scanMeta = halalConfig.scanMeta !== false;
  const scanContent = halalConfig.scanContent !== false;
  const scanExternalLinks = halalConfig.scanExternalLinks !== false;
  const scanDependencies = halalConfig.scanDependencies !== false;
  const scanRuntimeConfig = halalConfig.scanRuntimeConfig !== false;

  let hasBlockViolation = false;
  let hasReviewViolation = false;
  let hasWarnViolation = false;

  function getDefaultActionForCategory(categoryKey: string): "block" | "warn" | "review" | "allow" {
    switch (categoryKey) {
      case "ribaFinance":
      case "gambling":
      case "adultContent":
      case "alcohol":
      case "drugs":
      case "security":
      case "illegal_criminal":
      case "cyber_abuse":
      case "sexual_harm":
      case "haram_business":
        return "block";
      case "violence":
      case "violence_harm":
      case "harm":
        return "review";
      default:
        return "warn";
    }
  }

  function mapToInternalTag(categoryKey: string): string {
    switch (categoryKey) {
      case "ribaFinance":
      case "gambling":
      case "adultContent":
      case "alcohol":
      case "drugs":
      case "haram_business":
        return "haram_business";
      case "security":
      case "illegal_criminal":
      case "cyber_abuse":
      case "sexual_harm":
        return "illegal_criminal";
      case "violence":
      case "violence_harm":
        return "violence_harm";
      default:
        return "general_harm";
    }
  }

  const addMatch = (categoryKey: string, matchText: string, file: string, reasonMsg: string) => {
    const ruleAction = categoriesConfig[categoryKey] ?? getDefaultActionForCategory(categoryKey);
    if (ruleAction === "allow") {
      return;
    }

    matchedCategories.add(categoryKey);
    const internalTag = mapToInternalTag(categoryKey);
    categories.add(internalTag);
    matchedFiles.add(file);
    matchedSnippets.push(matchText);
    reasons.push(`[${ruleAction.toUpperCase()}] ${reasonMsg}`);

    if (ruleAction === "block") {
      hasBlockViolation = true;
    } else if (ruleAction === "review") {
      hasReviewViolation = true;
    } else if (ruleAction === "warn") {
      hasWarnViolation = true;
    }
  };

  // 1. Scan Routes
  if (scanRoutes) {
    for (const route of scannedData.routes) {
      checkRiba(route).forEach(m => addMatch("ribaFinance", m, `route:${route}`, `Route matches riba pattern: ${m}`));
      checkGambling(route).forEach(m => addMatch("gambling", m, `route:${route}`, `Route matches gambling pattern: ${m}`));
      checkAdult(route).forEach(m => addMatch("adultContent", m, `route:${route}`, `Route matches adult/sexual pattern: ${m}`));
      checkScamFraud(route).forEach(m => addMatch("security", m, `route:${route}`, `Route matches scam/phishing pattern: ${m}`));
    }
  }

  // 2. Scan Runtime Config / Env variables
  if (scanRuntimeConfig) {
    for (const envName of scannedData.envNames) {
      checkGambling(envName).forEach(m => addMatch("gambling", m, `env:${envName}`, `Environment variable name matches gambling pattern: ${m}`));
      checkAdult(envName).forEach(m => addMatch("adultContent", m, `env:${envName}`, `Environment variable name matches adult pattern: ${m}`));
      checkRiba(envName).forEach(m => addMatch("ribaFinance", m, `env:${envName}`, `Environment variable name matches riba pattern: ${m}`));
    }
  }

  // 3. Scan Metadata
  if (scanMeta) {
    const title = scannedData.metadata.title;
    if (title) {
      checkRiba(title).forEach(m => addMatch("ribaFinance", m, "metadata:title", `Title matches riba pattern: ${m}`));
      checkGambling(title).forEach(m => addMatch("gambling", m, "metadata:title", `Title matches gambling pattern: ${m}`));
      checkAdult(title).forEach(m => addMatch("adultContent", m, "metadata:title", `Title matches adult pattern: ${m}`));
    }
    const description = scannedData.metadata.description;
    if (description) {
      checkRiba(description).forEach(m => addMatch("ribaFinance", m, "metadata:description", `Description matches riba pattern: ${m}`));
      checkGambling(description).forEach(m => addMatch("gambling", m, "metadata:description", `Description matches gambling pattern: ${m}`));
      checkAdult(description).forEach(m => addMatch("adultContent", m, "metadata:description", `Description matches adult pattern: ${m}`));
    }
  }

  // 4. Scan Content
  if (scanContent) {
    for (const item of scannedData.contentTexts) {
      checkRiba(item.text).forEach(m => addMatch("ribaFinance", m, item.file, `File content matches riba pattern: "${m}"`));
      checkGambling(item.text).forEach(m => addMatch("gambling", m, item.file, `File content matches gambling pattern: "${m}"`));
      checkAdult(item.text).forEach(m => addMatch("adultContent", m, item.file, `File content matches adult/sexual pattern: "${m}"`));
      
      checkAlcoholDrugVape(item.text).forEach(m => {
        const isAlcohol = /alcohol|liquor/i.test(m);
        addMatch(isAlcohol ? "alcohol" : "drugs", m, item.file, `File content matches substance/intoxicant pattern: "${m}"`);
      });

      checkScamFraud(item.text).forEach(m => addMatch("security", m, item.file, `File content matches scam/fraud pattern: "${m}"`));
      checkCyberAbuse(item.text).forEach(m => addMatch("security", m, item.file, `File content matches cyber abuse/malware pattern: "${m}"`));
      checkViolenceExtremism(item.text).forEach(m => addMatch("violence", m, item.file, `File content matches violence/extremism pattern: "${m}"`));
      checkPrivacyAbuse(item.text).forEach(m => addMatch("security", m, item.file, `File content matches privacy abuse pattern: "${m}"`));
      checkChildSafety(item.text).forEach(m => addMatch("security", m, item.file, `File content matches child safety risk pattern: "${m}"`));
      checkSelfHarm(item.text).forEach(m => addMatch("violence", m, item.file, `File content matches self-harm pattern: "${m}"`));
      checkHealthHarm(item.text).forEach(m => addMatch("harm", m, item.file, `File content matches health safety risk pattern: "${m}"`));
      checkEnvironmentalHarm(item.text).forEach(m => addMatch("harm", m, item.file, `File content matches environmental harm pattern: "${m}"`));
      checkGeneralHarm(item.text).forEach(m => addMatch("harm", m, item.file, `File content matches general harm pattern: "${m}"`));
    }
  }

  // 5. Scan Dependencies
  if (scanDependencies) {
    const depViolations = checkDependencies(scannedData.dependencies);
    for (const dep of depViolations) {
      addMatch(dep.category, dep.name, "package.json", `Prohibited dependency found: "${dep.name}" - ${dep.reason}`);
    }
  }

  // 6. Scan Endpoints
  if (scanExternalLinks) {
    const endpointViolations = checkEndpoints(scannedData.endpoints);
    for (const ep of endpointViolations) {
      addMatch(ep.category, ep.endpoint, "code", ep.reason);
    }
  }

  // Determine final status
  let status: HalalGuardStatus = "allowed";
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let confidence = 0.0;

  if (categories.size > 0) {
    confidence = 0.95;

    if (hasBlockViolation) {
      status = "blocked";
      riskLevel = matchedCategories.has("security") ? "critical" : "high";
    } else if (hasReviewViolation) {
      status = "review_required";
      riskLevel = "high";
    } else if (hasWarnViolation) {
      status = "warning";
      riskLevel = "medium";
    }

    if (isEducationOrNewsOrRecovery) {
      if (status === "blocked") {
        if (hasBlockViolation && (matchedCategories.has("security") || matchedCategories.has("violence"))) {
          status = "review_required";
          riskLevel = "high";
        } else {
          status = "warning";
          riskLevel = "medium";
        }
      }
    }
  }

  return {
    status,
    riskLevel,
    categories: Array.from(categories),
    confidence,
    reasons,
    matchedFiles: Array.from(matchedFiles),
    matchedSnippets,
    recommendedAction:
      status === "blocked"
        ? "Block all official Resux commands for this project."
        : status === "review_required"
        ? "Request compliance review. A signed review-approval.json file is required to build/deploy."
        : status === "warning"
        ? "Proceed with warnings. Address any potential policy violations."
        : "No action required.",
  };
}
