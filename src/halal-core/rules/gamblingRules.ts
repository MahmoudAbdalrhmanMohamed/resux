export const GAMBLING_PATTERNS = [
  /casino/i,
  /betting/i,
  /sportsbook/i,
  /slot[\s_-]?machine/i,
  /jackpot/i,
  /roulette/i,
  /blackjack/i,
  /baccarat/i,
  /lottery/i,
  /prediction[\s_-]?market[\s_-]?bet/i
];

export function checkGambling(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of GAMBLING_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
