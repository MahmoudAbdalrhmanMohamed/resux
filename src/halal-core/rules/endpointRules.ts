export const BLOCKED_ENDPOINTS = [
  /api\.casino/i,
  /betting[\s_-]?gateway/i,
  /phish[\s_-]?collector/i,
  /keylogger[\s_-]?receiver/i,
  /vape[\s_-]?supplier/i,
  /adult[\s_-]?escort[\s_-]?api/i,
  /darknet[\s_-]?market/i,
  /illegal[\s_-]?drugs[\s_-]?portal/i,
];

export function checkEndpoints(endpoints: string[]): Array<{
  endpoint: string;
  category: string;
  reason: string;
}> {
  const violations: Array<{ endpoint: string; category: string; reason: string }> = [];

  for (const endpoint of endpoints) {
    for (const pattern of BLOCKED_ENDPOINTS) {
      if (pattern.test(endpoint)) {
        violations.push({
          endpoint,
          category: "endpoint_risk",
          reason: `Endpoint matches prohibited pattern: ${pattern.toString()}`
        });
      }
    }
  }

  return violations;
}
