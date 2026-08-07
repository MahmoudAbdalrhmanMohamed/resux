import { classifyRuntimeContentWithAi } from "../ai/classifyRuntimeContent.js";
import { evaluateRules } from "../rules/defaultBlockedRules.js";
import { scanDomains } from "../scanner/scanDomains.js";
import type { HalalCheckResult, HalalGuardStatus } from "../status.js";
import {
  createRuntimeContentFingerprint,
  findReviewedRuntimeDecision,
} from "./reviewedMemory.js";
import { prepareRuntimeContent } from "./serializeRuntimeContent.js";
import type {
  HalalRuntimeContent,
  HalalRuntimeDecision,
  HalalRuntimeGuardOptions,
} from "./types.js";

const STATUS_RANK: Record<HalalGuardStatus, number> = {
  allowed: 0,
  warning: 1,
  review_required: 2,
  blocked: 3,
};

const RISK_RANK: Record<HalalCheckResult["riskLevel"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export class HalalRuntimeBlockedError extends Error {
  readonly decision: HalalRuntimeDecision;

  constructor(decision: HalalRuntimeDecision) {
    super(decision.reasons[0] || "Runtime content was rejected by the halal guard.");
    this.name = "HalalRuntimeBlockedError";
    this.decision = decision;
  }
}

export function createHalalRuntimeGuard(options: HalalRuntimeGuardOptions = {}) {
  return {
    check(content: HalalRuntimeContent): Promise<HalalRuntimeDecision> {
      return evaluateHalalRuntimeContent(content, options);
    },

    checkDynamicPage(content: Omit<HalalRuntimeContent, "kind">): Promise<HalalRuntimeDecision> {
      return evaluateHalalRuntimeContent({ ...content, kind: "dynamic_page" }, options);
    },

    checkAd(content: Omit<HalalRuntimeContent, "kind">): Promise<HalalRuntimeDecision> {
      return evaluateHalalRuntimeContent({ ...content, kind: "advertisement" }, options);
    },

    async assertAllowed(content: HalalRuntimeContent): Promise<HalalRuntimeDecision> {
      const decision = await evaluateHalalRuntimeContent(content, options);
      if (!decision.allowed) {
        throw new HalalRuntimeBlockedError(decision);
      }
      return decision;
    },

    async filterAds<T extends Omit<HalalRuntimeContent, "kind">>(ads: readonly T[]) {
      const checked = await Promise.all(ads.map(async (ad) => ({
        ad,
        decision: await evaluateHalalRuntimeContent({ ...ad, kind: "advertisement" }, options),
      })));
      return {
        allowed: checked.filter((entry) => entry.decision.allowed).map((entry) => entry.ad),
        rejected: checked.filter((entry) => !entry.decision.allowed),
      };
    },
  };
}

export async function evaluateHalalRuntimeContent(
  content: HalalRuntimeContent,
  options: HalalRuntimeGuardOptions = {},
): Promise<HalalRuntimeDecision> {
  const serialized = prepareRuntimeContent(content, options.maxContentCharacters);
  const fingerprint = createRuntimeContentFingerprint(content);
  const file = `runtime:${content.kind}:${content.id || content.route || "anonymous"}`;
  const scannedResult = evaluateRules({
    routes: content.route ? [content.route] : [],
    pages: content.kind === "dynamic_page" && content.route ? [content.route] : [],
    components: [],
    metadata: {
      title: content.title,
      description: content.advertiser
        ? `Advertiser: ${content.advertiser}`
        : `${content.kind} runtime content`,
    },
    envNames: [],
    dependencies: {},
    i18nWords: [],
    contentTexts: [{ file, text: serialized.localText }],
    endpoints: scanDomains([{ file, text: serialized.localText }]),
  }, options.policy ?? {});
  const localResult = serialized.truncated
    ? mergeResults(scannedResult, truncatedContentResult(file, serialized.maxCharacters))
    : scannedResult;

  const reviewed = findReviewedRuntimeDecision(
    content,
    options.reviewedDecisions,
    options.reviewSecret,
  );
  if (reviewed) {
    const reviewedResult = decisionFromReviewedMemory(content, fingerprint, reviewed, options.strict === true);
    if (STATUS_RANK[reviewedResult.status] >= STATUS_RANK[localResult.status]
      || STATUS_RANK[localResult.status] <= STATUS_RANK.warning) {
      return reviewedResult;
    }
  }

  if (localResult.status === "blocked") {
    return finalizeDecision(content, fingerprint, localResult, "local_rules", options.strict === true);
  }

  const aiResult = await classifyRuntimeContentWithAi(
    content,
    serialized.aiText,
    localResult,
    options.ai,
  );
  const requiresAi = content.kind === "advertisement"
    ? options.ai?.requireForAds !== false
    : options.ai?.requireForDynamicContent === true;

  if (!aiResult && requiresAi) {
    const unverified = mergeResults(localResult, {
      status: "review_required",
      riskLevel: "medium",
      categories: [content.kind === "advertisement" ? "unverified_ad" : "unverified_dynamic_content"],
      confidence: 0,
      reasons: ["Required runtime AI verification is not configured or unavailable."],
      matchedFiles: [file],
      matchedSnippets: [],
      recommendedAction: "Do not render this content until AI verification or signed human review is available.",
    });
    return finalizeDecision(content, fingerprint, unverified, "local_rules", options.strict === true);
  }

  const result = aiResult ? mergeResults(localResult, aiResult) : localResult;
  return finalizeDecision(
    content,
    fingerprint,
    result,
    aiResult ? "local_and_ai" : "local_rules",
    options.strict === true,
  );
}

function truncatedContentResult(file: string, maxCharacters: number): HalalCheckResult {
  return {
    status: "review_required",
    riskLevel: "medium",
    categories: ["runtime_content_truncated"],
    confidence: 1,
    reasons: [
      `Runtime content exceeded the ${maxCharacters}-character scan limit and was not fully inspected.`,
    ],
    matchedFiles: [file],
    matchedSnippets: [],
    recommendedAction: "Increase maxContentCharacters or complete a manual review before rendering.",
  };
}

function decisionFromReviewedMemory(
  content: HalalRuntimeContent,
  fingerprint: string,
  reviewed: NonNullable<HalalRuntimeGuardOptions["reviewedDecisions"]>[number],
  strict: boolean,
): HalalRuntimeDecision {
  const result: HalalCheckResult = {
    status: reviewed.status,
    riskLevel: reviewed.status === "blocked"
      ? "high"
      : reviewed.status === "review_required"
      ? "medium"
      : reviewed.status === "warning"
      ? "medium"
      : "low",
    categories: reviewed.categories,
    confidence: 1,
    reasons: [`Signed review by ${reviewed.reviewerId}: ${reviewed.reason}`],
    matchedFiles: [],
    matchedSnippets: [],
    recommendedAction: reviewed.status === "allowed"
      ? "Render the exact reviewed content."
      : "Follow the signed runtime review decision.",
  };
  return finalizeDecision(content, fingerprint, result, "reviewed_memory", strict);
}

function finalizeDecision(
  content: HalalRuntimeContent,
  fingerprint: string,
  result: HalalCheckResult,
  source: HalalRuntimeDecision["source"],
  strict: boolean,
): HalalRuntimeDecision {
  return {
    ...result,
    contentKind: content.kind,
    fingerprint,
    source,
    allowed: result.status === "allowed" || (result.status === "warning" && !strict),
  };
}

function mergeResults(left: HalalCheckResult, right: HalalCheckResult): HalalCheckResult {
  const leftRank = STATUS_RANK[left.status];
  const rightRank = STATUS_RANK[right.status];
  const dominant = rightRank > leftRank ? right : left;
  const riskLevel = RISK_RANK[right.riskLevel] > RISK_RANK[left.riskLevel]
    ? right.riskLevel
    : left.riskLevel;
  const confidence = leftRank === rightRank
    ? Math.max(left.confidence, right.confidence)
    : dominant.confidence;

  return {
    status: dominant.status,
    riskLevel,
    categories: uniqueStrings([...left.categories, ...right.categories]),
    confidence,
    reasons: uniqueStrings([...left.reasons, ...right.reasons]),
    matchedFiles: uniqueStrings([...left.matchedFiles, ...right.matchedFiles]),
    matchedSnippets: uniqueStrings([...left.matchedSnippets, ...right.matchedSnippets]),
    recommendedAction: dominant.recommendedAction,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
