# Benchmarks

`npm run bench` measures one small Resux page and prints the result. Anyone can rerun it.

```bash
npm run build
npm install --no-save playwright-core   # once, if it is not installed
CHROME_BIN=/path/to/chrome npm run bench
```

What it does: it packs the framework, scaffolds the `minimal` template, adds one page (a counter button and a 200-item `v-for` list), builds it, starts the production server and loads the page in headless Chromium. One warm-up load is not counted, then it takes the median of 9 cold loads (`BENCH_RUNS` changes the count, `--json` prints raw JSON).

| Metric | Meaning |
| --- | --- |
| `htmlBytes`, `htmlGzip` | Size of the HTML document, raw and gzip |
| `jsBytesOnLoad`, `jsGzipOnLoad` | Script files fetched before any interaction (inline scripts are part of the HTML) |
| `jsBytesAfterFirstClick`, `jsGzipAfterFirstClick` | Script files fetched once the first click has resumed the page |
| `requestsOnLoad` | Network requests during the first load |
| `domContentLoadedMs`, `loadMs` | Navigation timing |
| `firstClickToUpdateMs` | From the click to the first DOM change, including loading and resuming the client code |

Limits: the numbers depend on the machine, so compare runs on the same machine, Node and Chromium. The page is small on purpose and runs on localhost with no network delay. The benchmark makes no comparison with other frameworks, and none should be claimed from it.

One run on the development sandbox (Node 22, Chromium 159, 9 loads): HTML 30.7 KB (5.5 KB gzip), no script files on load, 199.5 KB (58.6 KB gzip) of script after the first click, DOMContentLoaded 40 ms, first click to update 20 ms. Treat these as an example of the output, not as a promise.
