# Resux

Resux is an experimental web framework with a custom resumable runtime.

It uses familiar `.vue` files and `pages/` routing, but normal Resux components do not use Vue hydration or the Vue runtime. The compiler parses a small Vue-like SFC subset, renders HTML on the server, serializes route and component state, then loads client code only when an event is triggered. Vue runtime is available as an opt-in island escape hatch for complex client widgets.

The v1 release line treats the documented compiler, SSR renderer, resume runtime, routing, and CLI commands as the stable core. Advanced Vue compatibility, Vue islands, Nitro adapter behavior, and unsupported Vue SFC syntax are still experimental and should fail loudly instead of silently falling back to hydration.

## Create App

Create a new app with the latest published Resux package:

```sh
npx resuxjs@latest init
```

With a project directory:

```sh
npx resuxjs@latest init my-app
```

With create options:

```sh
npx resuxjs@latest init my-app --no-install
```

Generated apps use a single Resux dependency, similar to Nuxt apps installing `nuxt`:

```json
{
  "dependencies": {
    "resuxjs": "^<current-version>"
  }
}
```

For local development before publishing:

```sh
npm install
npm run typecheck
npm run build
npm run create:local -- my-app --no-install
```

Then run the generated app:

```sh
cd my-app
npm install
npm run dev
```

## Package Layout

```txt
src/
  compiler/   SFC parser, route manifest builder, code generator
  runtime/    SSR renderer, composables, client resume loader source
  index.ts    Runtime-only public root export
  cli.ts      Resux CLI, dev server, preview server, deploy helpers
  node.ts     Node server handler export for adapters
  create.ts   App scaffolder used by `resux init`

templates/    Starter files copied by `resux init`
tests/        Compiler, SSR, and client resume tests
```

Public imports are split so browser/client bundles do not accidentally pull compiler or server code:

```ts
import { renderApp } from "resuxjs/runtime"
import { createResuxNodeHandler } from "resuxjs/node"
```

## Development

```sh
npm install
npm run typecheck
npm run build
npm test
```

Run the full publish-readiness check:

```sh
npm run pack:check
```

This builds, tests, and dry-runs npm packing for the single `resuxjs` package.

CI runs on every push and pull request with `npm ci`, optional linting, typecheck, build, tests, and package dry-run checks.

## Release Process

Normal pushes never publish to npm. They only run CI. Publishing is intentionally gated to version tags or GitHub Releases so an ordinary `main` push cannot publish a broken package.

To release:

1. Update the version and create the release commit/tag with `npm version 1.0.0`.
2. Push the release commit with `git push origin main`.
3. Push the version tag with `git push origin v1.0.0`.
4. The GitHub Action publishes `resuxjs@1.0.0` to npm.

The npm publish workflow validates that the tag matches `package.json`, runs `npm ci` and `npm run pack:check`, skips publishing if the package version already exists, then publishes with `NPM_TOKEN` and npm provenance.

## CLI

The `resux` CLI supports:

```sh
resux init <project-dir>
resux dev <app-root>
resux build <app-root>
resux preview <app-root>
resux start <app-root>
resux inspect <app-root>
resux deploy <app-root>
```

If `<app-root>` is omitted, Resux uses the current directory.

Useful server flags:

```sh
resux dev --port 4000
resux preview --host 0.0.0.0 --port 4000
resux start --host 0.0.0.0 --port 3000
resux inspect
resux inspect --json
resux deploy . --preset docker
resux deploy . --preset nitro
resux --help
resux --version
```

Build output is written to:

```txt
<app-root>/.resux
```

## App Types

Generated apps include `env.d.ts` and `tsconfig.json` wired to `resuxjs/globals`, so app files can use the Resux-style globals without imports:

```ts
const count = useState("count", () => 0)
const route = useRoute()
const router = useRouter()
useSeoMeta({
  title: "My App",
  description: "My app description",
  ogTitle: "My App"
})

function openAbout() {
  router.push("/about")
}

export default defineResuxConfig({
  app: {
    head: {
      title: "My App"
    }
  }
})
```

## Reactivity APIs

Resux includes a native reactivity layer for resumable components. You can use it with globals in app files, or import directly:

```ts
import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  readonly,
  toRef,
  toRefs,
  unref,
  isRef,
  isReactive,
  isReadonly,
  nextTick
} from "resuxjs"
```

Or from the focused subpath:

```ts
import { ref, reactive, computed } from "resuxjs/reactivity"
```

These APIs are Resux-native. Normal Resux components do not depend on Vue hydration runtime.

## Vite

Resux uses Vite in both main app commands:

- `resux dev` emits Resux client modules into `.resux/vite-client` and serves the resume runtime plus handler modules through Vite middleware.
- `resux dev` also opens a dev-only update channel at `/__resux/dev-events`; when source files change, Resux rebuilds and reloads the browser so route, template, and style changes are visible without restarting the dev server.
- `resux build` uses Vite production bundling for the resume runtime, handler chunks, and server manifest, then writes optimized output into `.resux/client` and `.resux/server-bundle` before producing a Nitro `.output` server.

The generated starter keeps Resux-style scripts:

```json
{
  "scripts": {
    "dev": "resux dev .",
    "build": "resux build .",
    "preview": "resux preview .",
    "start": "node .output/server/index.mjs",
    "inspect": "resux inspect ."
  }
}
```

Tailwind can stay Nuxt-style simple too. If your app has `assets/css/tailwind.css` and `tailwindcss` installed, `resux dev` automatically runs Tailwind in watch mode and `resux build` generates a minified `public/tailwind.css` before bundling. No separate `concurrently` script is required.

## Deployment

Build and serve with the Node server:

```sh
npm run build
npm run start
```

Production serving enables default hardening headers such as `x-content-type-options`, `referrer-policy`, `x-frame-options`, `cross-origin-opener-policy`, and a restrictive `permissions-policy`. Disable them only when the host or reverse proxy owns those headers:

```sh
resux start . --no-security-headers
```

Generated apps include a `Dockerfile`, `.dockerignore`, and `DEPLOYMENT.md`. Use `resux inspect --json` in CI to capture the built routes, server handlers, route rules, feature flags, and diagnostics.

Existing apps can generate or refresh deployment files without changing application code:

```sh
resux deploy . --preset node
resux deploy . --preset docker --force
resux deploy . --preset nitro --force
```

The Nitro preset writes `nitro.config.ts` and a small `.resux-nitro/handler.ts` adapter. `resux build` now produces Nuxt-style `.output` by default:

```sh
npm run build
node .output/server/index.mjs
```

The generated Nitro config is conservative for resumability: SSR pages, API routes, and route payloads use `cache-control: no-store`, while build-stable Resux runtime and handler assets use long immutable caching. Nitro prerender crawling is disabled by default.

Production and dev servers expose a health endpoint for hosts and uptime checks:

```txt
/__resux/health
```

## Modules And Route Rules

Resux supports first-party and third-party build-time modules in `resux.config.ts`. Modules run during the Resux build and can extend config without adding hydration:

```ts
export default defineResuxConfig({
  modules: [
    "resux:security",
    ["resux:performance", { assetMaxAge: 31536000 }],
    ["./modules/security.ts", { header: "enabled" }]
  ],
  routeRules: {
    "/old": { redirect: { to: "/", statusCode: 301 } },
    "/admin/**": { headers: { "x-robots-tag": "noindex" } }
  }
})
```

Built-in modules:

- `resux:security`: adds default production hardening headers and optional custom headers or CSP through route rules.
- `resux:performance`: adds immutable cache rules for built Resux runtime/handler assets and `no-store` for route payloads.

Modules can be built-in `resux:*` specifiers, npm package specifiers, local files, inline functions, or objects returned by `defineResuxModule`.

```ts
// modules/security.ts
export default defineResuxModule({
  defaults: { header: "enabled" },
  setup(options, resux) {
    resux.addCss("/module.css")
    resux.addHead({ meta: [{ name: "module", content: options.header }] })
    resux.addRouteRule("/secure/**", {
      headers: { "x-module": options.header },
      cache: { maxAge: 60, swr: 30 }
    })
    resux.extendRuntimeConfig({
      public: { securityModule: options.header }
    })
  }
})
```

The module API includes `addCss`, `addHead`, `addRouteRule`, and `extendRuntimeConfig`. Route rules currently support redirects, response headers, status codes, cache headers, and CORS headers.

## Server Middleware

Files in `server/middleware` run for each request before server handlers, public files, and page rendering:

```ts
export default defineServerMiddleware((event) => {
  setHeader(event, "x-app", "resux")

  if (event.path.startsWith("/private")) {
    return { type: "redirect", to: "/login", statusCode: 302 }
  }
})
```

Server middleware can continue by returning nothing, use h3-style helpers such as `setHeader(event, name, value)`, end the Node response directly when necessary, return a `Response`, return a JSON-serializable value, return `false` to send `403`, or return a redirect/abort object.

## What Works

- `.vue`-style SFC files with `<template>`, `<script setup lang="ts">`, and plain CSS `<style>` blocks.
- File-based routing from `pages/`.
- Dynamic route params like `pages/post/[id].vue`.
- Catch-all route params like `pages/docs/[...slug].vue`.
- `app.vue` with `<ResuxPage />`.
- Layouts with `<ResuxLayout>`, `<slot />`, and `definePageMeta({ layout })`.
- `<ResuxLink to="...">` rendered as an `<a href="...">` and intercepted for client-side navigation.
- Static and dynamic component props with `defineProps()`.
- Server-side rendering.
- Head/meta rendering from `resux.config.ts`, `definePageMeta`, `useHead`, and `useSeoMeta`.
- Component CSS from `<style>` and `<style scoped>`, included in SSR output and updated during client-side navigation.
- Route middleware from `middleware/`, including `.global` middleware.
- Request-time server middleware from `server/middleware`.
- Plugins from `plugins/` with `defineResuxPlugin`.
- Server API/routes from `server/api` and `server/routes`.
- Server handler helpers: `readBody(event)`, `getQuery(event)`, and `setHeader(event, name, value)`, backed by h3.
- `error.vue` for custom 404/500 rendering.
- Public file serving from `public/`.
- Built-in health checks at `/__resux/health`.
- Basic `resux.config.ts` support for `runtimeConfig`, `app.head`, and `css`.
- Built-in and package/local Resux modules for extending CSS, head, route rules, and runtime config during build.
- Route rules for redirects, response headers, status codes, cache headers, and CORS headers.
- Default production security headers with an opt-out flag.
- Vite-powered dev serving, production client/server bundling, and minification for the resume runtime and handler chunks.
- Dev rebuilds with automatic browser reloads, without adding Vue hydration.
- `resux inspect` and `resux inspect --json` for route and build diagnostics.
- `resux deploy --preset node|docker|nitro` for deployment file generation.
- Serialized route, state, and async data payloads.
- Resumable event handlers such as `@click="increment"`.
- Lazy client handler chunks loaded on first interaction.
- Client-side navigation, persistent same-layout DOM, built-in route transition progress, and hover/focus route payload prefetch for same-origin links.
- Stable core composables: `useState`, `useAsyncData`, `useRoute`, `useRouter`, `useHead`, `useSeoMeta`, `useRuntimeConfig`, `useResuxApp`, `apiURL`, `useFetch`, `$fetch`, and `onMounted`.
- `useAsyncData` returns a Nuxt-like resource with reactive `data`, `pending`, and `error` refs, plus `value` as a data alias for compatibility. Use `await useAsyncData(...)` when you want SSR to fetch before rendering the page; omit `await` when you intentionally want an SSR skeleton that resumes in the browser.

## Component Syntax

```vue
<script setup lang="ts">
const count = useState("count", () => 0)

function increment() {
  count.value++
}
</script>

<template>
  <button @click="increment">
    Count: {{ count }}
  </button>
</template>
```

On the server, Resux renders the button as HTML and serializes `count`.

In the browser, Resux installs a tiny delegated event listener. The component handler module is not imported until the user clicks the button. After that, the scope is resumed from serialized state and only the marked DOM bindings are patched.

## Async Data Skeletons

To fetch during SSR and render the resolved data in the first HTML response, await the call:

```vue
<script setup lang="ts">
type Stats = {
  response: string
}

const { data, pending, error } = await useAsyncData("stats", ({ signal }) => {
  return $fetch<Stats>("/api/stats", { signal })
})
</script>

<template>
  <p v-if="pending">Loading</p>
  <p v-if="error">{{ error.message }}</p>
  <strong v-if="data">{{ data.response }}</strong>
</template>
```

For a Next-style loading skeleton, call `useAsyncData` without `await` and branch on `pending`:

```vue
<script setup lang="ts">
type Stats = {
  response: string
}

const { data, pending, error } = useAsyncData("stats", ({ signal }) => {
  return $fetch<Stats>("/api/stats", { signal })
})
</script>

<template>
  <div v-if="pending" class="skeleton"></div>
  <p v-if="error">{{ error.message }}</p>
  <strong v-if="!pending && !error && data">{{ data.response }}</strong>
</template>
```

Resux serializes the pending state, renders the skeleton immediately, resumes only scopes with pending async data in the browser, and patches the marked DOM blocks after the data resolves. The handler receives an abort `signal`; pass it to `$fetch` or `fetch` so pending client requests are aborted when the user leaves the route before data resolves.

Templates auto-unwrap refs returned from `useState`, `useAsyncData`, `useFetch`, Vue `ref`, and `computed`, so template examples use `count`, `pending`, and `data.response`. In `<script setup>`, keep using `.value` when mutating refs, such as `count.value++`.

## Server API Fetches

Browser-only fetches can use relative API URLs:

```ts
await fetch("/api/test")
```

Code that can run during SSR should use `$fetch()` for internal APIs. Resux automatically resolves internal `/api/...` URLs to an absolute request-origin URL on the server, while keeping them relative in the browser:

```vue
<script setup lang="ts">
const { data, pending, error } = useAsyncData("test", ({ signal }) => {
  return $fetch("/api/test", { signal })
})
</script>

<template>
  <p v-if="pending">Loading</p>
  <p v-if="error">{{ error.message }}</p>
  <pre v-if="data">{{ data }}</pre>
</template>
```

On the server, `$fetch("/api/test")` uses the current request origin, then configured public origins such as `runtimeConfig.public.appOrigin`, and finally `http://localhost:3000`. In the browser it keeps `/api/test` relative. Use `apiURL("/api/test")` only when you call native `fetch()` yourself in code that can run during SSR.

## Supported Syntax

The v1 compiler supports:

- Static elements and text.
- Interpolation: `{{ value }}`.
- Static attributes: `class="box"`.
- Dynamic attributes: `:class="className"`.
- Dynamic class arrays/objects and style objects for `:class` and `:style`.
- Plain CSS `<style>` blocks, including `<style scoped>`.
- Plain named events: `@click="increment"`.
- Inline event expressions that only capture resumable values, plus named handlers such as `@click="increment"`.
- Resumability-safe event modifiers: `.prevent`, `.stop`, `.self`, `.once`, system/mouse modifiers, and key filters such as `.enter`.
- `v-if`.
- `v-show`.
- `v-text`.
- Sanitized `v-html`.
- Basic `v-model` for form values.
- Simple `v-for`, such as `item in items` or `(item, index) in items`.
- Component tags from `components/`.
- `<ResuxPage />`.
- `<ResuxLayout />`.
- `<slot />` inside layouts.
- `<ResuxLink to="/path">`.
- `defineProps()` in components.
- `definePageMeta({ layout, middleware, title, meta })`.
- `useRoute()` for the current path, params, and query.
- `useRouter().push("/path")`, `replace`, `back`, `forward`, and `go`.
- `useHead({ title, meta, link })`.
- `useSeoMeta({ title, description, ogTitle, ogImage, twitterCard })`.
- `apiURL("/api/path")` for SSR-safe API fetch URLs.
- `onMounted()`, run when the component scope is first resumed in the browser.
- Vue runtime islands via `<VueIsland name="CounterIsland" :props="{ start: 1 }" />` and files in `islands/vue`.

Handlers and inline event expressions must only capture resumable values, such as refs returned by `useState`.

## Current Limits

Resux intentionally rejects or does not support many advanced framework/Vue features yet:

- Vue runtime is island-only; Resux components still do not hydrate through Vue.
- Nitro support is an adapter/deployment preset, not the primary dev server.
- SFC styles support plain CSS only; preprocessors like SCSS and CSS modules are not implemented for resumable components yet.
- Event `.capture` and `.passive` are accepted in templates, but the browser runtime still uses delegated resumable listeners.
- No fallback hydration for unsupported components.

Unsupported resumability patterns should fail at compile time instead of silently hydrating.

## Troubleshooting

- `Failed to parse URL from /api/...` during SSR: use `apiURL("/api/...")` or `$fetch("/api/...")` from Resux setup code so server-side fetches get an absolute URL.
- Skeletons that never disappear: render `error` from `useAsyncData` and guard success UI with `!pending && !error && data`.
- Dev edits do not appear: keep `resux dev .` running and make sure the browser is connected to `/__resux/dev-events`; Resux reloads the page after successful rebuilds.
- Port already in use: pass another port, for example `resux dev --port 4000`.
- Handler capture compile errors: move non-serializable values out of resumable handlers or store resumable state with `useState`.

## Architecture

Resux is one package with five internal parts:

- Compiler: parses `.vue` files, creates routes, validates resumable handlers, and emits server/client modules.
- Runtime: renders HTML on the server, provides Resux-style composables, runs plugins, applies layouts, collects head entries, and serializes payloads.
- CLI and Node server: builds apps, starts the dev server, previews generated output, and exposes `resuxjs/node`.
- Create CLI: scaffolds a starter app for `resux init`.
- Package entrypoints: keep the root runtime-only while `resuxjs/compiler`, `resuxjs/runtime`, `resuxjs/node`, `resuxjs/globals`, and `resuxjs/create` expose focused surfaces.

The browser initially receives only server-rendered HTML, the serialized payload, and the small resume loader.

For internal navigation, the client runtime prefetches route payloads on hover/focus, intercepts same-origin links, fetches a fresh SSR route payload from `/__resux/route`, updates a server-rendered transition progress shell through start/fetch/swap/complete/error phases, keeps the active layout DOM when the layout name matches, swaps the page slot, updates `<head>`, updates browser history, and clears only non-persistent resumed page scopes.

## Testing

Run:

```sh
npm test
```

The tests cover:

- Route generation.
- SFC compiler output.
- Compile errors for unsupported resumability captures.
- Sanitized `v-html`, `v-model`, inline handlers, and mounted resume hooks.
- SSR payload serialization.
- Dynamic route params and catch-all params.
- Layout rendering.
- Head/meta rendering.
- Runtime config and plugin provides.
- Project discovery for layouts, middleware, server middleware, plugins, API routes, and config.
- Extended route-rule serialization.
- Client resume behavior after interaction.
