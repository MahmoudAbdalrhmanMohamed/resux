export const HEALTH_HARM_PATTERNS = [
  /fake[\s_-]?medicine/i,
  /medical[\s_-]?misinformation/i,
  /unlicensed[\s_-]?diagnosis/i,
  /steroid[\s_-]?abuse/i,
  /anabolic[\s_-]?steroids/i,
  /diet[\s_-]?harm/i,
  /anti[\s_-]?vax[\s_-]?misinformation/i
];

export function checkHealthHarm(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of HEALTH_HARM_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
