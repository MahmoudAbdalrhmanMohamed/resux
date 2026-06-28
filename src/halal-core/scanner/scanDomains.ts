export function scanDomains(texts: Array<{ file: string; text: string }>): string[] {
  const domains = new Set<string>();
  const urlRegex = /(https?|wss?):\/\/([a-zA-Z0-9.-]+)/gi;

  for (const item of texts) {
    let match;
    while ((match = urlRegex.exec(item.text)) !== null) {
      if (match[2]) {
        domains.add(match[2].toLowerCase());
      }
    }
  }

  return Array.from(domains);
}
