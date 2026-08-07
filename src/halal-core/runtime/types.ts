import type { HalalCheckResult } from "../status.js";
import type { ResuxHalalPolicy } from "../config.js";

export type HalalRuntimeContentKind =
  | "dynamic_page"
  | "advertisement"
  | "api_response"
  | "user_content";

export interface HalalRuntimeContent {
  id?: string;
  kind: HalalRuntimeContentKind;
  route?: string;
  title?: string;
  text?: string;
  url?: string;
  advertiser?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

export interface HalalRuntimeAiOptions {
  enabled?: boolean;
  endpoint?: string;
  apiKey?: string;
  model?: string;
  requireForAds?: boolean;
  requireForDynamicContent?: boolean;
}

export interface HalalRuntimeGuardOptions {
  policy?: ResuxHalalPolicy;
  strict?: boolean;
  ai?: HalalRuntimeAiOptions;
  reviewSecret?: string;
  reviewedDecisions?: SignedHalalRuntimeDecision[];
  maxContentCharacters?: number;
}

export type HalalRuntimeDecisionSource =
  | "local_rules"
  | "local_and_ai"
  | "reviewed_memory";

export interface HalalRuntimeDecision extends HalalCheckResult {
  allowed: boolean;
  contentKind: HalalRuntimeContentKind;
  fingerprint: string;
  source: HalalRuntimeDecisionSource;
}

export interface HalalRuntimeReviewDecision {
  version: 1;
  fingerprint: string;
  status: "allowed" | "warning" | "review_required" | "blocked";
  categories: string[];
  reason: string;
  reviewerId: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SignedHalalRuntimeDecision extends HalalRuntimeReviewDecision {
  signature: string;
}

export interface HalalRuntimeReviewInput {
  status: HalalRuntimeReviewDecision["status"];
  categories?: string[];
  reason: string;
  reviewerId: string;
  expiresAt?: string;
}
