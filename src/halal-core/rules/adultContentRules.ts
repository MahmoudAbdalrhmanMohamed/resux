export const ADULT_PATTERNS = [
  /pornography/i,
  /escort[\s_-]?service/i,
  /prostitution/i,
  /adult[\s_-]?sexual/i,
  /onlyfans/i,
  /cam[\s_-]?girl/i,
  /naked[\s_-]?video/i,
  /strip[\s_-]?club/i,
  /hookup[\s_-]?app/i,
  /sexual[\s_-]?matching/i,
  /zina/i
];

export function checkAdult(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of ADULT_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
