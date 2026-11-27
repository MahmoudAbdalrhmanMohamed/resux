// Browser resumability tests: build a real app from the packed framework and drive it in Chromium.
// Needs `playwright-core` (installed with --no-save in CI) and a Chrome or Chromium binary
// (CHROME_BIN, or google-chrome-stable / chromium on PATH).
import { fixtureFiles } from "./browser-fixtures.mjs";
import { startBrowserApp } from "./browser-harness.mjs";

let app;
let failed = false;

try {
  app = await startBrowserApp(fixtureFiles, "bt-vif");
  for (const scenario of scenarios()) {
    const page = await app.browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      const url = message.location().url ?? "";
      if (message.type() === "error" && !url.includes("favicon")) errors.push(`${message.text()} (${url})`);
    });
    try {
      await page.goto(`http://127.0.0.1:${app.port}/${scenario.route}`);
      await page.waitForSelector(scenario.ready, { timeout: 15_000 });
      const t = ctx(page);
      for (const step of scenario.steps) {
        const [kind, selector, expected, label] = typeof step === "string" ? step.split("|") : step;
        if (kind === "click") await page.click(selector);
        else if (kind === "text") await t.expectText(selector, expected, label);
        else await t.expectCount(selector, expected, label);
      }
      if (errors.length) throw new Error(`browser errors: ${errors.join(" | ")}`);
      console.log(`[browser:${scenario.route}] ok`);
    } catch (error) {
      failed = true;
      console.error(`[browser:${scenario.route}] failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await page.close();
    }
  }
} catch (error) {
  failed = true;
  console.error(`[browser] failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
} finally {
  await app?.close(failed);
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("\nAll browser resumability checks passed.");
}

function ctx(page) {
  const settle = () => page.waitForTimeout(400);
  const text = async (selector) => (await page.textContent(selector))?.replace(/\s+/g, " ").trim() ?? "";
  const expectText = async (selector, expected, label) => {
    const deadline = Date.now() + 5000;
    let actual = "";
    while (Date.now() < deadline) {
      actual = await text(selector).catch(() => "");
      if (actual === expected) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`${label}: expected "${expected}" at ${selector}, got "${actual}"`);
  };
  const expectCount = async (selector, expected, label) => {
    await page.waitForTimeout(300);
    const actual = await page.locator(selector).count();
    if (actual !== expected) throw new Error(`${label}: expected ${expected} of ${selector}, got ${actual}`);
  };
  return { settle, text, expectText, expectCount };
}

function scenarios() {
  return [
    {
      route: "bt-vif",
      ready: "#ssr .cb",
      steps: [
        ["text", "#ssr .cb", "0", "server card starts at 0"],
        ["click", "#ssr .cb"],
        ["text", "#ssr .cb", "1", "server card resumes on click"],
        ["click", "#t"],
        ["count", "#cond .cb", 1, "card appears inside v-if"],
        ["click", "#cond .cb"],
        ["text", "#cond .cb", "1", "browser-created card handles events"],
        ["click", "#ssr .cb"],
        ["text", "#ssr .cb", "2", "server card keeps its state"],
        ["click", "#r"],
        ["text", "#ssr .s", "one!", "slot content follows parent state"],
        ["count", "#cond .cb", 1, "card survives a parent re-render"],
      ],
    },
    {
      route: "bt-dynamic",
      ready: "#dyn .badge",
      steps: [
        ["click", "#s"],
        ["count", "#dyn .card", 1, "component :is swaps to the card"],
        ["click", "#s"],
        ["count", "#dyn .badge", 1, "component :is swaps back to the badge"],
        ["click", "#dyn .bb"],
        ["text", "#dyn .bb", "1", "swapped component handles events"],
      ],
    },
    {
      route: "bt-emit",
      ready: "#ssr .em",
      steps: [
        ["text", "#total", "total=0", "start"],
        ["click", "#ssr .em"],
        ["text", "#total", "total=10", "server child emit reaches the parent"],
        ["click", "#ssr .em"],
        ["text", "#total", "total=20", "second emit"],
        ["click", "#t"],
        ["count", "#cond .em", 1, "child appears inside v-if"],
        ["click", "#cond .em"],
        ["text", "#total", "total=30", "browser-created child emit reaches the parent"],
      ],
    },
    {
      route: "bt-slots",
      ready: "#x .ls",
      steps: [
        ["text", "#x .hd", "H:L:0", "scoped header slot renders on the server"],
        ["text", "#x li:first-child", "a-0-L", "default scoped slot renders per item"],
        ["click", "#x .bump"],
        ["text", "#x li:first-child", "a-1-L", "per-item slot updates"],
        ["text", "#x .hd", "H:L:1", "scoped header slot outside a block follows the child"],
        ["click", "#x .pin"],
        ["click", "#x .bump"],
        ["text", "#x li:first-child", "a-2-L!", "per-item slot reads fresh parent state"],
        ["text", "#x .hd", "H:L!:2", "scoped header slot reads fresh parent state"],
        ["text", "#x .ft", "Default footer", "fallback content renders for a missing slot"],
      ],
    },
    {
      route: "bt-props",
      ready: "#t",
      steps: [
        "click|#t",
        "text|#x .pn|1-solo|browser-created child gets its first props",
        "click|#x .pb",
        "click|#x .pb",
        "text|#x .pb|2|child counter state",
        "click|#i",
        "text|#x .pn|2-solo|prop change reaches the child",
        "text|#x .pb|2|child state survives a prop change",
        "text|#l .pn >> nth=1|2-b|v-for children get the new prop",
        "click|#l .pb >> nth=1",
        "click|#i",
        "text|#l .pn >> nth=1|3-b|second prop change",
        "text|#l .pb >> nth=1|1|v-for child state survives a prop change",
        "text|#x .pb|2|other child state also survives",
      ],
    },
    {
      route: "bt-flip",
      ready: "#x .pn",
      steps: [
        ["text", "#x .pb", "hello", "slot inside v-if renders on the server"],
        ["click", "#x .pf"],
        ["count", "#x .pb", 0, "v-if hides the slot"],
        ["click", "#x .pf"],
        ["text", "#x .pb", "hello", "slot content comes back after a re-render"],
      ],
    },
    {
      route: "bt-native",
      ready: "#x .plain",
      steps: [
        ["text", "#x .c", "0", "start"],
        ["click", "#x .plain >> nth=0"],
        ["text", "#x .c", "1", "native click on a component tag"],
        ["click", "#x .plain >> nth=2"],
        ["text", "#x .c", "21", "native click on a v-for child uses its local"],
        ["click", "#x .t"],
        ["count", "#x .plain", 4, "block child appears"],
        ["click", "#x .plain >> nth=1"],
        ["text", "#x .c", "22", "native click on a browser-created child"],
        ["click", "#x .plain >> nth=2"],
        ["text", "#x .c", "32", "v-for child still works after the block"],
      ],
    },
  ];
}

