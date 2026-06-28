export const BLOCKED_DEPENDENCIES: Record<string, { category: string; reason: string }> = {
  "phishing-kit": {
    category: "illegal_criminal",
    reason: "Contains known phishing templates or builders."
  },
  "keylogger-js": {
    category: "cyber_abuse",
    reason: "Exposes system-level keylogging utilities."
  },
  "ddos-attack-tool": {
    category: "cyber_abuse",
    reason: "Contains denial-of-service attack code."
  },
  "escort-scraper": {
    category: "haram_business",
    reason: "Used for scraping sexual/escort service listings."
  },
  "casino-odds-calculator": {
    category: "haram_business",
    reason: "Calculates odds for gambling and sports betting."
  }
};

export function checkDependencies(dependencies: Record<string, string> = {}): Array<{
  name: string;
  category: string;
  reason: string;
}> {
  const violations: Array<{ name: string; category: string; reason: string }> = [];
  
  for (const [name, version] of Object.entries(dependencies)) {
    // Exact match
    if (BLOCKED_DEPENDENCIES[name]) {
      violations.push({
        name,
        category: BLOCKED_DEPENDENCIES[name].category,
        reason: BLOCKED_DEPENDENCIES[name].reason
      });
    }
    
    // Pattern matches
    if (name.includes("phish") && !name.includes("phishing-safeguard")) {
      violations.push({
        name,
        category: "illegal_criminal",
        reason: "Package name matches phishing pattern."
      });
    }
    if (name.includes("keylogger")) {
      violations.push({
        name,
        category: "cyber_abuse",
        reason: "Package name matches keylogger pattern."
      });
    }
    if (name.includes("casino") || name.includes("sportsbook") || name.includes("slotmachine")) {
      violations.push({
        name,
        category: "haram_business",
        reason: "Package relates to gambling/betting services."
      });
    }
  }
  
  return violations;
}
