# Resux Resume-First Architecture

**Resume-First** is the Resux execution strategy for making server-rendered HTML useful before the browser downloads the full framework runtime.

The goal is not to reproduce another framework's API. Resux combines proven ideas around resumability, islands, deferred activation, server/client boundaries, streaming, compiler-driven output, and intent prefetching while keeping its own resumable SFC model.

## The startup rule

The initial page should pay only for client work that is actually required.

Resux classifies each server-rendered document into one of three boot paths:

| Mode | Initial browser work | Use case |
| --- | --- | --- |
| `none` | No Resux payload assignment and no Resux runtime script | Static/server-only HTML |
| `interaction` | Serialized state plus the tiny Resume-First bootstrap | Resumable events or deferred client work |
| `eager` | Full browser runtime | Client work that must start immediately |

Normal links are not a reason to boot the framework. Before Resux resumes, the browser's native navigation behavior is the baseline.

## Zero-JS first

A page that contains no resumable events, pending client work, client plugins/middleware, islands, enhancements, or managed media must remain a real zero-JavaScript Resux page.

This is an invariant, not a special rendering mode.

Do not add the full client runtime merely to provide:

- client-side navigation;
- prefetching;
- lifecycle bookkeeping;
- framework-global initialization that a static page does not need.

Those capabilities become available after the document has a legitimate reason to resume.

## Resumable events

For event-driven Resux components, the server emits:

- useful HTML;
- serialized scope/state data;
- module identifiers;
- `data-rx-on-*` event metadata.

The Resume-First bootstrap registers only event types that are present in the rendered document. On the first matching interaction it:

1. preserves synchronous event semantics such as `prevent`, `stop`, `self`, keyboard/system modifiers, and mouse-button modifiers;
2. imports the full browser runtime once;
3. hands the original event to the normal Resux delegated-event dispatcher;
4. resumes the serialized scope and lazily imports the relevant component/handler module.

A failed runtime import must remain retryable.

## Deferred client work

Client enhancements can already declare a trigger. Resume-First makes that trigger meaningful before the main runtime has loaded.

Supported bootstrap triggers are:

- `visible`;
- `interaction`;
- `idle`;
- `page-load`;
- `manual`;
- `immediate`.

`immediate` is intentionally eager. The other triggers can keep the full runtime off the critical initial execution path.

Example:

```vue
<ClientEnhance
  name="chart"
  trigger="visible"
  :options="{ datasetId: 'sales' }"
/>
```

## Vue islands

Vue remains an explicit compatibility/runtime boundary, not the normal Resux component model.

Existing islands preserve compatibility by defaulting to immediate mounting:

```vue
<VueIsland name="RichEditor" :props="{ documentId }" />
```

Non-critical islands can opt into the same demand-driven trigger model:

```vue
<VueIsland
  name="AnalyticsChart"
  trigger="visible"
  :props="{ range: '30d' }"
/>
```

Once the full runtime is present, Resux still honors the island's trigger instead of mounting every scheduled island indiscriminately.

## Server-first and streaming rules

The server should do work that does not require browser capabilities. Client boundaries should stay as deep and narrow as practical.

Resux should continue to:

- render useful HTML on the server;
- serialize only state that is needed to resume;
- avoid duplicate server/client data fetching where serialized results are sufficient;
- stream shell/body/tail output when response semantics allow it;
- keep client-only packages and Vue-owned UI behind explicit boundaries.

Streaming and resumability solve different problems: streaming improves when HTML arrives; resumability reduces how much work must be replayed after it arrives.

## Compiler-first rules

The compiler should remove work from runtime whenever it can do so safely.

Preferred direction:

- extract event metadata at compile time;
- generate direct expression/handler closures rather than runtime interpretation where possible;
- split handler/client modules at the narrowest useful boundary;
- statically identify server-only and client-only work;
- produce deterministic manifests that let runtime loading stay demand-driven.

Do not move complexity into the browser when build-time analysis can make the decision once.

## Navigation and prefetch

Resux may use intent-based route prefetching after the client runtime is active, but route prefetching must not itself force a static initial page to boot the framework.

Rules:

- native navigation is the pre-resume fallback;
- prefetch on clear intent rather than fetching every possible route;
- deduplicate route payload requests;
- keep failure cooldowns/timeouts;
- do not prefetch API/media/internal framework paths as page routes.

## Performance guardrails

`npm run report:runtime` and `npm run check:runtime-size` track both the complete generated browser runtime and the Resume-First bootstrap.

The bootstrap has its own strict size budget because it is the code allowed onto the critical path for deferred pages. Growing the full optional runtime and growing the initial bootstrap are not equivalent regressions.

A performance change should answer:

1. Does a static page still ship zero Resux JavaScript?
2. Does an event-only/deferred page still avoid the full runtime before its trigger?
3. Did the Resume-First bootstrap remain within budget?
4. Did the change accidentally widen a server/client boundary?
5. Does the existing runtime still preserve event semantics after resumption?

## What Resux takes from other frameworks

These are architectural lessons, not copied public APIs.

### Qwik — resumability

Qwik documents resumability as pausing server execution and continuing in the browser without replaying the full application through hydration. Resux follows the same high-level objective for normal components: serialize the information required to continue and lazy-load code on demand.

Reference: https://qwik.dev/docs/concepts/resumable/

### Astro — static HTML and explicit islands

Astro's islands model keeps most of a page as static HTML and hydrates only explicitly interactive islands. Resux applies the same cost discipline: zero-JS server HTML is valid output, and Vue is an explicit island boundary rather than a page-wide default.

Reference: https://docs.astro.build/en/concepts/islands/

### Angular — deferrable work and event-aware activation

Angular's `@defer` and incremental hydration model demonstrate the value of viewport/interaction/idle-style triggers and preserving user interactions while deferred code becomes ready. Resux uses trigger-driven client work and preserves the original resumable event across runtime loading.

References:

- https://angular.dev/guide/templates/defer
- https://angular.dev/guide/incremental-hydration

### Nuxt — ergonomic lazy hydration and server payload reuse

Nuxt exposes visibility, idle, interaction and other lazy-hydration strategies, and its SSR data utilities avoid repeating server fetches on the client. Resux keeps similarly ergonomic trigger choices while applying them to resumable work rather than making hydration the default component lifecycle.

References:

- https://nuxt.com/docs/4.x/directory-structure/components
- https://nuxt.com/docs/4.x/api/composables/use-hydration

### Next.js — narrow client boundaries, streaming and intent prefetch

Next.js recommends keeping interactive client boundaries focused while rendering server-capable UI on the server. Its App Router also combines streaming and route prefetching. Resux follows those principles without adopting React Server Components as its component protocol.

References:

- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/learn/dashboard-app/streaming
- https://nextjs.org/docs/app/guides/prefetching

### Svelte — compiler-driven lean output

Svelte explicitly uses a compiler to turn declarative components into lean optimized JavaScript. Resux should likewise prefer compile-time extraction and specialization over expanding a generic browser runtime.

Reference: https://svelte.dev/docs/svelte/overview

## What Resux should not copy

Do not add a feature because another framework has it. A feature belongs in Resux only when it supports the framework's architecture and can be tested as a real contract.

In particular:

- do not make hydration the default for normal Resux components;
- do not add a second component/runtime model that competes with resumability;
- do not load client code merely to emulate SPA behavior;
- do not hide large startup costs behind convenience APIs;
- do not claim benchmark superiority without reproducible measurements.

The target is concrete: **useful HTML first, zero work when no client work exists, and resume only the smallest required behavior when demand appears.**
