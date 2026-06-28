import type { HalalCheckResult } from "../status.js";

export function validateAiResponse(responseStr: string): HalalCheckResult {
  try {
    // Remove markdown code blocks if any
    const jsonStr = responseStr.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const status = parsed.status || "allowed";
    const riskLevel = parsed.riskLevel || "low";
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];
    const recommendedAction = parsed.recommendedAction || "No action recommended.";

    // Validate enum values
    const validStatuses = ["allowed", "warning", "review_required", "blocked"];
    const validRiskLevels = ["low", "medium", "high", "critical"];

    return {
      status: validStatuses.includes(status) ? status : "allowed",
      riskLevel: validRiskLevels.includes(riskLevel) ? riskLevel : "low",
      categories,
      confidence,
      reasons,
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction
    };
  } catch (err: any) {
    // Fallback on parse failure
    return {
      status: "review_required",
      riskLevel: "medium",
      categories: ["ai_error"],
      confidence: 0.1,
      reasons: [`Failed to parse AI classification: ${err.message}`],
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction: "Fallback to human review due to AI parsing failure."
    };
  }
}
