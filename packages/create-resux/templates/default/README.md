# %PROJECT_TITLE%

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

`npm run dev` starts the Resux dev server with Vite-powered client module serving. `npm run build` creates the production `.resux/client` and `.resux/server-bundle` bundles with Vite, and `npm run start` serves the built app. `npm run build:nitro` builds a Nitro server in `.output`.

This starter includes file-based pages, a default layout, `error.vue`, built-in SEO/security/performance modules, a server API route at `/api/status`, the built-in `/__resux/health` endpoint, TypeScript globals, `ResuxLink to`, async-data plus `v-text` examples, and a Vue runtime island in `islands/vue`.

See `DEPLOYMENT.md` for Node, Docker, and Nitro deployment commands.
