import { DEFAULT_ICON_API_PROVIDER } from "./constants.js";
import type { ParsedIconName } from "./types.js";

export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
}

export function normalizeIconApiProvider(value: unknown): string {
  const raw = typeof value === "string" ? stripTrailingSlashes(value.trim()) : "";
  if (!raw || raw.startsWith("//")) {
    return DEFAULT_ICON_API_PROVIDER;
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return stripTrailingSlashes(url.toString());
    }
  } catch {
    // Return default for malformed URLs
  }
  return DEFAULT_ICON_API_PROVIDER;
}

function splitIconDelimiter(candidate: string, delimiter: ":" | "/"): ParsedIconName | null {
  if (!candidate.includes(delimiter)) return null;
  const [prefix, ...rest] = candidate.split(delimiter);
  const name = rest.join(delimiter);
  return prefix && name ? { prefix, name } : null;
}

function matchKnownCollectionPrefix(candidate: string, knownCollections: string[]): ParsedIconName | null {
  for (const collection of knownCollections) {
    const normalizedColl = collection.toLowerCase();
    if (candidate.startsWith(`${normalizedColl}-`)) {
      const name = candidate.slice(normalizedColl.length + 1);
      if (name) return { prefix: normalizedColl, name };
    }
  }
  return null;
}

function splitHyphenatedIconName(candidate: string): ParsedIconName | null {
  const firstHyphen = candidate.indexOf("-");
  if (firstHyphen > 0 && firstHyphen < candidate.length - 1) {
    return {
      prefix: candidate.slice(0, firstHyphen),
      name: candidate.slice(firstHyphen + 1),
    };
  }
  return null;
}

export function parseIconName(
  rawName: string,
  aliases?: Record<string, string>,
  knownCollections: string[] = [],
  depth: number = 0,
  visited: Set<string> = new Set()
): ParsedIconName | null {
  if (depth > 10) return null;
  const input = String(rawName || "").trim().toLowerCase();
  if (!input || input.length > 256 || visited.has(input)) return null;

  // Resolve alias if mapped
  const resolved = aliases?.[input] ?? input;
  if (resolved !== input) {
    const nextVisited = new Set(visited).add(input);
    return parseIconName(resolved, aliases, knownCollections, depth + 1, nextVisited);
  }

  // Nuxt Icon i- prefix format
  const hasIPrefix = input.startsWith("i-") || input.startsWith("i:");
  const candidate = hasIPrefix ? input.slice(2) : input;

  return (
    splitIconDelimiter(candidate, ":") ??
    splitIconDelimiter(candidate, "/") ??
    matchKnownCollectionPrefix(candidate, knownCollections) ??
    (hasIPrefix ? splitHyphenatedIconName(candidate) : null)
  );
}
