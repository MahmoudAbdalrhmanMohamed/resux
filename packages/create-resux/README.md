# create-resux

Starter scaffolder for Resux, an experimental web framework prototype with server rendering and a custom resumable runtime.

> Resux is an MVP and is not production-ready yet.

## Usage

```sh
npm create resux@latest
```

With a project directory:

```sh
npm create resux@latest my-app
```

Skip dependency installation:

```sh
npm create resux@latest my-app -- --no-install
```

Then run the generated app:

```sh
cd my-app
npm install
npm run dev
```

## Generated App

The starter includes:

- File-based routes in `pages/`.
- A default layout.
- `error.vue` for custom error rendering.
- Server API example in `server/api/status.ts`.
- Resux config with built-in SEO, security, and performance modules.
- TypeScript globals wired to `@resux/resux/globals`.
- Docker and Nitro deployment files.

The generated package uses one Resux dependency: `@resux/resux`. The CLI command is `resux`.

## Options

```sh
npm create resux@latest -- --help
```

Available options:

- `--install`: install dependencies after scaffolding.
- `--no-install`: skip dependency installation.
- `--package-manager <pm>`: use `npm`, `pnpm`, `yarn`, or `bun`.
- `--force`: empty the target directory before scaffolding.
- `-y, --yes`: use defaults.
