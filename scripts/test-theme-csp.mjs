// resuxjs/theme under a Content-Security-Policy header that allows inline scripts and styles
// (the framework's own inline payload needs the same allowance): the pre-paint script must still run
// and no CSP violation may come from the theme. Needs playwright-core and a Chrome/Chromium binary.
import { startBrowserApp } from "./browser-harness.mjs";

const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
const files = {
  "resux.config.ts": `export default defineResuxConfig({
  deploy: { target: "auto" },
  modules: [
    ["resux:security", { contentSecurityPolicy: ${JSON.stringify(csp)} }],
    ["resuxjs/theme", { colors: { light: { bg: "#ffffff" }, dark: { bg: "#0b0b0b" } } }]
  ],
  runtimeConfig: { public: { appName: "Theme CSP" } }
})
`,
  "pages/index.vue": `<script setup lang="ts">
const count = ref(0);
function increment() { count.value++; }
</script>

<template>
  <main style="background: var(--bg)"><button id="count" @click="increment">Count: {{ count }}</button></main>
</template>
`,
};

let app;
let failed = false;
const check = (condition, label, detail = "") => {
  if (condition) {
    console.log(`[theme-csp] ok   ${label}`);
  } else {
    failed = true;
    console.error(`[theme-csp] FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
};

try {
  app = await startBrowserApp(files, "");
  const context = await app.browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  const violations = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  const response = await page.goto(`http://127.0.0.1:${app.port}/`);
  check(response?.headers()["content-security-policy"] === csp, "the CSP header is sent");
  check(await page.evaluate(() => document.documentElement.classList.contains("dark")), "the pre-paint script runs under the CSP");
  const background = await page.evaluate(() => getComputedStyle(document.querySelector("main")).backgroundColor);
  check(background === "rgb(11, 11, 11)", "the theme CSS variables apply under the CSP", background);
  await page.click("#count");
  await page.waitForFunction(() => document.querySelector("#count")?.textContent?.includes("1"), null, { timeout: 5000 }).catch(() => {});
  check((await page.textContent("#count"))?.includes("1"), "the counter still resumes");
  check(violations.length === 0, "no CSP violations", violations.join(" | "));
  await context.close();
} catch (error) {
  failed = true;
  console.error(`[theme-csp] setup failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
} finally {
  await app?.close(failed);
}

process.exit(failed ? 1 : 0);
