export const ENVIRONMENTAL_HARM_PATTERNS = [
  /wildlife[\s_-]?trade/i,
  /ivory[\s_-]?sales/i,
  /animal[\s_-]?cruelty/i,
  /illegal[\s_-]?logging/i,
  /toxic[\s_-]?waste[\s_-]?dumping/i
];

export function checkEnvironmentalHarm(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of ENVIRONMENTAL_HARM_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
