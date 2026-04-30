# Resux

Resux is an experimental web framework prototype with a custom resumable runtime.

It uses familiar `.vue` files and `pages/` routing, but normal Resux components do not use Vue hydration or the Vue runtime. The compiler parses a small Vue-like SFC subset, renders HTML on the server, serializes route and component state, then loads client code only when an event is triggered. Vue runtime is available as an opt-in island escape hatch for complex client widgets.

This is an MVP, not a production-ready framework.

## Create App

Resux is published as one npm package. After publishing, users can scaffold an app with the same package they install in the app:

```sh
npx resux@latest init
```

With a project directory:

```sh
npx resux@latest init my-app
```

With create options:

```sh
npx resux@latest init my-app --no-install
```

Generated apps use a single Resux dependency, similar to Nuxt apps installing `nuxt`:

```json
{
  "dependencies": {
    "resux": "^0.1.0"
  }
}
```

For local development before publishing:

```sh
npm install
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
  index.ts    Resux CLI, Node server, and public node handler
  create.ts   App scaffolder used by `resux init`

templates/    Starter files copied by `resux init`
tests/        Compiler, SSR, and client resume tests
```

## Development

```sh
npm install
npm run build
npm test
```

Run the full publish-readiness check:

```sh
npm run pack:check
```

This builds, tests, and dry-runs npm packing for the single `resux` package.

## Publishing

Publish the single package:

```sh
npm publish --access public
```

After `resux` is published, users can run `npx resux@latest init`.

## Compatibility Policy

Resux follows npm semver starting with the `0.1.x` release line.

- Patch releases, such as `0.1.1`, preserve compatibility for documented APIs, generated starter structure, CLI commands, config keys, file-based routing conventions, and runtime payload formats.
- Minor releases before `1.0.0`, such as `0.2.0`, may include breaking changes, but they must be documented in release notes and migration guidance before publishing.
- Experimental or undocumented internals, including generated files under `.resux`, may change between releases unless they are explicitly documented as public API.

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

Generated apps include `env.d.ts` and `tsconfig.json` wired to `resux/globals`, so app files can use the Resux-style globals without imports:

```ts
const count = useState("count", () => 0)
const route = useRoute()
useSeoMeta({
  title: "My App",
  description: "My app description",
  ogTitle: "My App"
})

export default defineResuxConfig({
  app: {
    head: {
      title: "My App"
    }
  }
})
```

## Vite

Resux uses Vite in both main app commands:

- `resux dev` emits Resux client modules into `.resux/vite-client` and serves the resume runtime plus handler modules through Vite middleware.
- `resux dev` also opens a dev-only update channel at `/__resux/dev-events`; when source files change, Resux rebuilds, re-imports active client component modules with a cache-busting revision, and patches active resumable scopes without a full document reload.
- `resux build` uses Vite production bundling for the resume runtime, handler chunks, and server manifest, then writes optimized output into `.resux/client` and `.resux/server-bundle`.

The generated starter keeps Resux-style scripts:

```json
{
  "scripts": {
    "dev": "resux dev .",
    "build": "resux build .",
    "preview": "resux preview .",
    "start": "resux start .",
    "inspect": "resux inspect ."
  }
}
```

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

The Nitro preset writes `nitro.config.ts` and a small `.resux-nitro/handler.ts` adapter. Build Resux first, then let Nitro produce provider-specific output:

```sh
npm run build
npx nitro build
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
    ["resux:seo", {
      title: "My App",
      description: "A Resux application.",
      themeColor: "#2563eb"
    }],
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

- `resux:seo`: adds title, description, Open Graph, Twitter card, theme color, and optional link tags.
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
  event.node.res.setHeader("x-app", "resux")

  if (event.path.startsWith("/private")) {
    return { type: "redirect", to: "/login", statusCode: 302 }
  }
})
```

Server middleware can continue by returning nothing, end the Node response directly, return a `Response`, return a JSON-serializable value, return `false` to send `403`, or return a redirect/abort object.

## What Works

- `.vue`-style SFC files with `<template>` and `<script setup lang="ts">`.
- File-based routing from `pages/`.
- Dynamic route params like `pages/post/[id].vue`.
- `app.vue` with `<ResuxPage />`.
- Layouts with `<ResuxLayout>`, `<slot />`, and `definePageMeta({ layout })`.
- `<ResuxLink to="...">` rendered as an `<a href="...">` and intercepted for client-side navigation.
- Static and dynamic component props with `defineProps()`.
- Server-side rendering.
- Head/meta rendering from `resux.config.ts`, `definePageMeta`, `useHead`, and `useSeoMeta`.
- Route middleware from `middleware/`, including `.global` middleware.
- Request-time server middleware from `server/middleware`.
- Plugins from `plugins/` with `defineResuxPlugin`.
- Server API/routes from `server/api` and `server/routes`.
- Server handler helpers: `readBody(event)` and `getQuery(event)`.
- `error.vue` for custom 404/500 rendering.
- Public file serving from `public/`.
- Built-in health checks at `/__resux/health`.
- Basic `resux.config.ts` support for `runtimeConfig`, `app.head`, and `css`.
- Built-in and package/local Resux modules for extending CSS, head, route rules, and runtime config during build.
- Route rules for redirects, response headers, status codes, cache headers, and CORS headers.
- Default production security headers with an opt-out flag.
- Vite-powered dev serving, production client/server bundling, and minification for the resume runtime and handler chunks.
- Component-level dev hot updates after successful rebuilds, without adding Vue hydration.
- `resux inspect` and `resux inspect --json` for route and build diagnostics.
- `resux deploy --preset node|docker|nitro` for deployment file generation.
- Serialized route, state, and async data payloads.
- Resumable event handlers such as `@click="increment"`.
- Lazy client handler chunks loaded on first interaction.
- Client-side navigation, persistent same-layout DOM, built-in route transition progress, and hover/focus route payload prefetch for same-origin links.
- MVP composables: `useState`, `useAsyncData`, `useRoute`, `useHead`, `useSeoMeta`, `useRuntimeConfig`, `useResuxApp`, `useFetch`, `$fetch`, and `onMounted`.
- `useAsyncData` returns a resource with `value`, `pending`, and `error` state, and still works with `await` when you want to block setup.

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
    Count: {{ count.value }}
  </button>
</template>
```

On the server, Resux renders the button as HTML and serializes `count`.

In the browser, Resux installs a tiny delegated event listener. The component handler module is not imported until the user clicks the button. After that, the scope is resumed from serialized state and only the marked DOM bindings are patched.

## Async Data Skeletons

For a Next-style loading skeleton, call `useAsyncData` without `await` and branch on `pending`:

```vue
<script setup lang="ts">
const stats = useAsyncData("stats", async () => {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return { response: "14 ms" }
})
</script>

<template>
  <div v-if="stats.pending" class="skeleton"></div>
  <strong v-if="!stats.pending">{{ stats.value.response }}</strong>
</template>
```

Resux serializes the pending state, renders the skeleton immediately, resumes only scopes with pending async data in the browser, and patches the marked DOM blocks after the data resolves.

## Supported Syntax

The MVP compiler supports:

- Static elements and text.
- Interpolation: `{{ value }}`.
- Static attributes: `class="box"`.
- Dynamic attributes: `:class="className"`.
- Dynamic class arrays/objects and style objects for `:class` and `:style`.
- Plain named events: `@click="increment"`.
- Inline event expressions that only capture resumable values, such as `@click="count.value++"`.
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
- `useHead({ title, meta, link })`.
- `useSeoMeta({ title, description, ogTitle, ogImage, twitterCard })`.
- `onMounted()`, run when the component scope is first resumed in the browser.
- Vue runtime islands via `<VueIsland name="CounterIsland" :props="{ start: 1 }" />` and files in `islands/vue`.

Handlers and inline event expressions must only capture resumable values, such as refs returned by `useState`.

## Current Limits

Resux intentionally rejects or does not support many advanced framework/Vue features yet:

- Vue runtime is island-only; Resux components still do not hydrate through Vue.
- Nitro support is an adapter/deployment preset, not the primary dev server.
- Event `.capture` and `.passive` are accepted in templates, but the browser runtime still uses delegated resumable listeners.
- No fallback hydration for unsupported components.

Unsupported resumability patterns should fail at compile time instead of silently hydrating.

## Architecture

Resux is one package with four internal parts:

- Compiler: parses `.vue` files, creates routes, validates resumable handlers, and emits server/client modules.
- Runtime: renders HTML on the server, provides Resux-style composables, runs plugins, applies layouts, collects head entries, and serializes payloads.
- CLI: builds apps, starts the dev server, and previews generated output.
- Create CLI: scaffolds a starter app for `resux init`.

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
- Dynamic route params.
- Layout rendering.
- Head/meta rendering.
- Runtime config and plugin provides.
- Project discovery for layouts, middleware, server middleware, plugins, API routes, and config.
- Extended route-rule serialization.
- Client resume behavior after interaction.
