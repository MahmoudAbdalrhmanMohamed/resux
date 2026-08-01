const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PRIVATE_KEY_PATTERN = /-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g;
const BEARER_TOKEN_PATTERN = new RegExp(String.raw`\bBearer\s+[a-z0-9._~+/-]+=*`, "gi");
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const API_KEY_PATTERN = /\b(?:sk|pk|api|key|token)_[a-z0-9_-]{16,128}\b/gi;
const URL_TOKEN_PATTERN = new RegExp(String.raw`\b[a-z][a-z0-9+.-]*://[^\s]+`, "gi");
const ASSIGNMENT_PREFIX_PATTERN = /\b[a-z][a-z0-9_-]*\s*[:=]\s*/gi;
const SENSITIVE_ASSIGNMENT_KEYS = new Set([
  "pass",
  "password",
  "pwd",
  "secret",
  "key",
  "token",
  "api_key",
  "access_token",
  "refresh_token",
  "auth",
  "authorization",
]);

export function redactSensitiveData(text: string): string {
  let redacted = String(text || "");

  redacted = redacted.replace(EMAIL_PATTERN, "[EMAIL_REDACTED]");
  redacted = redacted.replace(PRIVATE_KEY_PATTERN, "[PRIVATE_KEY_REDACTED]");
  redacted = redacted.replace(BEARER_TOKEN_PATTERN, "Bearer [TOKEN_REDACTED]");
  redacted = redacted.replace(JWT_PATTERN, "[JWT_REDACTED]");
  redacted = redactAssignments(redacted);
  redacted = redacted.replace(API_KEY_PATTERN, "[API_KEY_REDACTED]");
  redacted = redacted.replace(URL_TOKEN_PATTERN, redactUrlCredentials);

  return redacted;
}

function redactAssignments(text: string): string {
  let output = "";
  let cursor = 0;
  ASSIGNMENT_PREFIX_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ASSIGNMENT_PREFIX_PATTERN.exec(text)) !== null) {
    const key = readAssignmentKey(match[0]);
    if (!SENSITIVE_ASSIGNMENT_KEYS.has(key)) {
      continue;
    }

    const separator = findAssignmentSeparator(match[0]);
    const valueStart = match.index + match[0].length;
    const valueEnd = findAssignmentValueEnd(text, valueStart);
    output += text.slice(cursor, match.index);
    output += `${match[0].slice(0, separator).trim()}=[REDACTED]`;
    cursor = valueEnd;
    ASSIGNMENT_PREFIX_PATTERN.lastIndex = valueEnd;
  }

  return output + text.slice(cursor);
}

function readAssignmentKey(prefix: string): string {
  return prefix
    .slice(0, findAssignmentSeparator(prefix))
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
}

function findAssignmentSeparator(prefix: string): number {
  const colon = prefix.indexOf(":");
  const equals = prefix.indexOf("=");
  if (colon < 0) return equals;
  if (equals < 0) return colon;
  return Math.min(colon, equals);
}

function findAssignmentValueEnd(text: string, start: number): number {
  const quote = text[start];
  if (quote === '"' || quote === "'") {
    const closingQuote = text.indexOf(quote, start + 1);
    const lineEnd = findLineEnd(text, start + 1);
    if (closingQuote >= 0 && closingQuote < lineEnd) {
      return closingQuote + 1;
    }
    return lineEnd;
  }

  let end = start;
  while (end < text.length && !isAssignmentDelimiter(text[end])) {
    end += 1;
  }
  return end;
}

function findLineEnd(text: string, start: number): number {
  const carriageReturn = text.indexOf("\r", start);
  const lineFeed = text.indexOf("\n", start);
  if (carriageReturn < 0) return lineFeed < 0 ? text.length : lineFeed;
  if (lineFeed < 0) return carriageReturn;
  return Math.min(carriageReturn, lineFeed);
}

function isAssignmentDelimiter(value: string): boolean {
  return value === " "
    || value === "\t"
    || value === "\r"
    || value === "\n"
    || value === ","
    || value === ";"
    || value === "#";
}

function redactUrlCredentials(candidate: string): string {
  const authorityStart = candidate.indexOf("://") + 3;
  if (authorityStart < 3) {
    return candidate;
  }

  const authorityEnd = findAuthorityEnd(candidate, authorityStart);
  const authority = candidate.slice(authorityStart, authorityEnd);
  const at = authority.lastIndexOf("@");
  const colon = authority.indexOf(":");
  if (colon < 0 || at <= colon + 1) {
    return candidate;
  }

  return candidate.slice(0, authorityStart + colon + 1)
    + "[REDACTED]"
    + candidate.slice(authorityStart + at);
}

function findAuthorityEnd(candidate: string, start: number): number {
  let end = candidate.length;
  for (const delimiter of ["/", "?", "#"]) {
    const index = candidate.indexOf(delimiter, start);
    if (index >= 0 && index < end) {
      end = index;
    }
  }
  return end;
}
