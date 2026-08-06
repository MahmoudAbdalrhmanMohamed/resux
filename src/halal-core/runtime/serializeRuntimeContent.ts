import { redactSensitiveData } from "../ai/redactSensitiveData.js";
import type { HalalRuntimeContent } from "./types.js";

const DEFAULT_MAX_CONTENT_CHARACTERS = 20_000;
const MAX_DEPTH = 128;

export interface PreparedRuntimeContent {
  canonical: string;
  localText: string;
  aiText: string;
  truncated: boolean;
  maxCharacters: number;
}

export function serializeRuntimeContent(
  content: HalalRuntimeContent,
  maxCharacters = DEFAULT_MAX_CONTENT_CHARACTERS,
): string {
  return prepareRuntimeContent(content, maxCharacters).aiText;
}

export function prepareRuntimeContent(
  content: HalalRuntimeContent,
  maxCharacters = DEFAULT_MAX_CONTENT_CHARACTERS,
): PreparedRuntimeContent {
  const safeLimit = resolveMaxCharacters(maxCharacters);
  const canonical = serializeRuntimeContentCanonical(content);

  return {
    canonical,
    localText: canonical.slice(0, safeLimit),
    aiText: redactSensitiveData(canonical).slice(0, safeLimit),
    truncated: canonical.length > safeLimit,
    maxCharacters: safeLimit,
  };
}

export function serializeRuntimeContentCanonical(content: HalalRuntimeContent): string {
  const ancestors = new WeakMap<object, string>();
  return serializeValue({
    kind: content.kind,
    id: content.id,
    route: content.route,
    title: content.title,
    text: content.text,
    url: content.url,
    advertiser: content.advertiser,
    metadata: content.metadata,
    payload: content.payload,
  }, ancestors, 0, "$runtime");
}

function serializeValue(
  value: unknown,
  ancestors: WeakMap<object, string>,
  depth: number,
  valuePath: string,
): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `string:${value.length}:${value}`;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "number:NaN";
    if (value === Number.POSITIVE_INFINITY) return "number:Infinity";
    if (value === Number.NEGATIVE_INFINITY) return "number:-Infinity";
    return `number:${Object.is(value, -0) ? "-0" : String(value)}`;
  }
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (typeof value === "symbol") return `symbol:${String(value.description ?? "")}`;
  if (typeof value === "function") return `function:${value.name || "anonymous"}`;
  if (depth >= MAX_DEPTH) return `max-depth:${valuePath}`;

  const existingPath = ancestors.get(value);
  if (existingPath) {
    return `circular-reference:${existingPath}`;
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? `date:${value.toISOString()}`
      : "date:invalid";
  }
  if (value instanceof URL) {
    return `url:${value.href.length}:${value.href}`;
  }
  if (value instanceof RegExp) {
    return `regexp:${value.source.length}:${value.source}/${value.flags}`;
  }

  ancestors.set(value, valuePath);
  try {
    if (Array.isArray(value)) {
      const entries = value.map((entry, index) =>
        `${index}=${serializeValue(entry, ancestors, depth + 1, `${valuePath}[${index}]`)}`);
      return `array:${value.length}[${entries.join(";")}]`;
    }

    let keys: string[];
    try {
      keys = Object.keys(value as Record<string, unknown>).sort(compareCodeUnits);
    } catch {
      return `unreadable-object:${valuePath}`;
    }

    const entries = keys.map((key) => {
      let entry: unknown;
      try {
        entry = (value as Record<string, unknown>)[key];
      } catch {
        return `${key.length}:${key}=unreadable-property`;
      }
      return `${key.length}:${key}=${serializeValue(entry, ancestors, depth + 1, `${valuePath}.${key}`)}`;
    });
    return `object:${keys.length}{${entries.join(";")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function resolveMaxCharacters(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.max(1, Math.floor(value))
    : DEFAULT_MAX_CONTENT_CHARACTERS;
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
