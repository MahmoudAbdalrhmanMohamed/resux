// Browser tests for the resuxjs/theme module: no flash on reload, resumability next to the toggle,
// manual choice, theme-color metas, forced pages across client navigation, saved choice untouched.
// Same requirements as scripts/test-browser.mjs (playwright-core and a Chrome/Chromium binary).
import { startBrowserApp } from "./browser-harness.mjs";

const files = {
  "resux.config.ts": `export default defineResuxConfig({
  deploy: { target: "auto" },
  modules: [
    "resux:security",
    "resux:performance",
    ["resuxjs/theme", {
      colors: { light: { bg: "#ffffff", fg: "#111111" }, dark: { bg: "#0b0b0b", fg: "#eeeeee" } },
      themeColor: { light: "#ffffff", dark: "#0b0b0b" }
    }]
  ],
  runtimeConfig: { public: { appName: "Theme Test" } }
})
`,
  "pages/index.vue": `<script setup lang="ts">
import { useTheme } from "resuxjs/theme";
const count = ref(0);
const label = ref("");
function increment() { count.value++; }
function toggle() { const theme = useTheme(); theme.toggle(); label.value = theme.resolved; }
</script>

<template>
  <main class="page">
    <h1>Theme test</h1>
    <button id="count" @click="increment">Count: {{ count }}</button>
    <button id="toggle" @click="toggle">Toggle</button>
    <p id="label">{{ label }}</p>
    <a id="to-forced" href="/forced">forced page</a>
  </main>
</template>

<style scoped>
.page { background: var(--bg); color: var(--fg); min-height: 100vh; }
</style>
`,
  "pages/forced.vue": `<script setup lang="ts">
import { forceTheme } from "resuxjs/theme";
useHead(forceTheme("light"));
</script>

<template>
  <main class="page"><h1>Forced light</h1><a id="back" href="/">home</a></main>
</template>

<style scoped>
.page { background: var(--bg); color: var(--fg); min-height: 100vh; }
</style>
`,
};

let app;
let failed = false;
const check = (condition, label, detail = "") => {
  if (condition) {
    console.log(`[theme] ok   ${label}`);
  } else {
    failed = true;
    console.error(`[theme] FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
};

try {
  app = await startBrowserApp(files, "");
  const base = `http://127.0.0.1:${app.port}`;
  const isDark = (page) => page.evaluate(() => document.documentElement.classList.contains("dark"));
  const bodyBg = (page) => page.evaluate(() => getComputedStyle(document.querySelector("main")).backgroundColor);

  for (const scheme of ["dark", "light"]) {
    const context = await app.browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto(`${base}/`);
    check((await isDark(page)) === (scheme === "dark"), `system ${scheme}: html class follows the system`);
    check((await bodyBg(page)) === (scheme === "dark" ? "rgb(11, 11, 11)" : "rgb(255, 255, 255)"), `system ${scheme}: CSS variables switch`);
    await context.close();
  }

  const context = await app.browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${base}/`);
  await page.click("#count");
  await page.waitForFunction(() => document.querySelector("#count")?.textContent?.includes("1"), null, { timeout: 5000 }).catch(() => {});
  check((await page.textContent("#count"))?.includes("1"), "counter still resumes with the theme module on");

  await page.click("#toggle");
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"), null, { timeout: 5000 }).catch(() => {});
  check(await isDark(page), "toggle switches to dark");
  check((await page.textContent("#label"))?.trim() === "dark", "useTheme().resolved reads dark after toggle");
  check((await page.evaluate(() => localStorage.getItem("resux-theme"))) === "dark", "choice is saved in localStorage");
  const metas = await page.evaluate(() => [...document.querySelectorAll("meta[data-resux-theme-color]")].map((m) => `${m.getAttribute("data-resux-theme-color")}:${m.media}`).join());
  check(metas === "light:not all,dark:all", "theme-color follows the manual choice", metas);

  // No flash: when <body> is first inserted, <html> already carries the saved mode.
  await page.addInitScript(() => {
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeName === "BODY" && window.__darkAtBody === undefined) {
            window.__darkAtBody = document.documentElement.classList.contains("dark");
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.reload();
  check((await page.evaluate(() => window.__darkAtBody)) === true, "reload: dark is set before <body> exists (no flash)");

  await page.click("#to-forced");
  await page.waitForURL("**/forced", { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => document.documentElement.getAttribute("data-theme-forced") === "light", null, { timeout: 5000 }).catch(() => {});
  check(!(await isDark(page)), "client navigation to a forced page switches to light");
  await page.click("#back");
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-theme-forced"), null, { timeout: 5000 }).catch(() => {});
  check(await isDark(page), "navigating back restores the saved dark mode");

  await page.goto(`${base}/forced`);
  check(!(await isDark(page)), "direct load of a forced page is light");
  check((await page.evaluate(() => localStorage.getItem("resux-theme"))) === "dark", "forced page leaves the saved choice alone");
  check(errors.length === 0, "no page errors", errors.join(" | "));
  await context.close();
} catch (error) {
  failed = true;
  console.error(`[theme] setup failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
} finally {
  await app?.close(failed);
}

process.exit(failed ? 1 : 0);
