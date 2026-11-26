// Browser resumability tests: build a real app from the packed framework and drive it in Chromium.
// Needs `playwright-core` (installed with --no-save in CI) and a Chrome or Chromium binary
// (CHROME_BIN, or google-chrome-stable / chromium on PATH).
import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fixtureFiles } from "./browser-fixtures.mjs";

const repoRoot = process.cwd();
const distCreate = path.join(repoRoot, "dist", "create.js");
const npmExecutable = "npm";
const env = {
  ...process.env,
  RESUX_HALAL_REPORT_SIGNING_SECRET: "resux-browser-test-secret-not-for-production-use",
};

if (!existsSync(distCreate)) {
  console.error("Missing dist/create.js. Run `npm run build` before browser tests.");
  process.exit(1);
}

const { chromium } = await import(process.env.RESUX_PLAYWRIGHT_CORE ?? "playwright-core");
const chromePath = findChrome();
if (!chromePath) {
  console.error("No Chrome or Chromium found. Set CHROME_BIN.");
  process.exit(1);
}

const pack = run(npmExecutable, ["pack"], { cwd: repoRoot, stdio: "pipe" });
if (pack.status !== 0) {
  process.stderr.write(`${pack.stderr ?? ""}${pack.stdout ?? ""}`);
  process.exit(pack.status ?? 1);
}
const tarballName = (pack.stdout ?? "").split(/\r?\n/).map((line) => line.trim()).findLast(Boolean);
const tarballPath = path.resolve(repoRoot, tarballName);
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "resux-browser-"));
const projectRoot = path.join(tempRoot, "browser-app");
let server;
let browser;
let failed = false;

try {
  const create = run(process.execPath, [distCreate, "browser-app", "--template", "minimal", "--yes", "--no-install"], {
    cwd: tempRoot,
    stdio: "pipe",
  });
  if (create.status !== 0) {
    throw new Error(`scaffold failed:\n${create.stderr ?? ""}${create.stdout ?? ""}`);
  }
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.dependencies = { ...packageJson.dependencies, resuxjs: `file:${tarballPath.replaceAll("\\", "/")}` };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  for (const [relativePath, source] of Object.entries(fixtureFiles)) {
    const target = path.join(projectRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source, "utf8");
  }
  console.log(`[browser] fixtures: ${Object.keys(fixtureFiles).join(", ")}`);
  runOrFail("npm install", npmExecutable, ["install", "--no-audit", "--no-fund", "--package-lock=false", "--legacy-peer-deps"], projectRoot);
  runOrFail("npm run build", npmExecutable, ["run", "build"], projectRoot);

  const port = await getAvailablePort();
  server = spawn(process.execPath, [path.join(projectRoot, ".output", "server", "index.mjs")], {
    cwd: projectRoot,
    env: { ...env, PORT: String(port), HOST: "127.0.0.1", NITRO_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  server.stdout.on("data", (chunk) => logs.push(String(chunk)));
  server.stderr.on("data", (chunk) => logs.push(String(chunk)));
  if (!(await waitForHttp(`http://127.0.0.1:${port}/bt-vif`, 60_000))) {
    throw new Error(`server did not start. Logs:\n${logs.join("")}`);
  }

  browser = await chromium.launch({ executablePath: chromePath, args: ["--no-sandbox"] });
  for (const scenario of scenarios()) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      const url = message.location().url ?? "";
      if (message.type() === "error" && !url.includes("favicon")) errors.push(`${message.text()} (${url})`);
    });
    try {
      await page.goto(`http://127.0.0.1:${port}/${scenario.route}`);
      await page.waitForSelector(scenario.ready, { timeout: 15_000 });
      await scenario.run(page, ctx(page));
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
  await browser?.close();
  server?.kill("SIGTERM");
  await rm(tarballPath, { force: true });
  if (!failed) await rm(tempRoot, { recursive: true, force: true });
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
      async run(page, t) {
        await t.expectText("#ssr .cb", "0", "server card starts at 0");
        await page.click("#ssr .cb");
        await t.expectText("#ssr .cb", "1", "server card resumes on click");
        await page.click("#t");
        await t.expectCount("#cond .cb", 1, "card appears inside v-if");
        await page.click("#cond .cb");
        await t.expectText("#cond .cb", "1", "browser-created card handles events");
        await page.click("#ssr .cb");
        await t.expectText("#ssr .cb", "2", "server card keeps its state");
        await page.click("#r");
        await t.expectText("#ssr .s", "one!", "slot content follows parent state");
        await t.expectCount("#cond .cb", 1, "card survives a parent re-render");
      },
    },
    {
      route: "bt-dynamic",
      ready: "#dyn .badge",
      async run(page, t) {
        await page.click("#s");
        await t.expectCount("#dyn .card", 1, "component :is swaps to the card");
        await page.click("#s");
        await t.expectCount("#dyn .badge", 1, "component :is swaps back to the badge");
        await page.click("#dyn .bb");
        await t.expectText("#dyn .bb", "1", "swapped component handles events");
      },
    },
    {
      route: "bt-emit",
      ready: "#ssr .em",
      async run(page, t) {
        await t.expectText("#total", "total=0", "start");
        await page.click("#ssr .em");
        await t.expectText("#total", "total=10", "server child emit reaches the parent");
        await page.click("#ssr .em");
        await t.expectText("#total", "total=20", "second emit");
        await page.click("#t");
        await t.expectCount("#cond .em", 1, "child appears inside v-if");
        await page.click("#cond .em");
        await t.expectText("#total", "total=30", "browser-created child emit reaches the parent");
      },
    },
    {
      route: "bt-slots",
      ready: "#x .ls",
      async run(page, t) {
        await t.expectText("#x .hd", "H:L:0", "scoped header slot renders on the server");
        await t.expectText("#x li:first-child", "a-0-L", "default scoped slot renders per item");
        await page.click("#x .bump");
        await t.expectText("#x li:first-child", "a-1-L", "per-item slot updates");
        await page.click("#x .pin");
        await page.click("#x .bump");
        await t.expectText("#x li:first-child", "a-2-L!", "per-item slot reads fresh parent state");
        await t.expectText("#x .ft", "Default footer", "fallback content renders for a missing slot");
      },
    },
    {
      route: "bt-flip",
      ready: "#x .pn",
      async run(page, t) {
        await t.expectText("#x .pb", "hello", "slot inside v-if renders on the server");
        await page.click("#x .pf");
        await t.expectCount("#x .pb", 0, "v-if hides the slot");
        await page.click("#x .pf");
        await t.expectText("#x .pb", "hello", "slot content comes back after a re-render");
      },
    },
    {
      route: "bt-native",
      ready: "#x .plain",
      async run(page, t) {
        await t.expectText("#x .c", "0", "start");
        await page.click("#x .plain >> nth=0");
        await t.expectText("#x .c", "1", "native click on a component tag");
        await page.click("#x .plain >> nth=2");
        await t.expectText("#x .c", "21", "native click on a v-for child uses its local");
        await page.click("#x .t");
        await t.expectCount("#x .plain", 4, "block child appears");
        await page.click("#x .plain >> nth=1");
        await t.expectText("#x .c", "22", "native click on a browser-created child");
        await page.click("#x .plain >> nth=2");
        await t.expectText("#x .c", "32", "v-for child still works after the block");
      },
    },
  ];
}

function findChrome() {
  const candidates = [process.env.CHROME_BIN, "google-chrome-stable", "google-chrome", "chromium", "chromium-browser"].filter(Boolean);
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  return undefined;
}

function run(command, args, options) {
  const needsShell = process.platform === "win32" && !command.toLowerCase().endsWith(".exe");
  return spawnSync(command, args, {
    cwd: options.cwd,
    env,
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
    shell: needsShell,
  });
}

function runOrFail(label, command, args, cwd) {
  const result = run(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status ?? "unknown"}.`);
  }
}

async function getAvailablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => probe.close(resolve));
  if (!port) throw new Error("Unable to allocate a local port.");
  return port;
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status >= 200 && response.status < 500) return true;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}
