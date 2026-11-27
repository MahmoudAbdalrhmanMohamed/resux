// Shared by scripts/test-browser.mjs and scripts/benchmark.mjs: scaffold an app from the packed framework,
// build it, start the production server and launch Chromium.
// Needs `playwright-core` (installed with --no-save in CI) and a Chrome or Chromium binary
// (CHROME_BIN, or google-chrome-stable / chromium on PATH).
import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const distCreate = path.join(repoRoot, "dist", "create.js");
const npmExecutable = "npm";
const env = {
  ...process.env,
  RESUX_HALAL_REPORT_SIGNING_SECRET: "resux-browser-test-secret-not-for-production-use",
};

/** Builds the app from `files` and returns { port, browser, close(keepFiles) }. Exits the process on setup problems. */
export async function startBrowserApp(files, readyRoute) {
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
  const close = async (keepFiles) => {
    await browser?.close();
    server?.kill("SIGTERM");
    await rm(tarballPath, { force: true });
    if (!keepFiles) await rm(tempRoot, { recursive: true, force: true });
  };
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
    for (const [relativePath, source] of Object.entries(files)) {
      const target = path.join(projectRoot, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, source, "utf8");
    }
    console.log(`[browser] fixtures: ${Object.keys(files).join(", ")}`);
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
    if (!(await waitForHttp(`http://127.0.0.1:${port}/${readyRoute}`, 60_000))) {
      throw new Error(`server did not start. Logs:\n${logs.join("")}`);
    }
    browser = await chromium.launch({ executablePath: chromePath, args: ["--no-sandbox"] });
    return { port, browser, close };
  } catch (error) {
    await close(true);
    throw error;
  }
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
