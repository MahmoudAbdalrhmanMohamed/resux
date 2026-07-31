export function redactSensitiveData(text: string): string {
  let redacted = String(text || "");

  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL_REDACTED]",
  );

  redacted = redacted.replace(
    /(pass(?:word)?|pwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|auth(?:orization)?)\s*[:=]\s*(?:["'][^"'\r\n]+["']|[^\s,;#]+)/gi,
    "$1=[REDACTED]",
  );

  redacted = redacted.replace(
    /-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g,
    "[PRIVATE_KEY_REDACTED]",
  );

  redacted = redacted.replace(
    /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
    "Bearer [TOKEN_REDACTED]",
  );

  redacted = redacted.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    "[JWT_REDACTED]",
  );

  redacted = redacted.replace(
    /\b(?:sk|pk|api|key|token)_[a-zA-Z0-9_-]{16,128}\b/gi,
    "[API_KEY_REDACTED]",
  );

  redacted = redacted.replace(
    /([a-z][a-z0-9+.-]*:\/\/[^\s:/?#]+:)[^\s@/]+@/gi,
    "$1[REDACTED]@",
  );

  return redacted;
}
