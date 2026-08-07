# create-resuxjs

> Official scaffolding CLI to quickly create new [Resux](https://github.com/MahmoudAbdalrhmanMohamed/resux) applications.

📖 **Official Documentation**: [https://mahmoudabdalrhmanmohamed.github.io/resux-docs/](https://mahmoudabdalrhmanmohamed.github.io/resux-docs/)

---

## Quickstart

Run the initializer using your package manager of choice:

```sh
# npm
npm create resuxjs@latest

# npx
npx create-resuxjs@latest

# pnpm
pnpm create resuxjs@latest

# yarn
yarn create resuxjs

# bun
bun create resuxjs@latest
```

### Specifying a Project Name

```sh
npx create-resuxjs@latest my-resux-app
```

---

## Command Options

| Option | Description | Example |
| :--- | :--- | :--- |
| `[dir]` | Target directory for the new app | `npx create-resuxjs my-app` |
| `--features` | Comma-separated list of optional features (`i18n`, `pwa`) | `--features i18n,pwa` |
| `--hreflang` | Enable i18n `hreflang` alternate links | `--features i18n --hreflang` |
| `--no-install` | Skip automatic dependency installation | `--no-install` |

---

## What Gets Scaffolds?

Each generated Resux app comes pre-configured with:
- **Resumable SSR Runtime**: Fine-grained server rendering with minimal client JS overhead.
- **Vue-like SFC Routing**: File-based routing in `pages/` using familiar `.vue` single-file components.
- **Built-in Dev Server & Nitro Engine**: Instant HMR dev server powered by Vite & multi-target server engine powered by Nitro.
- **TypeScript Support**: Full type checking and auto-generated globals out of the box.

---

## Next Steps

Once your project is created:

```sh
cd my-resux-app
npm run dev
```

Open `http://localhost:3000` to start developing!

---

## Resources

- 📖 **Documentation**: [https://mahmoudabdalrhmanmohamed.github.io/resux-docs/](https://mahmoudabdalrhmanmohamed.github.io/resux-docs/)
- 📦 **NPM Package**: [https://www.npmjs.com/package/create-resuxjs](https://www.npmjs.com/package/create-resuxjs)
- 🐙 **GitHub Repository**: [https://github.com/MahmoudAbdalrhmanMohamed/resux](https://github.com/MahmoudAbdalrhmanMohamed/resux)
- 🐞 **Report Issues**: [https://github.com/MahmoudAbdalrhmanMohamed/resux/issues](https://github.com/MahmoudAbdalrhmanMohamed/resux/issues)

---

License: [MIT](https://github.com/MahmoudAbdalrhmanMohamed/resux/blob/main/LICENSE)

