import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const distCreate = path.join(repoRoot, "dist", "create.js");
const templates = [
  "minimal",
  "default",
  "full",
  "i18n",
  "pwa",
  "media",
  "package-compatibility",
  "dashboard",
];
const npmExecutable = "npm";
const nodeExecutable = process.execPath;
const portBase = 4200;

if (!existsSync(distCreate)) {
  console.error("Missing dist/create.js. Run `npm run build` before template tests.");
  process.exit(1);
}

const filter = (process.env.RESUX_TEMPLATE_FILTER ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const selectedTemplates = filter.length ? templates.filter((name) => filter.includes(name)) : templates;

if (selectedTemplates.length === 0) {
  console.error("No templates selected for testing.");
  process.exit(1);
}

const packResult = runCommand(npmExecutable, ["pack"], {
  cwd: repoRoot,
  stdio: "pipe",
});
if (packResult.status !== 0) {
  process.stderr.write(packResult.stderr ?? "");
  process.stderr.write(packResult.stdout ?? "");
  process.exit(packResult.status ?? 1);
}
const tarballName = extractLastNonEmptyLine(packResult.stdout ?? "");
if (!tarballName) {
  console.error("Failed to determine tarball name from npm pack output.");
  process.exit(1);
}
const tarballPath = path.resolve(repoRoot, tarballName);

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "resux-templates-"));
console.log(`Template test workspace: ${tempRoot}`);

let failed = false;
for (let index = 0; index < selectedTemplates.length; index++) {
  const template = selectedTemplates[index];
  const projectName = `starter-${template}`;
  const projectRoot = path.join(tempRoot, projectName);
  const port = portBase + index;
  console.log(`\n[template:${template}] scaffold`);

  const createResult = runCommand(nodeExecutable, [
    distCreate,
    projectName,
    "--template",
    template,
    "--yes",
    "--no-install",
  ], {
    cwd: tempRoot,
    stdio: "pipe",
  });
  if (createResult.status !== 0) {
    failed = true;
    process.stderr.write(createResult.stderr ?? "");
    process.stderr.write(createResult.stdout ?? "");
    continue;
  }

  try {
    await rewriteFrameworkDependency(projectRoot, tarballPath);
    runOrFail(`[template:${template}] npm install`, npmExecutable, ["install", "--no-audit", "--no-fund"], projectRoot);
    await runTypecheckIfAvailable(projectRoot, template);
    runOrFail(`[template:${template}] npm run build`, npmExecutable, ["run", "build"], projectRoot);
    await runPreviewSmoke(projectRoot, template, port);
    await assertGeneratedArtifacts(projectRoot, template);
    console.log(`[template:${template}] ok`);
  } catch (error) {
    failed = true;
    console.error(`[template:${template}] failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await rm(path.join(projectRoot, "node_modules"), { recursive: true, force: true });
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("\nAll template checks passed.");
}

function runCommand(command, args, options) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function runOrFail(label, command, args, cwd) {
  const result = runCommand(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status ?? "unknown"}.`);
  }
}

async function rewriteFrameworkDependency(projectRoot, tarballPath) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.dependencies = packageJson.dependencies ?? {};
  packageJson.dependencies.resuxjs = `file:${tarballPath.replaceAll("\\", "/")}`;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function runTypecheckIfAvailable(projectRoot, template) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  if (!packageJson?.scripts?.typecheck) {
    return;
  }
  runOrFail(`[template:${template}] npm run typecheck`, npmExecutable, ["run", "typecheck"], projectRoot);
}

async function runPreviewSmoke(projectRoot, template, port) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const previewScript = packageJson?.scripts?.preview ? "preview" : packageJson?.scripts?.start ? "start" : null;
  if (!previewScript) {
    throw new Error("Missing preview/start script.");
  }

  const child = spawn(npmExecutable, ["run", previewScript, "--", "--port", String(port)], {
    cwd: projectRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  const logs = [];
  const appendLog = (chunk) => {
    const text = chunk?.toString?.() ?? "";
    if (text) {
      logs.push(text);
      if (logs.length > 100) {
        logs.shift();
      }
    }
  };

  child.stdout.on("data", appendLog);
  child.stderr.on("data", appendLog);

  try {
    const ready = await waitForHttpReady(`http://127.0.0.1:${port}/`, 120_000);
    if (!ready) {
      throw new Error(`Preview server did not become ready. Logs:\n${logs.join("")}`);
    }
  } finally {
    await stopProcessTree(child.pid);
  }
}

async function waitForHttpReady(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch {
      // Keep polling.
    }
    await sleep(1000);
  }
  return false;
}

async function assertGeneratedArtifacts(projectRoot, template) {
  const requiredFiles = [
    path.join(projectRoot, ".resux", "app.mjs"),
    path.join(projectRoot, ".resux", "routes.mjs"),
    path.join(projectRoot, ".resux", "plugins.mjs"),
    path.join(projectRoot, ".resux", "middleware.mjs"),
    path.join(projectRoot, ".resux", "components.mjs"),
    path.join(projectRoot, ".resux", "imports.mjs"),
    path.join(projectRoot, ".resux", "resux.d.ts"),
    path.join(projectRoot, ".resux", "imports.d.ts"),
    path.join(projectRoot, ".resux", "components.d.ts"),
    path.join(projectRoot, ".resux", "server-routes.d.ts"),
    path.join(projectRoot, ".resux", "client", "runtime-client.mjs"),
    path.join(projectRoot, ".output"),
  ];

  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      throw new Error(`Missing generated artifact: ${path.relative(projectRoot, filePath)}`);
    }
  }

  const runtimeSource = await readFile(path.join(projectRoot, ".resux", "client", "runtime-client.mjs"), "utf8");
  if (/hydrate/i.test(runtimeSource)) {
    throw new Error("Hydration-like runtime marker found in runtime-client.mjs.");
  }

  if (template === "package-compatibility" || template === "full") {
    const pagePath = path.join(projectRoot, "pages", "package-tests", "index.vue");
    if (!existsSync(pagePath)) {
      throw new Error("Missing package compatibility page scaffold.");
    }
  }

  const requiredStarterFiles = [
    "package.json",
    "resux.config.ts",
    "tsconfig.json",
    ".gitignore",
    ".npmrc",
    ".env.example",
    "app.vue",
    "env.d.ts",
    "pages/index.vue",
    "layouts/default.vue",
    "assets/css/main.css",
    "public/favicon.svg",
    "types/app.d.ts",
  ];

  for (const relativePath of requiredStarterFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Missing required starter file: ${relativePath}`);
    }
  }
}

async function stopProcessTree(pid) {
  if (!pid) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Ignore shutdown failures.
  }
}

function extractLastNonEmptyLine(value) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
