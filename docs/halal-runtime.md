# Halal Runtime Guard

The build-time Halal Core scanner cannot see content that arrives later from APIs, CMS platforms, ad networks, or users. The runtime guard checks that content on the server before it is rendered.

It combines:

1. deterministic local rules for clear prohibited or harmful patterns;
2. an optional OpenAI-compatible LLM endpoint for contextual classification;
3. signed reviewed memory for exact content that a trusted reviewer has already checked.

The guard is an engineering policy mechanism. It does not issue fatwas or replace qualified Islamic review.

## Dynamic pages

```ts
import { createHalalRuntimeGuard } from "resuxjs/halal";

const halal = createHalalRuntimeGuard({
  ai: {
    endpoint: process.env.RESUX_AI_ENDPOINT,
    apiKey: process.env.RESUX_AI_API_KEY,
    requireForDynamicContent: true,
  },
});

const pageData = await loadPageFromCms();
const decision = await halal.checkDynamicPage({
  route: "/offers/today",
  title: pageData.title,
  payload: pageData,
});

if (!decision.allowed) {
  throw new Error(`Dynamic page rejected: ${decision.reasons.join("; ")}`);
}

return pageData;
```

## Ads

Ads require AI verification by default. If the AI endpoint is unavailable and there is no valid signed review, the ad receives `review_required` and must not be rendered.

```ts
const result = await halal.filterAds(await adNetwork.getAds());

// Render only this list.
return result.allowed;
```

To use local rules without requiring an LLM for every ad, set `requireForAds: false`. This is less strict and should only be used when the ad source is already controlled.

## Reviewed learning memory

The guard does not train itself from untrusted traffic. That would allow users or ad providers to poison the policy. Instead, a reviewer can sign an exact decision:

```ts
import { createSignedHalalRuntimeDecision } from "resuxjs/halal";

const signedDecision = createSignedHalalRuntimeDecision(ad, {
  status: "allowed",
  reason: "Advertiser and destination were manually verified.",
  reviewerId: "reviewer-01",
}, process.env.RESUX_HALAL_REVIEW_SECRET);
```

Pass signed decisions to the guard:

```ts
const halal = createHalalRuntimeGuard({
  reviewSecret: process.env.RESUX_HALAL_REVIEW_SECRET,
  reviewedDecisions: approvedRuntimeDecisions,
  ai: { enabled: true },
});
```

A signed `allowed` decision applies only to the exact reviewed content fingerprint. It cannot override a current local `blocked` or `review_required` result.

## Recommended server flow

1. Fetch dynamic content or ads on the server.
2. Call `checkDynamicPage`, `checkAd`, `check`, or `filterAds`.
3. Render only when `decision.allowed` is `true`.
4. Store rejected decisions for human review.
5. Add only signed reviewer decisions to `reviewedDecisions`.

Keep `RESUX_AI_API_KEY` and `RESUX_HALAL_REVIEW_SECRET` server-side. The review secret must contain at least 32 characters.
