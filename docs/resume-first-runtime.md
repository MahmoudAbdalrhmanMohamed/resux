# Resux Resume-First Runtime

**Resux = Resumability + User Experience.**

The **Resume-First Runtime** is Resux's performance architecture: useful HTML is the application baseline, and browser JavaScript is an escalation path that is loaded only when the page proves it needs client behavior.

The primary optimization target is **initial load**. Resux should not download, parse, execute, or hydrate code merely because a page was rendered by a framework.

## Core rules

1. **HTML first.** Server output must be useful before client code runs.
2. **Zero JavaScript when possible.** A page with no client work must not receive the Resux payload or browser runtime.
3. **Resume, do not re-run.** Serializable state and handler metadata let interaction continue from server output instead of recreating the component tree.
4. **Events are lazy boundaries.** Event-only pages load the full runtime on the first declared Resux interaction.
5. **Native browser behavior is the baseline.** Resux does not load JavaScript only to turn ordinary links into SPA navigation.
6. **Islands are explicit runtime boundaries.** Vue is used only where a widget genuinely requires a Vue-owned subtree.
7. **Activation is demand-driven.** Islands can resume immediately, on interaction, when visible, when idle, or never.
8. **Compile work instead of shipping work.** The compiler should keep moving framework bookkeeping from the browser to build/server time.
9. **Measure startup cost.** Bootstrap and full-runtime size budgets are CI contracts, not informal goals.
10. **Progressive enhancement over global hydration.** Features that can remain server/native should remain server/native.

## Browser boot modes

Each rendered document is classified into the smallest required boot path.

| Mode | Initial browser work | Typical page |
| --- | --- | --- |
| `none` | No Resux payload and no Resux runtime | Static content, normal links |
| `interaction` | Serialized state + tiny inline resume bootstrap | Resux component with resumable DOM events |
| `eager` | Serialized state + full client runtime | Pending client data, client plugins/middleware, managed media, immediate islands, client enhancements |

This classification is intentionally based on the **rendered result**, not a blanket application setting.

## Event resumability

Server-rendered event attributes already identify the exact scope, module, and handler:

```html
<button data-rx-on-click="s0:c0:increment">Increment</button>
```

For an event-only page, Resux now emits a tiny bootstrap that:

1. registers only the event types found in the rendered HTML;
2. preserves synchronous `submit`, `.prevent`, `.passive`, and `.stop` semantics;
3. dynamically imports the full runtime once;
4. hands the original DOM event to the resumable dispatcher;
5. lets the runtime lazily import the component handler module and continue from serialized state.

There is no component-tree hydration pass before the first interaction.

## Resume-driven Vue islands

Vue islands are explicit opt-in runtime boundaries.

```vue
<VueIsland
  name="AnalyticsChart"
  :props="{ series }"
  resume="visible"
/>
```

Supported policies:

| Policy | Behavior |
| --- | --- |
| `immediate` | Mount as soon as the Resux client runtime initializes. This is the backwards-compatible default. |
| `interaction` | Start mounting on pointer, keyboard, or focus interaction. |
| `visible` | Mount when the island enters the viewport. |
| `idle` | Mount in idle time, with a bounded timer fallback. |
| `never` | Keep the server placeholder static and never import the island module. |

The policy is serialized into SSR HTML as `data-rx-vue-resume`, so the client can schedule the island without discovering application intent by executing component code.

## What Resux takes from other frameworks

Resux should copy **principles that reduce user-visible cost**, not copy framework APIs blindly.

### Qwik

Useful idea: resumability, serialized event references, global/delegated event handling, and lazy code loading at interaction boundaries.

Resux direction: normal Resux components remain server-rendered + serializable, and event pages use a tiny resume bootstrap before the full runtime.

Not copied: Qwik's `$` API, QRL syntax, or optimizer contract. Resux keeps its own Vue-like SFC authoring model.

Reference: https://qwik.dev/docs/concepts/resumable/

### Astro

Useful idea: zero client JavaScript for static HTML and explicit islands for interactive UI.

Resux direction: static pages use the `none` boot mode; Vue islands are explicit and can resume on demand.

Not copied: Astro's multi-framework component model. Resux currently treats Vue islands as an explicit compatibility/runtime boundary.

Reference: https://docs.astro.build/en/concepts/islands/

### Angular

Useful idea: incremental/deferred hydration triggers such as interaction, viewport, idle, and never, plus a stronger shift toward fine-grained/zoneless execution.

Resux direction: island `resume` policies use demand-based triggers while normal components avoid hydration entirely.

Not copied: Angular's component runtime, zone model, or hydration machinery.

Reference: https://angular.dev/guide/hydration

### Nuxt

Useful idea: SSR payload reuse, lazy hydration controls, strong server/client boundaries, route conventions, and Nitro deployment ergonomics.

Resux direction: preserve serializable server state, keep client/server package boundaries explicit, and continue using Nitro as the server/deployment layer.

Not copied: Vue hydration as the normal component model. In Resux, Vue is an island boundary rather than the default browser runtime.

Reference: https://nuxt.com/docs/guide/best-practices/performance

### Next.js

Useful idea: server-first rendering, static shells, streaming dynamic work, code splitting, and intent-driven navigation prefetch.

Resux direction: keep SSR/streaming and route payload work server-first, and load client code only after a real client requirement appears.

Not copied: React Server Components or React's client/server component protocol.

Reference: https://nextjs.org/docs/app/guides/prefetching

### Svelte

Useful idea: use compilation to remove browser framework work rather than solving every problem at runtime.

Resux direction: move more dependency analysis, event metadata, static decisions, and update planning into the compiler.

Not copied: Svelte syntax or its component runtime.

Reference: https://svelte.dev/

## Initial-load performance contract

The critical path should follow this order:

```text
request
  -> server/compiler output
  -> useful HTML
  -> paint
  -> no Resux JS if no client work

event-only page:
  -> useful HTML
  -> tiny resume bootstrap
  -> paint
  -> first matching interaction
  -> full runtime import
  -> handler-module import
  -> state continues

island page:
  -> useful HTML / placeholder
  -> policy scheduled
  -> island module imported only when policy activates
```

The repository's `runtime-size-budget.json` includes explicit limits for the generated resume bootstrap. `npm run metrics:runtime:check` must fail when those budgets regress.

## Deliberate non-goals

Resume-First does **not** mean:

- forcing every page into SPA navigation;
- hydrating every server-rendered component;
- importing Vue for normal Resux components;
- preloading every possible route or handler;
- hiding large client bundles behind optimistic naming;
- cloning another framework's public API.

## Next performance work

Future improvements should preserve this ordering:

1. split more optional features out of the monolithic full runtime;
2. make deferred-island pages able to delay even the full Resux runtime, not only the island module;
3. prune serialized payload fields through compiler liveness analysis;
4. add network-aware route/module prefetching that respects Save-Data and slow connections;
5. extend streaming/static-shell behavior without adding hydration requirements;
6. benchmark cold mobile startup, interaction latency, and JavaScript bytes in Resux Lab before raising budgets.

When a feature conflicts with initial-load cost, prefer the design that keeps useful HTML and native browser behavior available with less JavaScript.
