# Changelog

All notable changes to Resux are documented here.

Resux follows Semantic Versioning. Before 1.0, minor releases may contain breaking API changes when they are clearly documented.

## [Unreleased]

### Fixed

- A scoped slot outside any `v-if` or `v-for` (for example `<slot name="header" :count="n">`) did not update when the child re-rendered. A `<slot>` with bound props is now a block, so the child asks the parent for the slot content again. Plain slots with only static attributes are unchanged.

## [0.5.0-beta.2] - 2026-11-27

Second beta of the 0.5 line. It adds named and scoped slots, native DOM events on a component tag (`@click` on `<Child>`), and a much smaller resume bootstrap on pages without deferred targets. The size budget for the built package is raised to 1.80 MB. Pages that do not use slots or component-tag events keep the same payload; resume behavior is unchanged.

Known limit: text in a scoped slot that reads the parent's state updates on the child's next re-render. See the Current Limits page in the docs.

- **Smaller resume bootstrap on pages without deferred targets**: the trigger scheduling code for deferred enhancements and Vue islands (visible, idle, interaction and manual triggers, interaction replay) is now only emitted on pages that have such a target. A plain resumable page with a few event names went from 11.8 KiB raw (3.1 KiB gzip) to 4.3 KiB raw (1.4 KiB gzip) of critical-path JavaScript. Pages with deferred targets get the same bootstrap as before, and the worst-case budget (13.6 KiB of 14 KiB) is unchanged. Resume behavior is unchanged: event delegation, modifiers and the lazy runtime import are the same code. One difference: on a page with no deferred target at render time, `window.__RESUX_ACTIVATE_DEFERRED__` exists only after the runtime has loaded.

- **Native DOM events on a component tag**: `<Child @click="go" />` (and `@input`, `@keydown`, `@submit` and the other DOM events, with modifiers such as `.stop` and `.prevent`) now fall through to the child's root element and call the parent's handler, like Vue does for listeners the child does not declare as emits. It is plain resumable markup, so it works after resume, in `v-for` (with locals) and for components created in the browser. The child needs one plain element as its root; fragments, text roots and roots that are components, slots or `v-if`/`v-for` are skipped. If the root already handles the same event itself, the parent's listener is not added. Event names that are not DOM events (`@save`) stay component events. The size budget for the built package (`distRuntimeTotalBytes`) is raised from 1.70 MB to 1.80 MB: the package directory crossed the old cap; browser bytes are unchanged in the budget that matters (resume bootstrap stays 13.6 KiB).

- **Named and scoped slots**: `<template #header="{ title }">`, `v-slot:name` and `rx-slot:name` now work, on the server, in the browser and after resume. A component can use several named slots, and `<slot name="x" :prop="value">` passes props to the content. Fallback content inside `<slot>` renders when the slot is not provided. Slot params support a name or simple destructuring (no defaults, nesting, rest or dynamic `#[name]`; those are compile errors). The child's payload maps each provided slot to the parent, like component events do.
- **Fixed: `<slot />` inside `v-if` or `v-for` of a server-rendered component** lost its content on the first client re-render and showed an empty `<slot></slot>` with no error.
- Known limit: text in a scoped slot that reads the parent's state updates on the child's next re-render, not on the parent's own change. See the Current Limits page.

## [0.5.0-beta.1] - 2026-11-26

First beta of the 0.5 line. It makes components work everywhere in a template, in the browser and after resume, and delivers component events. Pages that do not use these features have an unchanged payload and runtime behavior.

Known limits: slots on browser-created components are the default slot only (named and scoped slots are not supported), `<component :is>` takes registered names as strings, and native DOM events on a component tag (`@click` on `<Child>`) are still ignored. See the Current Limits page in the docs.

### Fixed

- **Component events (`emit`)**: `defineEmits()` and `emit(...)` used to do nothing, so a parent's `@save` handler on a component tag never ran. An emitted event now calls the parent handler, in the browser and after resume. The server render keeps `emit` a no-op and writes the mapping from event name to parent handler (with any `v-for` locals, by value) into the page payload, so a resumed or browser-created child can reach its parent without the server running again. The handler gets all emitted arguments (an inline handler gets the first as `$event`). Events nobody listens to are ignored. Native DOM events on a component tag (`@click` on `<Child>`) and event modifiers on component events are still not supported. Pages without events on component tags have an unchanged payload.
- **`<component :is>`**: a dynamic `<component :is="name">` used to render nothing useful in the browser and failed on the server. The compiler now turns it into a re-renderable block, the server resolves the name to a registered or auto-discovered component and renders it, and the browser creates the new component whenever the name changes (a changed name creates a fresh instance, the same name keeps its state). Only string names of registered components are supported: an unknown name or a component object fails with a clear error on the server and logs a dev error in the browser. The payload lists the component names a page can switch between only for pages that use a dynamic `:is`; other pages are unchanged.
- **Components inside `v-if` / `v-for`**: the client-side block renderer used to emit an empty literal tag (for example `<badge></badge>`) for every component, so toggling a `v-if` or changing a `v-for` list silently removed the component. Blocks now create their components in the browser on demand. The component module is imported lazily, the instance gets a client-only scope (`c1`, `c2`, ...) so its events and state resume like server-rendered ones, and the scope is released when its nodes leave the page. Pages without components inside blocks are unchanged, and the payload only lists the component names a page can actually create. Slot content for client-created components is not rendered yet.
- **Slots on components inside `v-if` / `v-for`**: components created in the browser now render their default slot, the same way the server renderer does. All children of the component tag form one slot, evaluated in the parent scope. Named and scoped slots are not part of the server model and are not rendered either way. A client-created child restarts its state when its slot content changes.
- **State of components inside `v-for`**: components created in the browser inside a `v-for` block now keep their state when the block re-renders for an unrelated update or when the list is reordered. Children are matched by `:key`; without a key they are matched by position and a development warning is logged. A child whose props changed is created fresh. Pages without client-created components do no extra work.
- **Setup macros `defineExpose`, `defineSlots`, `defineOptions`, `defineModel`**: the documented macros were not available to compiled components, so a component using one failed with "is not defined" and the page answered 500. The compiled setup now receives them, on the server and in the browser. `defineExpose` and `defineOptions` do nothing, `defineSlots` returns an empty object and `defineModel` returns a ref seeded from the prop.
- **`defineEmits` in the browser**: components that call `defineEmits()` failed whenever their script ran in the browser (first event on a server-rendered component, or a client-created one), with "is not a function", and their handlers never ran. The browser setup context now provides `defineEmits`, a no-op like on the server. Delivering emitted events to parent handlers is a separate planned feature.

## [0.4.0] - 2026-11-26

First stable release of the 0.4 line. It includes everything from the 0.4.0 betas plus the fixes below. Each fix shipped as its own pull request with a regression test, and was verified against a real consumer app after merging.

### Client runtime parity with the server engine

- **Collections**: `Map`, `Set`, `WeakMap`, and `WeakSet` are instrumented in the client runtime like on the server (#147).
- **Refs and arrays**: client ref values are raw-normalized to match server ref identity (#148); array length writes notify truncated indices and iteration (#149).
- **Watchers and scheduler**: `watch` stop is honored for already-queued jobs and repeated stops (#150); the scheduler has a post-flush queue and a rejection guard (#151).
- **Readonly**: `readonly()` over a reactive proxy returns a true readonly view (#152) and `isReactive` agrees with the server through readonly views (#156).
- **i18n**: `t()` stringifies number and boolean messages (#153) and interpolation matches the server engine (#154).
- **Package cache key**: CSS is normalized and sorted in the client package cache key like on the server (#155).
- **Dev assertions**: client state and event locals are checked for JSON serializability in development (#158).

### Compiler, deploy, and tooling

- Backslashes are no longer treated as escapes in attribute values when normalizing `rx` directives (#159).
- Arrow function parameters that share a template ref name are no longer auto-unwrapped (#160).
- Deploy option lookup is scoped to the deploy block of the source config (#157).
- The build-time secret scan of public `runtimeConfig` now covers nested objects and arrays at any depth, with full paths in warnings; strict mode still throws (#161).
- Scaffolded templates ship `legacy-peer-deps` in `.npmrc` for templates that use vitest ^4 (#146).
- The CLI fallback version string now matches the package version.

### Known issues

- **Node 20 with `engine-strict`**: resuxjs runs on Node >=20.19. With npm's `engine-strict` enabled, installing it on Node 20 fails with EBADENGINE, because two dependencies require a newer Node: `undici@^8` (via `unifont@^1.0.3`, and also via `fontless@^1.3.2`) needs Node >=22.19, and `rollup-plugin-visualizer@7` (via `nitropack`) needs Node >=22. With default npm settings this is only a warning and everything works. Requiring Node >=22.19 is planned for a later minor release.
- **Components inside `v-if` / `v-for` after a client update**: in 0.4.0, when a `v-if` or `v-for` block re-renders in the browser, every component inside it is replaced by an empty literal tag, with no error. Server-rendered first paint is correct. Avoid components inside blocks that change on the client until the next release.

## [0.4.0-beta.8] - 2026-11-25

### Framework bug fixes and resumability improvements

- **Reactivity array identity and scheduler robustness**: fixed array identity-search semantics for empty arrays and sparse holes, and hardened the effect scheduler against rejected handlers.
- **Ref unwrapping and collection instrumentation**: `reactive()` now unwraps refs on property access (writing a plain value over a stored ref updates it in place; array indices keep Vue-style wrapped refs) and instruments `Map`, `Set`, `WeakMap`, and `WeakSet` with tracked `get`/`has`/`set`/`add`/`delete`/`clear`/`size` and iteration.
- **Head meta deduplication**: merging head entries (for example layout + page) dedupes `<meta>` tags by `charset`, `name`, `property`, and `http-equiv`, with the last entry winning while intentional repeated tags stay untouched.
- **Vercel Node runtime mapping**: Node versions are clamped for Vercel deployments (16/18/20 to 22.x, 23 to 24.x, ceiling 26.x) so deployments never target retired runtimes.
- **ClientEnhance HTML injection hardening**: `<ClientEnhance>` validates the `as` prop against a safe tag-name allowlist and escapes reserve-height/width/aspect-ratio values inside the style attribute, applied across the server sync, server async, and client renderers.
- **Head scripts, Nitro server plugins, and document hooks**: `head.script`/`noscript` entries render with full attribute support and deduplication; `server/plugins/**` bundle into Nitro output; the new `render:html` hook transforms the SSR document; critical meta tags (`charset`, `http-equiv`, `viewport`) emit first in `<head>`; resumable handlers allow browser globals with clearer DX errors; local builds generate ephemeral Halal signing secrets with a warning; the `minimal` scaffold template is trimmed to essentials.
- **Windows dev static assets and head style retention**: public/assets are served before user server middleware, Windows path-boundary resolution is normalized, dev responses get `no-cache` with ETag/304 revalidation plus `nosniff` and font MIME types, head styles dedupe by `id` with CSP nonce support, client hydration no longer strips SSR `<style>` elements without ids, and pre-existing `lang` attributes are preserved.
- **Template refs in resumable client handlers**: static and dynamic template refs compile to scoped `data-rx-ref` attributes, and client scopes lazily resolve live DOM elements (single elements, `v-for` arrays, dev warnings for missing elements) for resumable handlers and `onMounted` hooks.
- **camelCase transition boundaries**: `<Transition>` and `<TransitionGroup>` written in camelCase (the Vue-docs style) are recognized as transition boundaries instead of crashing SSR with `Unknown component`.

## [0.4.0-beta.7] - 2026-10-05

### Framework bug fixes, Nitro integration, and DX

- **Head script rendering (Bug 1)**: Added runtime rendering for `head.script` and `noscript` in `renderHead()` and client `applyHead()`, supporting `src`, `async`, `defer`, `nomodule`, `type`, `innerHTML`/`textContent`, `nonce`, CSP rules via `resux:security`, and deduplication by `key`, `id`, and `src`. Made `useHead({ script })` fully functional and enabled the fonts module lazy-load observer script.
- **Windows public asset serving & head style retention**: Serves static assets (`public/`, `assets/`) in dev mode before server middleware executes, protecting static assets from middleware that wraps `res.write`/`res.end` or mutates headers; normalizes filesystem boundary resolution on Windows with cross-case matching and drive-letter isolation; sets dev `Cache-Control: no-cache`, ETag revalidation (304), and `X-Content-Type-Options: nosniff`; sets `no-store` on 404/500 error documents; adds `font/woff2` and font MIME types; deduplicates head styles by `id`; attaches CSP nonces to styles and stylesheets; prevents client hydration from dropping SSR `<style>` elements; preserves pre-existing document `lang` attributes; and adds dev warnings for failed or non-CSS linked stylesheets.
- **Nitro server plugins bundling (Bug 2)**: Narrowed Nitro ignore configuration to top-level Resux folders and included `server/plugins/**` in Nitro scanning, ensuring server plugins using `defineNitroPlugin` are bundled into the server output.
- **HTML transformation hook (Bug 3)**: Added the `render:html` hook (`{ htmlAttrs, head, bodyPrepend, body, bodyAppend, bodyAttrs }`) so modules and server integrations can transform SSR document HTML safely.
- **Critical meta tag ordering (Bug 4)**: Ensured critical document-level `<meta>` tags (`charset`, `http-equiv`, `viewport`) are consistently emitted before links, stylesheets, and scripts in `<head>`.
- **Browser globals and capture DX (Bug 5)**: Allowlisted `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `location`, `history`, and `alert` in resumable handlers via exported `RESUMABLE_HANDLER_ALLOWED_GLOBALS`, with proof they are never serialized into state payloads. Improved capture validation errors with actionable suggestions and docs links.
- **Halal Core build signing (Bug 6)**: Generated ephemeral signing secrets with clear warnings during local builds when `RESUX_HALAL_REPORT_SIGNING_SECRET` is unset, only requiring configured secrets when authentication is explicitly enabled. Added `RESUX_HALAL_REPORT_SIGNING_SECRET` to `.env.example`.
- **Minimal starter template cleanup (Bug 7)**: Streamlined the `minimal` scaffold template (`--template minimal`) to only include essential files (`app.vue`, `pages/index.vue`, `resux.config.ts`, `nitro.config.ts`) without demo plugins, middleware, islands, or example APIs.
- **Documentation and version alignment (Bug 8)**: Aligned version statements and updated documentation guides for head scripts, critical meta ordering, Nitro server plugins, resumable handler globals, and build signing secrets.

### Navigation, UI compatibility, and motion

- Improved client-side route transitions so navigation uses focused progress feedback without fading or blocking the whole application.
- Modernized framework form controls and switches while keeping resumable bindings, accessibility state, and native form behavior intact.
- Fixed fetched SVG icon rendering so root and nested presentation attributes are preserved accurately and exact attribute names such as `d` and `opacity` cannot collide with prefixed SVG attributes.
- Added resumable Vue-style `<Transition>` and `<TransitionGroup>` support with dynamic transition names, semantic group tags, keyed enter/leave overlap, reduced-motion handling, and correct multi-iteration CSS animation timing.
- Added Nuxt-compatible `<Teleport>` support with the standard `#teleports` target, reactive `to` and `disabled` props, direct-child target semantics, nested Teleport cleanup, and initialization of moved islands/media/events from their final DOM location.
- Added the exported `RxVerificationCode` / `ResuxVerificationCode` UI component for production verification-code and OTP flows.
- Expanded the font pipeline with provider-aware local and remote font APIs so applications can configure framework-managed fonts without app-specific loading workarounds.
- Fixed locale navigation so preserved layouts refresh correctly when switching locales instead of retaining stale locale-scoped layout state.
- Kept these fixes in Resux itself so consuming applications do not need local compatibility hacks.

### Validation

- Added compiler, SSR, resumability, transition, Teleport, SVG, and form-control regression coverage.
- Revalidated production quality gates plus Node.js 20.19/22, Windows/macOS portability, templates, and Node/static/Vercel/Netlify/Cloudflare deployment targets before publication.

## [0.4.0-beta.6] - 2026-10-01

### Fonts, icons, and initial rendering

- Fixed built-in Resux icons so SSR renders the real registry SVG instead of a placeholder triangle, preserving icon classes, view boxes, fills, strokes, and presentation attributes.
- Added missing Idea Store icon coverage and corrected SVG geometry metadata so framework icons match the source application more closely.
- Changed the Google Fonts default to a non-render-blocking preload strategy with no-script fallback, while automatically falling back to CSP-safe eager application when inline activation is not permitted.
- Added runtime rendering for head-level script and noscript entries used by framework modules.
- Added production critical-CSS inlining for small local stylesheets when `resux:performance` is enabled, while preserving restrictive CSP behavior, stylesheet order, and relative asset URL correctness.
- Kept large, external, relative-asset, development, and CSP-incompatible stylesheets linked instead of applying unsafe loading tricks.

### Validation

- Added regression coverage for SSR icon parity, SVG attributes and view boxes, font preload/no-script behavior, CSP fallback, relative CSS assets, stylesheet ordering, and production critical-CSS inlining.
- Revalidated the framework CI before publication and kept the Idea Store changes limited to consuming the published framework version.

## [0.4.0-beta.5] - 2026-09-30

### Vercel portability and rendering

- Fixed generated server imports that embedded build-machine absolute paths such as `/vercel/path0`; project modules now use relocation-safe relative module specifiers inside the packaged server output.
- Fixed URL-reserved characters in generated relative module specifiers and preserved custom Resux output directories.
- Fixed Vercel deployment packaging for app-level `assets/`, including nested image, video, SVG, JSON, and other static files.
- Fixed reactive values passed to `useHead` so refs/getters are resolved for `htmlAttrs`, `bodyAttrs`, metadata, links, and styles instead of rendering values such as `[object Object]`.
- Added typed reactive head input support so supported refs/getters no longer require unsafe TypeScript casts.
- Added regression coverage for Vercel static assets, relocated server imports, custom output directories, URL-reserved filenames, and reactive head attributes.

### Validation

- Reproduced the production Idea Store failures from Vercel logs before the fix: absolute `/vercel/path0/.resux/server/imported/...` imports, missing `/assets/*` responses, and `lang="[object Object]"`.
- Revalidated the framework production quality gates and deployment matrix, including the dedicated Vercel target.

## [0.4.0-beta.4] - 2026-09-29

### Serverless runtime packaging

- Fixed Vercel production functions that could return HTTP 500 with `Cannot find package 'vue' imported from .../resuxjs/dist/icons/index.js`.
- Fixed the equivalent Netlify packaging path so framework runtime dependencies are complete there as well.
- The serverless framework packager now detects whether the packaged Resux runtime actually imports Vue and, only when needed, copies Vue and its transitive runtime dependency tree into every function.
- Added regression coverage proving Vercel and Netlify package `vue` and transitive `@vue/shared` when the framework runtime imports Vue, without imposing Vue on minimal framework fixtures that do not require it.

### Validation

- Revalidated Production Quality Gates, Node.js 20.19 and 22, Windows and macOS portability, all template suites, and Node/static/Vercel/Netlify/Cloudflare deployment targets.


## [0.4.0-beta.3] - 2026-09-28

### Node.js 20.19 compatibility

- Restored the Node 20-compatible `tsdown@0.19.0` build toolchain after a dependency update caused source builds to require newer Node.js versions and fail while loading `unrun`.
- Repaired the npm lockfile nesting for `unrun`'s Rolldown `1.0.0-rc.17` optional PPC64 and S390X Linux bindings so frozen installs succeed with npm 10 on Node.js 20.19.
- Revalidated the supported Node.js 20.19 path with strict `npm ci`, framework build, and framework tests.

### Maintenance

- Includes the post-beta.2 dependency maintenance updates for Vite and Node.js type definitions.
- No intentional public API or Resux runtime feature changes are introduced by this prerelease; it focuses on supported-environment reliability.

## [0.4.0-beta.2] - 2026-09-25

### Release recovery

- Fixed the npm release workflow so packed tarballs are published from explicit local paths instead of being interpreted as GitHub shorthand.
- No framework runtime behavior changed from `0.4.0-beta.1`; this prerelease exists to complete the first npm public-beta publication safely.

## [0.4.0-beta.1] - 2026-09-25

### Public beta

This release marks the first Resux public-beta milestone. It is intended for evaluation, experimentation, and real-world testing ahead of the stable 1.0 line.

### Security and reliability

- Hardened remote image and video fetching against SSRF, unsafe redirects, URL credentials, oversized responses, and stalled upstream requests.
- Hardened generated-media and static-file path handling against traversal, prefix-boundary escapes, and symlink escapes.
- Added bounded route payload, prefetch, icon, and in-flight request behavior to reduce unbounded memory and concurrency growth.
- Added regression coverage for media-fetch security, path boundaries, cache limits, and related runtime behavior.

### Validation

The release candidate is covered by the repository CI matrix for:

- strict production quality and package checks;
- Node.js 20.19 and 22 compatibility;
- Windows and macOS portability;
- minimal, default, full, i18n, PWA, media, package-compatibility, and dashboard templates;
- Node, static, Netlify, Vercel, and Cloudflare deployment targets.

### Notes

- Resux remains pre-1.0 and public beta. Public APIs may evolve based on real-world feedback.
- Use the documentation and package exports as the source of truth for currently supported behavior.
