export const RIBA_PATTERNS = [
  /payday[\s_-]?loan/i,
  /usury/i,
  /loan[\s_-]?shark/i,
  /predatory[\s_-]?loan/i,
  /interest[\s_-]?bearing[\s_-]?debt/i,
  /riba/i,
  /interest-based lending/i,
  /high-interest loans/i
];

export function checkRiba(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of RIBA_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
