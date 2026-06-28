export const SCAM_FRAUD_PATTERNS = [
  /phishing/i,
  /card[\s_-]?stealer/i,
  /cc[\s_-]?grabber/i,
  /fake[\s_-]?login/i,
  /fake[\s_-]?payment/i,
  /bank[\s_-]?verification/i,
  /identity[\s_-]?theft/i,
  /fake[\s_-]?document/i,
  /passport[\s_-]?generator/i,
  /money[\s_-]?laundering/i,
  /sanctions[\s_-]?evasion/i,
  /tax[\s_-]?evasion/i,
  /counterfeit[\s_-]?goods/i,
  /stolen[\s_-]?card/i,
  /\bcarding[\s_-]?(?:forum|site|method|tutorial|guide|group|shop|cashout|clone|bin|tool|software|cvv|hack|carder)\b/i,
  /dumps/i,
  /cvv[\s_-]?shop/i
];

export function checkScamFraud(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of SCAM_FRAUD_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
