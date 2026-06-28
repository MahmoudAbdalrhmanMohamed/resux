export const PRIVACY_ABUSE_PATTERNS = [
  /spyware/i,
  /unauthorized[\s_-]?tracking/i,
  /location[\s_-]?tracking/i,
  /contact[\s_-]?scraping/i,
  /data[\s_-]?broker/i,
  /hidden[\s_-]?telemetry/i,
  /unauthorized[\s_-]?face[\s_-]?recognition/i,
  /biometric[\s_-]?collection/i,
  /surveillance[\s_-]?system/i
];

export function checkPrivacyAbuse(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of PRIVACY_ABUSE_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
