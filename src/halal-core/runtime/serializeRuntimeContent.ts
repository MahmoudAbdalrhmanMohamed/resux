import { redactSensitiveData } from "../ai/redactSensitiveData.js";
import type { HalalRuntimeContent } from "./types.js";

const DEFAULT_MAX_CONTENT_CHARACTERS = 20_000;
const MAX_DEPTH = 12;

export function serializeRuntimeContent(
  content: HalalRuntimeContent,
  maxCharacters = DEFAULT_MAX_CONTENT_CHARACTERS,
): string {
  const safeLimit = Number.isFinite(maxCharacters) && maxCharacters > 0
    ? Math.max(1, Math.floor(maxCharacters))
    : DEFAULT_MAX_CONTENT_CHARACTERS;
  const seen = new WeakSet<object>();
  const values = {
    kind: content.kind,
    id: content.id,
    route: content.route,
    title: content.title,
    text: content.text,
    url: content.url,
    advertiser: content.advertiser,
    metadata: content.metadata,
    payload: content.payload,
  };
  const serialized = serializeValue(values, seen, 0);
  return redactSensitiveData(serialized).slice(0, safeLimit);
}

function serializeValue(value: unknown, seen: WeakSet<object>, depth: number): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "symbol" || typeof value === "function") {
    return `[${typeof value}]`;
  }
  if (depth >= MAX_DEPTH) {
    return "[max-depth]";
  }
  if (seen.has(value)) {
    return "[circular]";
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => serializeValue(entry, seen, depth + 1)).join("\n");
    }

    const record = value as Record<string, unknown>;
    const lines: string[] = [];
    for (const key of Object.keys(record).sort(compareCodeUnits)) {
      lines.push(`${key}: ${serializeValue(record[key], seen, depth + 1)}`);
    }
    return lines.join("\n");
  } finally {
    seen.delete(value);
  }
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
