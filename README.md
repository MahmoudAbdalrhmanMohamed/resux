# Resux

**Resux** stands for **Resumability + User Experience (UX)**.

Resux is a public-beta HTML-first web framework with a custom resumable runtime. It uses familiar `.vue` files and file-based routing, but normal Resux components do **not** use Vue hydration or the Vue runtime. The compiler renders HTML on the server, serializes the state needed to continue, and loads browser handler code when interaction actually needs it.

🧪 **Status:** Public beta. Resux is ready for evaluation and real-world testing, but its APIs may still change before 1.0.

📖 **Documentation:** https://mahmoudabdalrhmanmohamed.github.io/resux-docs/

## Why Resux

Resux is centered on explicit runtime cost:

- server-render useful HTML first;
- preserve serializable state for resumability;
- load event-handler/client code on interaction instead of hydrating every normal component;
- use progressive client enhancements when server HTML can remain useful first;
- use Vue islands only when a widget genuinely needs a Vue component/runtime subtree;
- keep server-only, client-only, and progressive package boundaries explicit.

The documentation explains these boundaries in detail rather than describing Resux as a normal Vue SSR framework.

## Resume-First architecture

Resux uses a **Resume-First** startup model:

- server/static-only pages ship no Resux client JavaScript;
- event-only pages ship serialized state plus a small resume bootstrap and load the full runtime on the first matching interaction;
- client enhancements can defer runtime loading to visibility, interaction, idle time, page load, or manual activation;
- Vue islands remain explicit client boundaries and can opt into the same trigger model while preserving immediate mounting by default; interaction islands keep server-rendered fallback content until activation;
- normal links keep native browser navigation before the application has a real reason to resume.

```vue
<VueIsland
  name="AnalyticsChart"
  trigger="visible"
  :props="{ range: '30d' }"
/>
```

The critical bootstrap has enforced 14 KiB raw and 5 KiB gzip worst-case size budgets. See [Resux Resume-First Architecture](docs/resume-first.md) for the execution model, performance rules, and the framework ideas Resux intentionally learns from Qwik, Astro, Angular, Nuxt, Next.js, and Svelte.

## Create an app

```sh
npx create-resuxjs@latest my-app
cd my-app
npm install
npm run dev
```

You can also scaffold through the framework CLI:

```sh
npx resuxjs@latest init my-app
```

Current framework source requires Node.js `>=20.19.0`.

## A normal Resux component

```vue
<script setup lang="ts">
const count = ref(0)

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

The normal Resux path is compiled into server HTML, serialized state, and resumable event-handler modules. It is not automatically turned into a Vue-hydrated component.

## Main framework areas

The documentation site is the authoritative deep reference for:

- compiler and supported SFC/template syntax;
- SSR, resumability, state, handlers, and client navigation;
- pages, layouts, middleware, plugins, server routes, modules, hooks, and route rules;
- data fetching, runtime config, SEO/head APIs, error handling, and TypeScript;
- third-party package modes and progressive client enhancements;
- first-party images/video media primitives;
- optional UI, icon, font, i18n, and Vue-island features;
- CLI, inspection/check commands, deployment, security, testing, release flow, and Halal Core;
- public package exports and API references.

Start with the **Framework Tour**, then use the API/reference sections for exact contracts.

## Routing, Links, and View Transitions

Resux provides file-based routing under `pages/` with client route payload navigation, prefetching, and native browser **View Transitions API** support:

```vue
<template>
  <!-- Native browser view transition with ResuxLink -->
  <ResuxLink to="/dashboard" :view-transition="true">
    Dashboard
  </ResuxLink>
</template>
```

```ts
// resux.config.ts
export default defineResuxConfig({
  router: {
    // Enable browser View Transitions API globally
    viewTransition: true
  }
})
```

You can also control transitions programmatically with `navigateTo(to, { viewTransition: true })`, declare per-page metadata with `definePageMeta({ viewTransition: true })`, inspect support via `useViewTransition()`, or pair with speculative preloading (`<script type="speculationrules">`) for zero-latency, smoothly animated page swaps.

## Built-in Teleport and Transitions

Resux includes built-in resumable implementations of `<Teleport>` and `<Transition>` that work without full Vue runtime hydration:

- `<Teleport to="#modal-root" :disabled="false">` renders server HTML with boundary markers and resumes client DOM placement and reactive updates seamlessly.
- `<Transition name="fade">` applies standard CSS transition lifecycle classes (`fade-enter-active`, `fade-enter-from`, `fade-leave-to`, etc.) during client DOM and state swaps while honoring `prefers-reduced-motion`.

## First-party images and video

`ResuxImg`, `ResuxPicture`, and `ResuxVideo` are handled by the Resux renderer. They are **not** `resuxjs/ui` Vue components.

```vue
<ResuxImg
  src="/images/hero.jpg"
  alt="Product dashboard"
  width="1200"
  height="675"
  sizes="100vw"
  priority
/>
```

The media runtime supports responsive image candidates, image transformation URLs/providers, placeholders, lazy/priority behavior, preloads, picture sources, video loading strategies, and optional image/video transformation paths. Image transformation uses Sharp; video transformation uses FFmpeg when requested.

Deep reference: https://mahmoudabdalrhmanmohamed.github.io/resux-docs/media/

## UI components (`resuxjs/ui`)

The UI package is optional and Vue-owned. Its public `Rx*` components (with matching `Resux*` aliases) belong inside a Vue island or another explicit Vue runtime boundary.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { RxButton, RxModal } from 'resuxjs/ui'

const open = ref(false)
</script>

<template>
  <RxButton @click="open = true">Open</RxButton>
  <RxModal v-model:open="open" title="Details">
    Vue-owned modal content
  </RxModal>
</template>
```

The package also exports `defineUiTokens()`, `isReducedMotion()`, `useAnimate()`, and the Vue directives `vAnime` / `vAnimate`.

Important current limits are documented per component. For example, component names do not imply unimplemented behavior: `RxReveal` currently animates on mount rather than viewport visibility, and `RxAutoAnimate` currently performs one mount animation rather than mutation-aware layout animation.

Component catalog: https://mahmoudabdalrhmanmohamed.github.io/resux-docs/components/

## Icons (`resuxjs/icons`)

The icons package provides a modular icon system with **Nuxt Icon parity**, compile-time SVG inlining, offline icon collection packages, and pure CSS mode:

```vue
<template>
  <!-- Auto-imported or explicit Icon component -->
  <Icon name="lucide:check" size="1.25rem" />
  <Icon name="ph:check-circle" mode="css" />
  <Icon name="custom:logo" />
</template>
```

Key features:
- **Compile-time inlining:** Known static icons are transformed directly into inlined `<svg>` markup during Vite compilation with 0 B runtime JavaScript.
- **Offline collections:** Bundles `@iconify-json/*` icon packages for offline/air-gapped rendering without external network calls.
- **CSS Mode:** Renders icons via CSS `mask` / `background` for ultra-lightweight, color-inheriting icons.
- **Custom Local SVGs:** Load custom SVG icons directly from your project's `./assets/icons` directory via `custom:*`.
- **Nuxt Icon Parity:** Drop-in syntax compatibility with standard collection prefixes and shortcuts.

Deep reference: https://mahmoudabdalrhmanmohamed.github.io/resux-docs/icons/

## Fonts (`resuxjs/fonts`)

The first-party fonts module provides an integrated font engine with zero-config automatic scanning, Fontaine-based zero-CLS fallback metrics, local self-hosting, and semantic weight resolution:

```ts
export default defineResuxConfig({
  modules: [
    ['resuxjs/fonts', {
      autoScan: true, // Automatically scan CSS and self-host fonts with fontless
      families: [
        {
          name: 'Inter',
          weights: ['regular', 'bold'], // Semantic named weights or ranges
          fallbacks: ['Arial'], // Fontaine zero-CLS font metric overrides
          variable: '--font-inter',
        }
      ]
    }]
  ]
})
```

Key capabilities:
- **Zero-CLS Metric Overrides:** Integrates `fontaine` to calculate and emit `@font-face` fallback rules with `size-adjust`, `ascent-override`, and `descent-override` matching your primary font to eliminate Cumulative Layout Shift (CLS).
- **Zero-Config Scanning (`autoScan`):** Automatically detects `font-family` declarations across CSS and templates via `fontless`.
- **Semantic Named Weights:** Normalizes weights like `thin`, `light`, `regular`, `semibold`, `bold`, `black` to numeric values.
- **Variable Font Axes:** Support for variable font axis configurations (`axes: { wght: 700, wdth: 100 }`).
- **Provider Support:** Seamlessly supports Google Fonts, local self-hosted files, and custom font providers.

Deep reference: https://mahmoudabdalrhmanmohamed.github.io/resux-docs/fonts/

## i18n (`resuxjs/i18n`)

Internationalization is opt-in:

```ts
export default defineResuxConfig({
  modules: ['resuxjs/i18n'],
  i18n: {
    defaultLocale: 'en',
    fallbackLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', name: 'English', dir: 'ltr' },
      { code: 'ar', name: 'العربية', dir: 'rtl' }
    ],
    messages: {
      en: () => import('./locales/en.json'),
      ar: () => import('./locales/ar.json')
    }
  }
})
```

See the documentation for routing strategy, translation helpers, locale switching, and SEO/hreflang behavior.

## Public package entry points

Resux separates browser/runtime and build/server concerns through package exports, including:

```txt
resuxjs
resuxjs/runtime
resuxjs/reactivity
resuxjs/compiler
resuxjs/create
resuxjs/i18n
resuxjs/ui
resuxjs/icons
resuxjs/fonts
resuxjs/kit
resuxjs/core
resuxjs/halal
resuxjs/node
resuxjs/globals
```

Use the focused package entry point when it keeps server/compiler code out of client-facing code or makes an optional feature boundary explicit.

Package/API coverage: https://mahmoudabdalrhmanmohamed.github.io/resux-docs/reference/coverage

## CLI

Common commands include:

```sh
resux init <project-dir>
resux dev <app-root>
resux build <app-root>
resux prepare <app-root>
resux preview <app-root>
resux start <app-root>
resux inspect <app-root>
resux check <app-root>
resux deploy <app-root>
```

Run `resux --help` and the CLI reference for the complete current options instead of relying on README snippets for every flag.

## Development

```sh
npm install
npm run typecheck
npm run build
npm test
npm run test:templates
```

For the repository's complete verification matrix, use the scripts defined in `package.json` and the GitHub Actions workflows. Release/package verification intentionally runs more checks than this introductory README lists.

## Documentation rule

The **source code, package exports, and tests are the source of truth**. The README is intentionally an introduction rather than a duplicate of the complete documentation site.

When a public API changes, update the implementation/tests and the relevant documentation together. Do not document a feature merely because a comparable framework has it.

## License

See [LICENSE](LICENSE).
