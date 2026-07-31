import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyProject,
  resolveAiTimeoutMs,
  validateAiEndpoint,
} from "../src/halal-core/ai/classifyProject.js";
import { redactSensitiveData } from "../src/halal-core/ai/redactSensitiveData.js";
import { validateAiResponse } from "../src/halal-core/ai/validateAiResponse.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("halal AI regressions", () => {
  it("fails closed for malformed or invalid classifier output", () => {
    expect(validateAiResponse("not json").status).toBe("review_required");
    expect(validateAiResponse(JSON.stringify({ status: "maybe", riskLevel: "unknown" })).status)
      .toBe("review_required");
    expect(validateAiResponse(JSON.stringify({
      status: "allowed",
      riskLevel: "low",
      confidence: 4,
      categories: ["safe", 1],
      reasons: ["checked", null],
    }))).toMatchObject({
      status: "allowed",
      confidence: 1,
      categories: ["safe"],
      reasons: ["checked"],
    });
  });

  it("rejects insecure remote endpoints before sending credentials", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    expect(() => validateAiEndpoint("http://example.com/classify")).toThrow(/HTTPS/);
    expect(() => validateAiEndpoint("https://user:pass@example.com/classify")).toThrow(/credentials/);
    expect(validateAiEndpoint("http://localhost:8080/classify").hostname).toBe("localhost");

    const result = await classifyProject(createScannedData(), "private-key", "http://example.com/classify");
    expect(result.status).toBe("review_required");
    expect(result.categories).toContain("ai_configuration_error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds configured request timeouts", () => {
    expect(resolveAiTimeoutMs("invalid")).toBe(15_000);
    expect(resolveAiTimeoutMs("25")).toBe(25);
    expect(resolveAiTimeoutMs("9999999")).toBe(120_000);
  });

  it("redacts private keys, tokens, assignments, and URL credentials", () => {
    const source = [
      "password='super-secret'",
      "Authorization: Bearer abc.def.ghi",
      "postgres://admin:database-password@example.com/app",
      "-----BEGIN PRIVATE KEY-----\nabc-123\n-----END PRIVATE KEY-----",
      "sk_abcdefghijklmnopqrstuvwxyz123456",
    ].join("\n");

    const redacted = redactSensitiveData(source);

    expect(redacted).not.toContain("super-secret");
    expect(redacted).not.toContain("abc.def.ghi");
    expect(redacted).not.toContain("database-password");
    expect(redacted).not.toContain("abc-123");
    expect(redacted).not.toContain("sk_abcdefghijklmnopqrstuvwxyz123456");
    expect(redacted).toContain("[PRIVATE_KEY_REDACTED]");
  });
});

function createScannedData() {
  return {
    routes: [],
    pages: [],
    components: [],
    metadata: {},
    envNames: [],
    dependencies: {},
    i18nWords: [],
    contentTexts: [],
    endpoints: [],
  };
}
