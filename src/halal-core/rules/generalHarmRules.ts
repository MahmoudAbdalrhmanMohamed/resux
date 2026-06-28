export const GENERAL_HARM_PATTERNS = [
  /illegal[\s_-]?activity/i,
  /systemic[\s_-]?abuse/i,
  /public[\s_-]?harm/i
];

export function checkGeneralHarm(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of GENERAL_HARM_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
