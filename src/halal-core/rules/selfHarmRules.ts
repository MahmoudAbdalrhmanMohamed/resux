export const SELF_HARM_PATTERNS = [
  /suicide[\s_-]?encouragement/i,
  /self[\s_-]?harm[\s_-]?promotion/i,
  /eating[\s_-]?disorder[\s_-]?promotion/i,
  /pro[\s_-]?ana/i,
  /pro[\s_-]?mia/i
];

export function checkSelfHarm(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
