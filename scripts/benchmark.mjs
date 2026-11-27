// Reproducible page benchmark: builds one small app from the packed framework, serves it with the
// production server and measures it in headless Chromium. Run `npm run build && npm run bench`.
// Numbers are for this machine only. Compare runs on the same machine and the same Node and Chromium.
// Options: BENCH_RUNS (default 9), `--json` prints the raw result as JSON.
import { gzipSync } from "node:zlib";
import { startBrowserApp } from "./browser-harness.mjs";

const runs = Math.max(3, Number(process.env.BENCH_RUNS ?? 9));
const route = "bench-counter";
const files = {
  [`pages/${route}.vue`]: [
    '<script setup lang="ts">',
    "const count = ref(0)",
    "const items = ref(Array.from({ length: 200 }, (_, i) => ({ id: i, name: 'item ' + i })))",
    "function inc() { count.value++ }",
    "</script>",
    "<template>",
    "  <main>",
    '    <button id="inc" @click="inc">{{ count }}</button>',
    '    <ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>',
    "  </main>",
    "</template>",
    "",
  ].join("\n"),
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** One cold page load plus one click, with every response body counted. */
async function measureOnce(browser, url) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const bodies = [];
  page.on("response", (response) => {
    bodies.push(response.body().then((body) => ({ type: response.request().resourceType(), bytes: body.length, gzip: gzipSync(body).length })));
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("#inc");
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return { domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd };
  });
  const before = await Promise.all(bodies);
  const clickMs = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const button = document.querySelector("#inc");
        const start = performance.now();
        new MutationObserver((_, observer) => {
          observer.disconnect();
          resolve(performance.now() - start);
        }).observe(button, { childList: true, characterData: true, subtree: true });
        button.click();
      })
  );
  await page.waitForTimeout(300);
  const after = await Promise.all(bodies);
  await context.close();
  const sum = (list, type, key) => list.filter((entry) => type === "all" || entry.type === type).reduce((total, entry) => total + entry[key], 0);
  return {
    htmlBytes: sum(before, "document", "bytes"),
    htmlGzip: sum(before, "document", "gzip"),
    jsBytesOnLoad: sum(before, "script", "bytes"),
    jsGzipOnLoad: sum(before, "script", "gzip"),
    jsBytesAfterFirstClick: sum(after, "script", "bytes"),
    jsGzipAfterFirstClick: sum(after, "script", "gzip"),
    requestsOnLoad: before.length,
    domContentLoadedMs: timing.domContentLoaded,
    loadMs: timing.load,
    firstClickToUpdateMs: clickMs,
  };
}

const app = await startBrowserApp(files, route);
let failed = false;
try {
  const url = `http://127.0.0.1:${app.port}/${route}`;
  await measureOnce(app.browser, url); // warm the server, not counted
  const samples = [];
  for (let index = 0; index < runs; index++) samples.push(await measureOnce(app.browser, url));
  const result = Object.fromEntries(Object.keys(samples[0]).map((key) => [key, median(samples.map((sample) => sample[key]))]));
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ runs, node: process.version, browser: app.browser.version(), result }, null, 2));
  } else {
    console.log(`\nresux benchmark: ${route}, median of ${runs} cold loads, Node ${process.version}, Chromium ${app.browser.version()}`);
    for (const [key, value] of Object.entries(result)) console.log(`${key.padEnd(24)} ${Number.isInteger(value) ? value : value.toFixed(1)}`);
  }
} catch (error) {
  failed = true;
  console.error(`[bench] failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
} finally {
  await app.close(failed);
}
if (failed) process.exitCode = 1;
