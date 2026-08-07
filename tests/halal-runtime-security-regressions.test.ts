import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHalalRuntimeGuard,
  createRuntimeContentFingerprint,
  createSignedHalalRuntimeDecision,
} from "../src/halal-core/runtime/index.js";

const REVIEW_SECRET = "resux-runtime-review-secret-at-least-32-characters";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("halal runtime security regressions", () => {
  it("does not hide prohibited local content behind sensitive-looking keys", async () => {
    const guard = createHalalRuntimeGuard({ ai: { enabled: false } });

    const decision = await guard.checkDynamicPage({
      route: "/user-content",
      payload: {
        apiToken: "Join our online casino jackpot and place a betting order.",
      },
    });

    expect(decision.status).toBe("blocked");
    expect(decision.allowed).toBe(false);
    expect(decision.categories).toContain("haram_business");
  });

  it("fails closed when runtime content exceeds the configured scan limit", async () => {
    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
      maxContentCharacters: 64,
    });

    const decision = await guard.checkDynamicPage({
      route: "/large-payload",
      text: "Safe content ".repeat(40),
    });

    expect(decision.status).toBe("review_required");
    expect(decision.allowed).toBe(false);
    expect(decision.categories).toContain("runtime_content_truncated");
  });

  it("fingerprints the complete unredacted content", () => {
    const sharedPrefix = "safe-prefix-".repeat(2_000);
    const first = {
      kind: "dynamic_page" as const,
      route: "/large-review",
      payload: {
        apiToken: "token_aaaaaaaaaaaaaaaaaaaaaaaa",
        content: `${sharedPrefix}first-tail`,
      },
    };
    const second = {
      ...first,
      payload: {
        apiToken: "token_bbbbbbbbbbbbbbbbbbbbbbbb",
        content: `${sharedPrefix}second-tail`,
      },
    };

    expect(createRuntimeContentFingerprint(first)).not.toBe(createRuntimeContentFingerprint(second));
  });

  it("uses the newest valid reviewed decision instead of array order", async () => {
    vi.useFakeTimers();
    const content = {
      kind: "dynamic_page" as const,
      route: "/reviewed-page",
      text: "A safe reviewed page.",
    };

    vi.setSystemTime(new Date("2026-08-06T08:00:00.000Z"));
    const olderAllowed = createSignedHalalRuntimeDecision(content, {
      status: "allowed",
      reason: "Initial approval.",
      reviewerId: "reviewer-01",
    }, REVIEW_SECRET);
    vi.setSystemTime(new Date("2026-08-06T09:00:00.000Z"));
    const newerBlocked = createSignedHalalRuntimeDecision(content, {
      status: "blocked",
      reason: "Approval was revoked after destination review.",
      reviewerId: "reviewer-02",
    }, REVIEW_SECRET);

    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
      reviewSecret: REVIEW_SECRET,
      reviewedDecisions: [olderAllowed, newerBlocked],
    });
    const decision = await guard.check(content);

    expect(decision.status).toBe("blocked");
    expect(decision.allowed).toBe(false);
    expect(decision.source).toBe("reviewed_memory");
    expect(decision.reasons[0]).toContain("reviewer-02");
  });

  it("keeps optional dynamic AI failures advisory", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("AI service offline")));
    const guard = createHalalRuntimeGuard({
      ai: {
        endpoint: "https://ai.example/v1/chat/completions",
        apiKey: "test-api-key",
      },
    });

    const decision = await guard.checkDynamicPage({
      route: "/library/books",
      title: "Library books",
      payload: { books: [{ title: "Learning TypeScript" }] },
    });

    expect(decision.status).toBe("allowed");
    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe("local_rules");
  });

  it("keeps confidence attached to the dominant AI decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            status: "blocked",
            riskLevel: "high",
            categories: ["contextual_block"],
            confidence: 0.42,
            reasons: ["The destination promotes a prohibited activity."],
            recommendedAction: "Do not render this content.",
          }),
        },
      }],
    }), { status: 200 })));
    const guard = createHalalRuntimeGuard({
      ai: {
        endpoint: "https://ai.example/v1/chat/completions",
        apiKey: "test-api-key",
      },
    });

    const decision = await guard.checkDynamicPage({
      route: "/offers/contextual",
      title: "Contextual offer",
      text: "A locally neutral description.",
    });

    expect(decision.status).toBe("blocked");
    expect(decision.confidence).toBe(0.42);
    expect(decision.source).toBe("local_and_ai");
  });
});
