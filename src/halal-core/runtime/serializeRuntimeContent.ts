import { redactSensitiveData } from "../ai/redactSensitiveData.js";
import type { HalalRuntimeContent } from "./types.js";

const DEFAULT_MAX_CONTENT_CHARACTERS = 20_000;
const MAX_DEPTH = 128;

export type RuntimeContentInspectionIssue =
  | "max_depth"
  | "unreadable_object"
  | "unreadable_property";

export interface PreparedRuntimeContent {
  canonical: string;
  localText: string;
  aiText: string;
  truncated: boolean;
  maxCharacters: number;
  inspectionIssues: RuntimeContentInspectionIssue[];
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
  const prepared = serializeRuntimeContentCanonicalWithInspection(content);

  return {
    canonical: prepared.canonical,
    localText: prepared.canonical.slice(0, safeLimit),
    aiText: redactSensitiveData(prepared.canonical).slice(0, safeLimit),
    truncated: prepared.canonical.length > safeLimit,
    maxCharacters: safeLimit,
    inspectionIssues: prepared.inspectionIssues,
  };
}

export function serializeRuntimeContentCanonical(content: HalalRuntimeContent): string {
  return serializeRuntimeContentCanonicalWithInspection(content).canonical;
}

function serializeRuntimeContentCanonicalWithInspection(content: HalalRuntimeContent): {
  canonical: string;
  inspectionIssues: RuntimeContentInspectionIssue[];
} {
  const ancestors = new WeakMap<object, string>();
  const inspectionIssues = new Set<RuntimeContentInspectionIssue>();
  const canonical = serializeValue({
    kind: content.kind,
    id: content.id,
    route: content.route,
    title: content.title,
    text: content.text,
    url: content.url,
    advertiser: content.advertiser,
    metadata: content.metadata,
    payload: content.payload,
  }, ancestors, inspectionIssues, 0, "$runtime");

  return {
    canonical,
    inspectionIssues: [...inspectionIssues],
  };
}

function serializeValue(
  value: unknown,
  ancestors: WeakMap<object, string>,
  inspectionIssues: Set<RuntimeContentInspectionIssue>,
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
  if (typeof value === "function") {
    try {
      return `function:${value.name || "anonymous"}`;
    } catch {
      inspectionIssues.add("unreadable_object");
      return `unreadable-function:${valuePath}`;
    }
  }
  if (depth >= MAX_DEPTH) {
    inspectionIssues.add("max_depth");
    return `max-depth:${valuePath}`;
  }

  const existingPath = ancestors.get(value);
  if (existingPath) {
    return `circular-reference:${existingPath}`;
  }

  let isArray: boolean;
  let isDate: boolean;
  let isUrl: boolean;
  let isRegExp: boolean;
  try {
    isArray = Array.isArray(value);
    isDate = value instanceof Date;
    isUrl = value instanceof URL;
    isRegExp = value instanceof RegExp;
  } catch {
    inspectionIssues.add("unreadable_object");
    return `unreadable-object:${valuePath}`;
  }

  if (isDate) {
    try {
      return Number.isFinite(value.getTime())
        ? `date:${value.toISOString()}`
        : "date:invalid";
    } catch {
      inspectionIssues.add("unreadable_object");
      return `unreadable-date:${valuePath}`;
    }
  }
  if (isUrl) {
    try {
      return `url:${value.href.length}:${value.href}`;
    } catch {
      inspectionIssues.add("unreadable_object");
      return `unreadable-url:${valuePath}`;
    }
  }
  if (isRegExp) {
    try {
      return `regexp:${value.source.length}:${value.source}/${value.flags}`;
    } catch {
      inspectionIssues.add("unreadable_object");
      return `unreadable-regexp:${valuePath}`;
    }
  }

  ancestors.set(value, valuePath);
  try {
    if (isArray) {
      const entries = value.map((entry, index) =>
        `${index}=${serializeValue(
          entry,
          ancestors,
          inspectionIssues,
          depth + 1,
          `${valuePath}[${index}]`,
        )}`);
      return `array:${value.length}[${entries.join(";")}]`;
    }

    let keys: string[];
    try {
      keys = Object.keys(value as Record<string, unknown>).sort(compareCodeUnits);
    } catch {
      inspectionIssues.add("unreadable_object");
      return `unreadable-object:${valuePath}`;
    }

    const entries = keys.map((key) => {
      let entry: unknown;
      try {
        entry = (value as Record<string, unknown>)[key];
      } catch {
        inspectionIssues.add("unreadable_property");
        return `${key.length}:${key}=unreadable-property`;
      }
      return `${key.length}:${key}=${serializeValue(
        entry,
        ancestors,
        inspectionIssues,
        depth + 1,
        `${valuePath}.${key}`,
      )}`;
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
