# Resux

**Resux** stands for **Resumability + User Experience (UX)**.

Resux is an experimental HTML-first web framework with a custom resumable runtime. It uses familiar `.vue` files and file-based routing, but normal Resux components do **not** use Vue hydration or the Vue runtime. The compiler renders HTML on the server, serializes the state needed to continue, and loads browser handler code when interaction actually needs it.

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

The icons package provides a **Vue SVG icon component**, a mutable local SVG-path registry, and optional client-side Iconify-compatible remote fetching.

```vue
<script setup lang="ts">
import { Icon } from 'resuxjs/icons'
</script>

<template>
  <Icon name="check" />
  <Icon name="ph:check-circle" lazy />
</template>
```

Current module defaults include `collections: []`, `mode: 'svg'`, component name `Icon`, and `lazy: false`. Local registry entries can render without a remote request; unknown remote icons resolve on the client. `collections` does not automatically mean entire icon collections are pre-bundled.

Deep reference: https://mahmoudabdalrhmanmohamed.github.io/resux-docs/icons/

## Fonts (`resuxjs/fonts`)

The first-party fonts module is currently a **Google Fonts stylesheet loader**. It supports configured families/weights, `font-display`, preconnect, and eager/preload/lazy loading strategies.

```ts
export default defineResuxConfig({
  modules: [
    ['resuxjs/fonts', {
      google: [
        {
          name: 'Inter',
          weights: ['100..900'],
          display: 'swap'
        }
      ]
    }]
  ]
})
```

It does not currently implement local font discovery, self-host/download management, provider plugins, generated `@font-face`, fallback metric generation, or CSS-variable generation.

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
