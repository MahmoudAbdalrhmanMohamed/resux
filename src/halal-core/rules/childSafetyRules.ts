export const CHILD_SAFETY_PATTERNS = [
  /csam/i,
  /child[\s_-]?exploitation/i,
  /grooming[\s_-]?tool/i,
  /deepfake[\s_-]?porn/i,
  /sex[\s_-]?service/i,
  /prostitution/i,
  /escort[\s_-]?agency/i
];

export function checkChildSafety(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of CHILD_SAFETY_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
