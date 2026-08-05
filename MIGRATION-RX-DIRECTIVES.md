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

## Official shortcuts

For everyday templates, Resux provides concise shortcuts for its two most common directive families:

| Full Resux syntax | Shortcut |
| --- | --- |
| `rx-on:event` | `@event` |
| `rx-bind:name` | `:name` |

```vue
<template>
  <button @click.prevent="save" :disabled="pending">
    Save
  </button>

  <li rx-for="item in items" :key="item.id">
    {{ item.title }}
  </li>
</template>
```

The full and shortcut forms compile to the same Resux event and binding model. Use the shortcut when it improves readability; use the full `rx-on:*` or `rx-bind:*` form when teaching the syntax or when the explicit name is clearer.

## Development-only event delegation warnings

Resux template events use delegated browser listeners so the page can remain resumable without attaching one listener to every rendered element. During `resux dev`, the compiler warns when normal Resux components clearly bypass that model:

```vue
<!-- Development warning: use @click instead. -->
<button onclick="save()">Save</button>

<script setup lang="ts">
const button = ref<HTMLButtonElement | null>(null)

onMounted(() => {
  // Development warning: place @click on the template element instead.
  button.value?.addEventListener('click', save)
})
</script>
```

These diagnostics are advisory and development-only. Production builds do not print them. Direct listeners remain valid for `window`, `document`, third-party `EventTarget` objects, or cases that need manual lifecycle control. Manually attached listeners should always be removed during cleanup. Vue islands are excluded because their client behavior is owned by Vue.

## Why this change

Resux uses Vue compiler packages to parse `.vue` single-file components, but normal Resux components are rendered and resumed by the Resux compiler/runtime rather than hydrated by the Vue runtime. The `rx-*` prefix makes that ownership visible in application code and gives the framework a stable branded syntax layer.

## Supported mapping

| Resux syntax | Shortcut | Internal Vue-parser form |
| --- | --- | --- |
| `rx-if` | — | `v-if` |
| `rx-else-if` | — | `v-else-if` |
| `rx-else` | — | `v-else` |
| `rx-for` | — | `v-for` |
| `rx-show` | — | `v-show` |
| `rx-text` | — | `v-text` |
| `rx-html` | — | `v-html` |
| `rx-model` | — | `v-model` |
| `rx-bind:name` | `:name` | `v-bind:name` |
| `rx-on:event` | `@event` | `v-on:event` |
| `rx-slot:name` | — | `v-slot:name` |

The conversion happens before Vue's template parser runs. Only directive attribute names in `<template>` blocks are changed. Script strings, CSS, comments, text nodes, and attribute values are not rewritten.

## Compatibility

Existing `v-*` syntax remains supported so current projects can migrate gradually. `@event` and `:binding` are first-class Resux shortcuts and are recommended for concise new code.

No removal date is set for the `v-*` compatibility syntax.

## State guidance

Use the smallest state scope:

- `ref` for a local scalar, toggle, selected value, counter, or loading flag.
- `reactive` for a local object whose fields belong together.
- `computed`, `watch`, and `watchEffect` for derived values and side effects.
- `useState` only for named, JSON-compatible state owned by one rendered component scope and serialized into the Resux payload.
- `useGlobalState` only for intentionally shared, request-isolated application state.
- `useAsyncData` or `useFetch` for server data with loading and error state.

Do not replace every local `ref` with `useState`. A named state key is useful only when named serialization is part of the design.
