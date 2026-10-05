# Changelog

All notable changes to Resux are documented here.

Resux follows Semantic Versioning. Before 1.0, minor releases may contain breaking API changes when they are clearly documented.

## [0.4.0-beta.7] - 2026-10-01

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
