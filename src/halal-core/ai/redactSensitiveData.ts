export function redactSensitiveData(text: string): string {
  let redacted = text;

  // Redact emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  redacted = redacted.replace(emailRegex, "[EMAIL_REDACTED]");

  // Redact password assignments
  const passwordRegex = /(pass|password|pwd|secret|key|token|auth)\s*[:=]\s*["'][^"']+["']/gi;
  redacted = redacted.replace(passwordRegex, "$1: [REDACTED]");

  // Redact private key blocks
  const privateKeyRegex = /-----BEGIN[A-Z ]+PRIVATE KEY-----[^-]+-----END[A-Z ]+PRIVATE KEY-----/g;
  redacted = redacted.replace(privateKeyRegex, "[PRIVATE_KEY_REDACTED]");

  // Redact Bearer / JWT tokens
  const bearerRegex = /bearer\s+[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.?[a-zA-Z0-9-_=]*/gi;
  redacted = redacted.replace(bearerRegex, "Bearer [JWT_REDACTED]");

  // Redact typical API keys (hex/base64 strings longer than 16 chars)
  const apiKeyRegex = /(sk|pk|api|key)_[a-zA-Z0-9]{16,64}/gi;
  redacted = redacted.replace(apiKeyRegex, "[API_KEY_REDACTED]");

  return redacted;
}
