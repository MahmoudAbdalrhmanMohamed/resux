# @resux/runtime

Runtime package for Resux, an experimental web framework prototype with server rendering and a custom resumable runtime.

> Resux is an MVP and is not production-ready yet.

Most users should install `@resux/resux` or run:

```sh
npm create resux@latest
```

Use this package directly only when building framework internals, adapters, or tests.

## Install

```sh
npm install @resux/runtime
```

## API

```ts
import { renderApp, renderDocument, defineComponent } from "@resux/runtime";
```

The runtime provides:

- Server-side rendering helpers.
- Serialized route, state, and async-data payloads.
- Resux-style composables such as `useState`, `useAsyncData`, `useRoute`, `useHead`, and `useRuntimeConfig`.
- Client resume loader source.
- Server handler helpers such as `readBody(event)` and `getQuery(event)`.

## Related Packages

- `@resux/compiler`: compiles app source into runtime-compatible modules.
- `@resux/resux`: main app-facing package for building and serving apps.
- `create-resux`: starter scaffolder.
