# Contributing to Resux

Thanks for helping improve Resux.

## Before you start

For substantial changes, open an issue or discussion first so the intended behavior, public API, and compatibility impact can be agreed before implementation.

Security vulnerabilities must follow [SECURITY.md](SECURITY.md). Do not publish sensitive exploit details in a public issue.

## Development setup

Resux requires Node.js 20.19.0 or newer.

```sh
npm install
npm run build
npm test
```

## Required validation

Before opening a pull request, run the checks relevant to your change. For framework or release-critical changes, use the complete quality path:

```sh
npm run quality
npm run pack:check
```

When applicable, also run:

```sh
npm run test:templates
npm run verify:deploy-targets
```

GitHub Actions runs the authoritative cross-platform, compatibility, template, deployment, and packaging matrices.

## Pull requests

Keep pull requests focused and include:

- what changed and why;
- user-visible or compatibility impact;
- tests or regression coverage;
- documentation changes for public behavior;
- deployment or security implications when relevant.

Do not document behavior that is not implemented and tested.

## Public API changes

Source code, package exports, tests, and published documentation must agree. When changing a public API:

1. update the implementation;
2. update or add tests;
3. update the relevant documentation;
4. note user-visible changes in the changelog when release-relevant.

Resux is pre-1.0, so APIs can still evolve, but breaking changes should be deliberate and clearly documented.

## Coding principles

Prefer:

- explicit runtime and package boundaries;
- server-rendered useful HTML before client enhancement;
- bounded caches and concurrency;
- safe filesystem and network handling;
- focused dependencies;
- regression tests for fixed bugs;
- portable behavior across supported Node.js versions and operating systems.

## Commit and review quality

Use clear commit messages that describe the behavior being changed. Resolve review findings by verifying them against current code, adding regression coverage when practical, and avoiding unrelated refactors in the same fix.
