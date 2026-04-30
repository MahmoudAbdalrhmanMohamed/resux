# @resux/resux

The main Resux package, similar to how Nuxt apps install `nuxt`.

It includes the Resux CLI, compiler, runtime, Vue support, Vite integration, and optional Nitro deployment tooling behind one app-facing dependency.

> Resux is an MVP and is not production-ready yet.

## Create A New App

```sh
npm create resux@latest my-app
cd my-app
npm install
npm run dev
```

Generated apps depend on `@resux/resux`, but the installed command is named `resux`.

## Install Manually

```sh
npm install @resux/resux
```

Add scripts to your app:

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

## Commands

```sh
resux dev [app-root]
resux build [app-root]
resux preview [app-root]
resux start [app-root]
resux inspect [app-root]
resux deploy [app-root]
```

Useful flags:

```sh
resux dev --port 4000
resux preview --host 0.0.0.0 --port 4000
resux inspect --json
resux deploy . --preset docker
resux deploy . --preset nitro
```

## Runtime Exports

Node adapter:

```ts
import { createResuxNodeHandler } from "@resux/resux/node";
```

Type globals:

```json
{
  "compilerOptions": {
    "types": ["@resux/resux/globals"]
  }
}
```

## Related Packages

- `create-resux`: starter scaffolder used by `npm create resux@latest`.
- `@resux/compiler`: internal SFC compiler and route manifest builder.
- `@resux/runtime`: internal SSR runtime, composables, and client resume loader.
