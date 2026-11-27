// Tailwind integration for resuxjs/theme: compiles real Tailwind v3 (darkMode "selector") and v4
// (@custom-variant dark) CSS, loads it in Chromium and checks that `dark:` utilities follow the theme.
// Installs tailwindcss into a temp dir, so it needs network access (like the CI browser job).
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startBrowserApp } from "./browser-harness.mjs";

const html = `<div id="tw" class="bg-white dark:bg-black">tw</div>`;
const page = (attribute) => ({
  "resux.config.ts": `export default defineResuxConfig({
  deploy: { target: "auto" },
  modules: ["resux:security", ["resuxjs/theme", { attribute: "${attribute}", themeColor: { light: "#ffffff", dark: "#000000" } }]],
  runtimeConfig: { public: { appName: "Tailwind Theme" } }
})
`,
  "pages/index.vue": `<script setup lang="ts">
import { useTheme } from "resuxjs/theme";
const count = ref(0);
function increment() { count.value++; }
function toggle() { useTheme().toggle(); }
</script>

<template>
  <main>
    <div id="tw" class="bg-white dark:bg-black">tw</div>
    <button id="count" @click="increment">Count: {{ count }}</button>
    <button id="toggle" @click="toggle">Toggle</button>
  </main>
</template>
`,
});

const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
};

const variants = [
  {
    name: "tailwind v3 darkMode selector (class)",
    attribute: "class",
    async build(dir) {
      await writeFile(path.join(dir, "package.json"), '{"name":"tw3","private":true}');
      run("npm", ["install", "--no-audit", "--no-fund", "tailwindcss@3.4.17"], dir);
      await writeFile(path.join(dir, "tailwind.config.cjs"), 'module.exports = { darkMode: "selector", content: ["./in.html"] };');
      await writeFile(path.join(dir, "in.css"), "@tailwind utilities;");
      run("npx", ["tailwindcss", "-i", "in.css", "-o", "out.css"], dir);
    },
  },
  {
    name: "tailwind v4 @custom-variant dark (class)",
    attribute: "class",
    async build(dir) {
      await writeFile(path.join(dir, "package.json"), '{"name":"tw4","private":true}');
      run("npm", ["install", "--no-audit", "--no-fund", "tailwindcss@4", "@tailwindcss/cli@4"], dir);
      await writeFile(path.join(dir, "in.css"), '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));\n');
      run("npx", ["@tailwindcss/cli", "-i", "in.css", "-o", "out.css"], dir);
    },
  },
  {
    name: "tailwind v4 @custom-variant dark (data-theme)",
    attribute: "data-theme",
    async build(dir) {
      await writeFile(path.join(dir, "package.json"), '{"name":"tw4d","private":true}');
      run("npm", ["install", "--no-audit", "--no-fund", "tailwindcss@4", "@tailwindcss/cli@4"], dir);
      await writeFile(path.join(dir, "in.css"), '@import "tailwindcss";\n@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));\n');
      run("npx", ["@tailwindcss/cli", "-i", "in.css", "-o", "out.css"], dir);
    },
  },
];

let failed = false;
const check = (condition, label, detail = "") => {
  if (condition) console.log(`[theme-tailwind] ok   ${label}`);
  else {
    failed = true;
    console.error(`[theme-tailwind] FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
};

for (const variant of variants) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resux-tw-"));
  let app;
  try {
    await writeFile(path.join(dir, "in.html"), html);
    await variant.build(dir);
    const css = await readFile(path.join(dir, "out.css"), "utf8");
    check(/dark\\:bg-black/.test(css), `${variant.name}: compiled CSS contains the dark: utility`);
    app = await startBrowserApp(page(variant.attribute), "");
    const base = `http://127.0.0.1:${app.port}`;
    const bg = (p) => p.evaluate(() => getComputedStyle(document.querySelector("#tw")).backgroundColor);
    for (const scheme of ["dark", "light"]) {
      const context = await app.browser.newContext({ colorScheme: scheme });
      const p = await context.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(String(e)));
      await p.goto(`${base}/`);
      await p.addStyleTag({ content: css });
      check((await bg(p)) === (scheme === "dark" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)"), `${variant.name}: system ${scheme} drives dark: utilities`);
      await p.click("#count");
      await p.waitForFunction(() => document.querySelector("#count")?.textContent?.includes("1"), null, { timeout: 5000 }).catch(() => {});
      check((await p.textContent("#count"))?.includes("1"), `${variant.name}: counter still resumes`);
      await p.click("#toggle");
      await p.waitForFunction((want) => getComputedStyle(document.querySelector("#tw")).backgroundColor === want, scheme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)", { timeout: 5000 }).catch(() => {});
      check((await bg(p)) === (scheme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)"), `${variant.name}: toggle flips the dark: utilities (from ${scheme})`);
      if (variant.attribute === "data-theme") {
        check((await p.evaluate(() => document.documentElement.getAttribute("data-theme"))) === (scheme === "dark" ? "light" : "dark"), `${variant.name}: data-theme attribute is set`);
      }
      check(errors.length === 0, `${variant.name}: no page errors`, errors.join(" | "));
      await context.close();
    }
  } catch (error) {
    failed = true;
    console.error(`[theme-tailwind] setup failed for ${variant.name}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  } finally {
    await app?.close(failed);
    await rm(dir, { recursive: true, force: true });
  }
}

process.exit(failed ? 1 : 0);
