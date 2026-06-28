export const CYBER_ABUSE_PATTERNS = [
  /malware/i,
  /ransomware/i,
  /spyware/i,
  /keylogger/i,
  /backdoor/i,
  /botnet/i,
  /ddos[\s_-]?tool/i,
  /exploit[\s_-]?kit/i,
  /stealer/i,
  /credential[\s_-]?stealer/i,
  /session[\s_-]?hijacking/i,
  /cookie[\s_-]?stealing/i,
  /phishing[\s_-]?kit/i,
  /account[\s_-]?takeover/i,
  /dark[\s_-]?pattern[\s_-]?harvesting/i
];

export function checkCyberAbuse(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of CYBER_ABUSE_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
  }
  return matches;
}
