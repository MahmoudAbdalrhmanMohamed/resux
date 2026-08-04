import { describe, expect, it } from "vitest";
import {
  createHalalRuntimeGuard,
  createSignedHalalRuntimeDecision,
  verifySignedHalalRuntimeDecision,
} from "../src/halal-core/runtime/index.js";
import type { SignedHalalRuntimeDecision } from "../src/halal-core/runtime/types.js";

const REVIEW_SECRET = "resux-runtime-review-secret-at-least-32-characters";

describe("halal runtime guard", () => {
  it("detects blocked logic inside nested dynamic page payloads", async () => {
    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
    });

    const decision = await guard.checkDynamicPage({
      route: "/offers/today",
      title: "Today offers",
      payload: {
        sections: [
          { type: "hero", content: { callToAction: "Join our online casino jackpot" } },
        ],
      },
    });

    expect(decision.status).toBe("blocked");
    expect(decision.allowed).toBe(false);
    expect(decision.categories).toContain("haram_business");
  });

  it("fails closed for an ad when required AI verification is unavailable", async () => {
    const guard = createHalalRuntimeGuard({
      ai: { enabled: true },
    });

    const decision = await guard.checkAd({
      id: "safe-looking-ad",
      title: "New summer shoes",
      text: "Comfortable shoes for everyday use.",
      url: "https://shop.example/products/shoes",
      advertiser: "Example Shop",
    });

    expect(decision.status).toBe("review_required");
    expect(decision.allowed).toBe(false);
    expect(decision.categories).toContain("unverified_ad");
  });

  it("allows safe dynamic content when AI is optional", async () => {
    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
    });

    const decision = await guard.checkDynamicPage({
      route: "/library/books",
      title: "Library books",
      payload: { books: [{ title: "Learning TypeScript", available: true }] },
    });

    expect(decision.status).toBe("allowed");
    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe("local_rules");
  });

  it("learns an exact reviewed decision only when it has a valid signature", async () => {
    const ad = {
      kind: "advertisement" as const,
      id: "reviewed-ad",
      title: "Local bookshop",
      text: "New programming books are available.",
      url: "https://books.example/new",
      advertiser: "Example Books",
    };
    const signed = createSignedHalalRuntimeDecision(ad, {
      status: "allowed",
      reason: "Advertiser and destination were manually verified.",
      reviewerId: "reviewer-01",
    }, REVIEW_SECRET);

    expect(verifySignedHalalRuntimeDecision(signed, REVIEW_SECRET)).toBe(true);

    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
      reviewSecret: REVIEW_SECRET,
      reviewedDecisions: [signed],
    });
    const decision = await guard.check(ad);

    expect(decision.status).toBe("allowed");
    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe("reviewed_memory");
  });

  it("ignores tampered reviewed memory", async () => {
    const ad = {
      kind: "advertisement" as const,
      id: "tampered-ad",
      title: "Local bookshop",
      text: "New programming books are available.",
    };
    const signed = createSignedHalalRuntimeDecision(ad, {
      status: "allowed",
      reason: "Original reviewed reason.",
      reviewerId: "reviewer-01",
    }, REVIEW_SECRET);
    const tampered = {
      ...signed,
      reason: "Changed after signing.",
    } as SignedHalalRuntimeDecision;

    expect(verifySignedHalalRuntimeDecision(tampered, REVIEW_SECRET)).toBe(false);

    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
      reviewSecret: REVIEW_SECRET,
      reviewedDecisions: [tampered],
    });
    const decision = await guard.check(ad);

    expect(decision.status).toBe("review_required");
    expect(decision.source).toBe("local_rules");
  });

  it("never lets reviewed allow memory bypass a local hard block", async () => {
    const ad = {
      kind: "advertisement" as const,
      id: "blocked-reviewed-ad",
      title: "Casino jackpot",
      text: "Place your betting order now.",
      url: "https://casino.example",
    };
    const signed = createSignedHalalRuntimeDecision(ad, {
      status: "allowed",
      reason: "Incorrect reviewer decision used as a regression fixture.",
      reviewerId: "reviewer-01",
    }, REVIEW_SECRET);
    const guard = createHalalRuntimeGuard({
      ai: { enabled: false },
      reviewSecret: REVIEW_SECRET,
      reviewedDecisions: [signed],
    });

    const decision = await guard.check(ad);

    expect(decision.status).toBe("blocked");
    expect(decision.allowed).toBe(false);
    expect(decision.source).toBe("local_rules");
  });

  it("filters rejected ads before rendering", async () => {
    const guard = createHalalRuntimeGuard({
      ai: { enabled: false, requireForAds: false },
    });
    const result = await guard.filterAds([
      { id: "books", title: "Book shop", text: "Programming books" },
      { id: "gambling", title: "Casino", text: "Betting jackpot" },
    ]);

    expect(result.allowed.map((ad) => ad.id)).toEqual(["books"]);
    expect(result.rejected.map((entry) => entry.ad.id)).toEqual(["gambling"]);
  });
});
