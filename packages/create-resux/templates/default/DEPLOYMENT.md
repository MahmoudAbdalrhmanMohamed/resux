# Deployment

Build the app before serving it:

```sh
npm run build
npm run start
```

The server reads `PORT`, so most Node hosts can run the same start command.

Health checks can call:

```txt
/__resux/health
```

For Docker:

```sh
docker build -t %PROJECT_NAME% .
docker run --rm -p 3000:3000 %PROJECT_NAME%
```

For Nitro:

```sh
npm run build:nitro
npm run start:nitro
```

Set `NITRO_PRESET` before `npm run build:nitro` to target a supported Nitro provider.
The default Nitro config keeps SSR pages, API routes, and Resux route payloads uncached, while immutable Resux runtime assets are cacheable for one year.

Use `npm run inspect` to print the routes, server handlers, route rules, and build features that will be served.

To refresh these deployment files after changing Resux versions:

```sh
npx @resux/resux deploy . --preset docker --force
npx @resux/resux deploy . --preset nitro --force
```
