export const REVIEWABLE_CATEGORIES = [
  "haram_business",
  "privacy_abuse",
  "financial_harm",
  "health_safety_harm",
  "environmental_harm",
  "general_harm"
];

export const NON_REVIEWABLE_CATEGORIES = [
  "illegal_criminal",
  "cyber_abuse",
  "sexual_harm",
  "violence_harm"
];

export function isCategoryReviewable(category: string): boolean {
  if (NON_REVIEWABLE_CATEGORIES.includes(category)) {
    return false;
  }
  return REVIEWABLE_CATEGORIES.includes(category);
}
