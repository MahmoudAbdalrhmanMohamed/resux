export const ALCOHOL_DRUG_VAPE_PATTERNS = [
  /alcohol[\s_-]?store/i,
  /liquor[\s_-]?store/i,
  /vape[\s_-]?store/i,
  /vaporizer[\s_-]?shop/i,
  /tobacco[\s_-]?store/i,
  /weed[\s_-]?dispensary/i,
  /marijuana[\s_-]?delivery/i,
  /narcotics/i,
  /recreational[\s_-]?drugs/i,
  /intoxicants/i
];

export function checkAlcoholDrugVape(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of ALCOHOL_DRUG_VAPE_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
