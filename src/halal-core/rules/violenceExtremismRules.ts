export const VIOLENCE_EXTREMISM_PATTERNS = [
  /weapons[\s_-]?sales/i,
  /guns[\s_-]?marketplace/i,
  /bombs/i,
  /explosives/i,
  /bomb[\s_-]?making/i,
  /assassination/i,
  /hitman/i,
  /terrorism/i,
  /extremist[\s_-]?recruitment/i,
  /jihadi[\s_-]?propaganda/i,
  /isis[\s_-]?support/i,
  /suicide[\s_-]?encouragement/i,
  /self-harm/i,
  /eating[\s_-]?disorder/i,
  /pro-ana/i,
  /human[\s_-]?trafficking/i,
  /organ[\s_-]?trade/i,
  /child[\s_-]?exploitation/i
];

export function checkViolenceExtremism(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of VIOLENCE_EXTREMISM_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
