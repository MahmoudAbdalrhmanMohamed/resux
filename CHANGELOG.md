# Changelog

All notable changes to Resux are documented here.

Resux follows Semantic Versioning. Before 1.0, minor releases may contain breaking API changes when they are clearly documented.

## [0.4.0-beta.6] - 2026-09-30

### Head attribute serialization

- Fixed object-valued `htmlAttrs` and `bodyAttrs` styles rendering as `[object Object]` during SSR.
- Added CSS style-object serialization with camelCase-to-kebab-case conversion and CSS custom-property preservation.
- Added class object/array normalization for head attributes and omission of null/undefined/false attribute values.
- Added regression coverage for the production Idea Store case using `bodyAttrs.style: { direction, overflowX }`.

### Validation

- Revalidated Production Quality Gates, Node.js 20.19 and 22, Windows and macOS portability, all template suites, and Node/static/Vercel/Netlify/Cloudflare deployment targets.

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
