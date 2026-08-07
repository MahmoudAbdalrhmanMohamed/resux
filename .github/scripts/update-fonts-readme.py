from pathlib import Path

path = Path("README.md")
text = path.read_text()

old = '''## Fonts (`resuxjs/fonts`)

The `resuxjs/fonts` module manages preconnect optimizations, Google Fonts URL building, font loading priority strategies (`lazy`, `preload`, `eager`), and post-onload deferral.

```ts
export default defineResuxConfig({
  modules: [
    ["resuxjs/fonts", {
      preconnect: true,
      strategy: "lazy",
      deferUntilPageLoad: true,
      google: [
        { name: "Inter", weights: [400, 500, 600, 700, 800], display: "swap" },
        { name: "Alexandria", weights: [300, 400, 500, 600, 700], display: "swap" }
      ]
    }]
  ]
})
```
'''

new = '''## Fonts (`resuxjs/fonts`)

The `resuxjs/fonts` module builds Google Fonts stylesheet URLs, adds optional preconnect hints, and lets you control loading globally or per font family.

The default strategy is `eager`. Use `preload` for fonts that are critical to the first render and `lazy` for families that can wait until after the page finishes loading.

```ts
export default defineResuxConfig({
  modules: [
    ["resuxjs/fonts", {
      preconnect: true,
      strategy: "eager",
      google: [
        {
          name: "Inter",
          weights: ["100..900"],
          display: "swap",
          strategy: "preload"
        },
        {
          name: "Alexandria",
          weights: [300, 400, 500, 600, 700],
          display: "swap",
          strategy: "lazy"
        }
      ]
    }]
  ]
})
```

In this example, `Inter` is preloaded and also attached as a stylesheet, while `Alexandria` is deferred until page load. A family-level `strategy` overrides the module-level strategy. `strategy: "lazy"` already enables page-load deferral, so `deferUntilPageLoad: true` is not needed alongside it.
'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"Expected exactly one old Fonts block, found {count}")

path.write_text(text.replace(old, new))
