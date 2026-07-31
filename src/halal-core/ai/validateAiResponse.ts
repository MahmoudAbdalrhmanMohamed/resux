import type { HalalCheckResult, HalalGuardStatus } from "../status.js";

const VALID_STATUSES = new Set<HalalGuardStatus>([
  "allowed",
  "warning",
  "review_required",
  "blocked",
]);
const VALID_RISK_LEVELS = new Set<HalalCheckResult["riskLevel"]>([
  "low",
  "medium",
  "high",
  "critical",
]);

export function validateAiResponse(responseStr: string): HalalCheckResult {
  try {
    const parsed = JSON.parse(extractJson(responseStr)) as unknown;
    if (!isRecord(parsed)) {
      throw new Error("AI classification must be a JSON object.");
    }

    const status = VALID_STATUSES.has(parsed.status as HalalGuardStatus)
      ? parsed.status as HalalGuardStatus
      : "review_required";
    const riskLevel = VALID_RISK_LEVELS.has(parsed.riskLevel as HalalCheckResult["riskLevel"])
      ? parsed.riskLevel as HalalCheckResult["riskLevel"]
      : "medium";
    const categories = readStringArray(parsed.categories, 50);
    const reasons = readStringArray(parsed.reasons, 50);
    const confidence = typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0;
    const recommendedAction = typeof parsed.recommendedAction === "string" && parsed.recommendedAction.trim()
      ? parsed.recommendedAction.trim().slice(0, 2_000)
      : "Perform a manual review before continuing.";

    if (status === "review_required" && reasons.length === 0) {
      reasons.push("AI response omitted or supplied an invalid classification status.");
    }

    return {
      status,
      riskLevel,
      categories,
      confidence,
      reasons,
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "review_required",
      riskLevel: "medium",
      categories: ["ai_error"],
      confidence: 0,
      reasons: [`Failed to validate AI classification: ${message}`],
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction: "Fallback to human review due to an invalid AI response.",
    };
  }
}

function extractJson(input: string): string {
  const source = String(input || "").trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(source);
  return (fenced?.[1] ?? source).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, 1_000))
    .filter(Boolean)
    .slice(0, limit);
}
