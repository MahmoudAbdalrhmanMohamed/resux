const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PRIVATE_KEY_PATTERN = /-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g;
const BEARER_TOKEN_PATTERN = new RegExp(String.raw`\bBearer\s+[a-z0-9._~+/-]+=*`, "gi");
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const API_KEY_PATTERN = /\b(?:sk|pk|api|key|token)_[a-z0-9_-]{16,128}\b/gi;
const URL_TOKEN_PATTERN = new RegExp(String.raw`\b[a-z][a-z0-9+.-]*://[^\s]+`, "gi");
const ASSIGNMENT_PREFIX_PATTERN = /\b[a-z][a-z0-9_-]*\s*[:=]\s*/gi;
const SENSITIVE_ASSIGNMENT_FRAGMENTS = [
  "pass",
  "pwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "auth",
  "credential",
  "private_key",
];

export function redactSensitiveData(text: string): string {
  let redacted = String(text || "");

  // Redact URL user information before email matching can consume the
  // password-and-host portion and leave a username or token behind.
  redacted = redacted.replace(URL_TOKEN_PATTERN, redactUrlCredentials);
  redacted = redacted.replace(EMAIL_PATTERN, "[EMAIL_REDACTED]");
  redacted = redacted.replace(PRIVATE_KEY_PATTERN, "[PRIVATE_KEY_REDACTED]");
  redacted = redacted.replace(BEARER_TOKEN_PATTERN, "Bearer [TOKEN_REDACTED]");
  redacted = redacted.replace(JWT_PATTERN, "[JWT_REDACTED]");
  redacted = redactAssignments(redacted);
  redacted = redacted.replace(API_KEY_PATTERN, "[API_KEY_REDACTED]");

  return redacted;
}

function redactAssignments(text: string): string {
  let output = "";
  let cursor = 0;
  ASSIGNMENT_PREFIX_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ASSIGNMENT_PREFIX_PATTERN.exec(text)) !== null) {
    const key = readAssignmentKey(match[0]);
    if (!SENSITIVE_ASSIGNMENT_FRAGMENTS.some((fragment) => key.includes(fragment))) {
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
    const lineEnd = findLineEnd(text, start + 1);
    const closingQuote = findClosingQuote(text, start, quote, lineEnd);
    return closingQuote >= 0 ? closingQuote + 1 : lineEnd;
  }

  let end = start;
  while (end < text.length && !isAssignmentDelimiter(text[end])) {
    end += 1;
  }
  return end;
}

function findClosingQuote(text: string, start: number, quote: string, lineEnd: number): number {
  for (let index = start + 1; index < lineEnd; index += 1) {
    if (text[index] === quote && !isEscaped(text, index)) {
      return index;
    }
  }
  return -1;
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
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
  if (at <= 0) {
    return candidate;
  }

  return candidate.slice(0, authorityStart)
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
