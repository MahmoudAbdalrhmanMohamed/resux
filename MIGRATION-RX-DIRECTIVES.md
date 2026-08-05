# Resux `rx-*` directive migration

Resux now has its own first-class template directive prefix: `rx-*`.

```vue
<template>
  <button rx-on:click.prevent="save" rx-bind:disabled="pending">
    Save
  </button>

  <p rx-if="error">{{ error.message }}</p>
  <li rx-for="item in items" rx-bind:key="item.id">
    {{ item.title }}
  </li>
</template>
```

## Why this change

Resux uses Vue compiler packages to parse `.vue` single-file components, but normal Resux components are rendered and resumed by the Resux compiler/runtime rather than hydrated by the Vue runtime. The `rx-*` prefix makes that ownership visible in application code and gives the framework a stable branded syntax layer.

## Supported mapping

| Resux syntax | Internal Vue-parser form |
| --- | --- |
| `rx-if` | `v-if` |
| `rx-else-if` | `v-else-if` |
| `rx-else` | `v-else` |
| `rx-for` | `v-for` |
| `rx-show` | `v-show` |
| `rx-text` | `v-text` |
| `rx-html` | `v-html` |
| `rx-model` | `v-model` |
| `rx-bind:name` | `v-bind:name` |
| `rx-on:event` | `v-on:event` |
| `rx-slot:name` | `v-slot:name` |

The conversion happens before Vue's template parser runs. Only directive attribute names in `<template>` blocks are changed. Script strings, CSS, comments, text nodes, and attribute values are not rewritten.

## Compatibility

Existing `v-*`, `:binding`, and `@event` syntax remains supported so current projects can migrate gradually. New Resux documentation and starter templates use explicit `rx-bind:*` and `rx-on:*` syntax.

No removal date is set for the compatibility syntax.

## State guidance

Use the smallest state scope:

- `ref` for a local scalar, toggle, selected value, counter, or loading flag.
- `reactive` for a local object whose fields belong together.
- `computed`, `watch`, and `watchEffect` for derived values and side effects.
- `useState` only for named, JSON-compatible state owned by one rendered component scope and serialized into the Resux payload.
- `useGlobalState` only for intentionally shared, request-isolated application state.
- `useAsyncData` or `useFetch` for server data with loading and error state.

Do not replace every local `ref` with `useState`. A named state key is useful only when named serialization is part of the design.
