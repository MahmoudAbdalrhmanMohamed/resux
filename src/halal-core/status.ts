export type HalalGuardStatus = "allowed" | "warning" | "review_required" | "blocked";

export interface HalalCheckResult {
  status: HalalGuardStatus;
  riskLevel: "low" | "medium" | "high" | "critical";
  categories: string[];
  confidence: number;
  reasons: string[];
  matchedFiles: string[];
  matchedSnippets: string[];
  recommendedAction: string;
  explanation?: string;
  signature?: string;
  createdDate?: string;
}
