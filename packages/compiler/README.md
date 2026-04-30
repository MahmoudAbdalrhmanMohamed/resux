# @resux/compiler

Compiler package for Resux, an experimental web framework prototype with server rendering and a custom resumable runtime.

> Resux is an MVP and is not production-ready yet.

Most users should install `@resux/resux` or run:

```sh
npm create resux@latest
```

Use this package directly only when building tooling around Resux.

## Install

```sh
npm install @resux/compiler
```

## API

```ts
import { buildProject, compileVueSource, createRouteManifest } from "@resux/compiler";
```

Common use:

```ts
await buildProject("./my-app");
```

Build output is written to `.resux` by default.

## What It Does

- Parses a Vue-like SFC subset.
- Builds a route manifest from `pages/`.
- Discovers layouts, middleware, plugins, server handlers, and config.
- Emits server-renderable modules and lazy client handler modules.
- Validates supported resumability patterns.
- Uses Vite for production client/server bundling.

## Related Packages

- `@resux/runtime`: runtime primitives consumed by compiled output.
- `@resux/resux`: main app-facing package with the Resux CLI.
- `create-resux`: starter scaffolder.
