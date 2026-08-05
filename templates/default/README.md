# %PROJECT_TITLE%

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

`npm run dev` starts the Resux dev server with Vite-powered client module serving. `npm run build` creates production `.resux` assets and a Nitro `.output` server, and `npm run start` serves the built app.

This starter includes file-based pages, a default layout, `error.vue`, page-level `useSeoMeta`, route middleware (`middleware/log.global.ts` and `middleware/auth.ts`), an app plugin (`plugins/01.app.ts`), built-in security/performance modules, a server API route at `/api/status`, the built-in `/__resux/health` endpoint, TypeScript globals, `ResuxLink to`, local `ref`/`reactive` state, async data, branded `rx-*` directives, official `@event` and `:binding` shortcuts, and a Vue runtime island in `islands/vue`.

Use `@click` as the concise form of `rx-on:click`, and `:disabled` as the concise form of `rx-bind:disabled`. Both forms compile to the same Resux event and binding model.

Use `ref` or `reactive` for ordinary local UI state. Use `useState` only when a named JSON-compatible value must be serialized as component-scope state, and `useGlobalState` only for intentionally shared application state.

See `DEPLOYMENT.md` for Node, Docker, and Nitro deployment commands.
