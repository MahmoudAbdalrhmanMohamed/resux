# Changelog

All notable changes to Resux are documented here.

Resux follows Semantic Versioning. Before 1.0, minor releases may contain breaking API changes when they are clearly documented.

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
