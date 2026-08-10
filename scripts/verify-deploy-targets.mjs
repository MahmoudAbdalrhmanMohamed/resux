import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(rootDir, "dist", "bin.js");
const fixtureSigningSecret = "resux-deploy-verification-secret-not-for-production-use";
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const frameworkPackage = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const sharpImportPattern = /(?:from\s*["']sharp["']|import\(\s*["']sharp["']\s*\)|require\(\s*["']sharp["']\s*\))/;
const nodeBuiltinImportPattern = /(?:from\s*["']node:|import\(\s*["']node:|require\(\s*["']node:)/;

const targetAssertions = new Map([
  ["node", assertNodeOutput],
  ["static", assertStaticOutput],
  ["netlify", assertNetlifyOutput],
  ["vercel", assertVercelOutput],
  ["cloudflare", assertCloudflareOutput],
]);

function fail(message) {
  throw new Error(`[verify:deploy-targets] ${message}`);
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: "inherit",
      env: options.env ?? process.env,
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          `${options.label} exited with code ${code ?? "unknown"}`
          + (signal ? ` and signal ${signal}` : ""),
        ));
      }
    });
  });
}

const sharpSmokeScript = String.raw`
const sharpModule = await import("sharp");
const sharp = sharpModule.default ?? sharpModule;
if (typeof sharp !== "function") {
  throw new Error("sharp did not expose a callable factory");
}
const source = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="black"/></svg>'
);
const output = await sharp(source).resize(2, 2).png().toBuffer();
if (!Buffer.isBuffer(output) || output.length < 8) {
  throw new Error("sharp resize produced no image bytes");
}
`;

async function runSharpSmoke(cwd, label) {
  await runProcess(process.execPath, ["--input-type=module", "-e", sharpSmokeScript], {
    cwd,
    label: `${label} sharp runtime smoke`,
  });
}

async function runIsolatedSharpSmoke(sourceRoot, label) {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), "resux-sharp-runtime-"));
  const snapshotRoot = path.join(sandboxRoot, "function");
  try {
    await cp(sourceRoot, snapshotRoot, {
      recursive: true,
      force: true,
    });
    await runSharpSmoke(snapshotRoot, `${label} isolated`);
  } finally {
    await rm(sandboxRoot, { recursive: true, force: true });
  }
}

async function collectJavaScriptFiles(root) {
  if (!(await exists(root))) {
    return [];
  }

  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }
      if (entry.isFile() && /\.(?:c|m)?js$/i.test(entry.name)) {
        files.push(absolute);
      }
    }
  }
  return files;
}

async function collectPackagedDependencyRoots(root, packageName) {
  if (!(await exists(root))) {
    return [];
  }

  const matches = [];
  const packageSegments = packageName.split("/");
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const absolute = path.join(current, entry.name);
      if (entry.name === "node_modules") {
        const packageRoot = path.join(absolute, ...packageSegments);
        if (await exists(packageRoot)) {
          matches.push(packageRoot);
        }
      }
      pending.push(absolute);
    }
  }
  return matches;
}

async function assertNoSharpImports(root, label) {
  const files = await collectJavaScriptFiles(root);
  if (!files.length) {
    fail(`${label} emitted no JavaScript files to inspect.`);
  }

  for (const file of files) {
    const source = await readFile(file, "utf8").catch(() => "");
    if (sharpImportPattern.test(source)) {
      fail(`${label} leaked a Node-only sharp import into ${path.relative(root, file)}.`);
    }
  }
}

async function assertNoSharpPackages(root, label) {
  const sharpRoots = await collectPackagedDependencyRoots(root, "sharp");
  if (sharpRoots.length) {
    fail(
      `${label} must not package the Node-only sharp runtime; found ${sharpRoots
        .map((entry) => path.relative(root, entry))
        .join(", ")}.`,
    );
  }
}

async function assertNoSharpRuntimeLeak(root, label) {
  await assertNoSharpImports(root, label);
  await assertNoSharpPackages(root, label);
}

async function assertNoNodeBuiltinImports(root, label) {
  const files = await collectJavaScriptFiles(root);
  for (const file of files) {
    const source = await readFile(file, "utf8").catch(() => "");
    if (nodeBuiltinImportPattern.test(source)) {
      fail(`${label} leaked a Node-only node: import into ${path.relative(root, file)}.`);
    }
  }
}

async function runBuild(appRoot, deployTarget) {
  console.log(`[verify:deploy-targets] building ${deployTarget}`);
  await runProcess(process.execPath, [cliPath, "build", "."], {
    cwd: appRoot,
    label: `${deployTarget} build`,
    env: {
      ...process.env,
      NITRO_PRESET: "",
      RESUX_HALAL_REPORT_SIGNING_SECRET: fixtureSigningSecret,
    },
  });
}

async function createFixtureApp(appRoot, deployTarget) {
  await mkdir(path.join(appRoot, "pages", "docs"), { recursive: true });

  await writeFile(
    path.join(appRoot, "package.json"),
    `${JSON.stringify({
      name: `resux-deploy-${deployTarget}`,
      private: true,
      type: "module",
      dependencies: {
        ...frameworkPackage.dependencies,
        resuxjs: `file:${rootDir.replaceAll("\\", "/")}`,
      },
    }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(appRoot, "pages", "index.vue"),
    "<template><main>Home</main></template>",
    "utf8",
  );
  await writeFile(
    path.join(appRoot, "pages", "docs", "[...slug].vue"),
    "<template><main>Docs</main></template>",
    "utf8",
  );
  await writeFile(
    path.join(appRoot, "resux.config.ts"),
    `export default defineResuxConfig({ deploy: { target: "${deployTarget}" } });\n`,
    "utf8",
  );
  await writeFile(
    path.join(appRoot, "nitro.config.ts"),
    `import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  compatibilityDate: "2026-05-02",
  cloudflare: {
    nodeCompat: true
  },
  ignore: ["plugins/**", "modules/**", "middleware/**"],
  scanDirs: [".resux-nitro"],
  publicAssets: [
    { dir: "public", baseURL: "/" },
    { dir: ".resux/client", baseURL: "/__resux" }
  ],
  serverAssets: [{ baseName: "resux", dir: ".resux/server" }],
  handlers: [{ route: "/**", handler: "./.resux-nitro/handler.ts" }],
  prerender: { crawlLinks: false, routes: [] }
});
`,
    "utf8",
  );
  await mkdir(path.join(appRoot, ".resux-nitro"), { recursive: true });

  await writeFile(
    path.join(appRoot, ".resux-nitro", "handler.ts"),
    `import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "resuxjs/node";

const resuxHandler = createResuxNodeHandler();

export default fromNodeMiddleware((req, res, next) => {
  resuxHandler(req, res);

  if (res.writableEnded) {
    return;
  }

  const done = () => {
    res.off("finish", done);
    res.off("close", done);
    next();
  };

  res.once("finish", done);
  res.once("close", done);
});
`,
    "utf8",
  );

  await runProcess(
    npmExecutable,
    ["install", "--no-audit", "--no-fund", "--package-lock=false"],
    { cwd: appRoot, label: `${deployTarget} fixture install` },
  );
}

async function assertNodeOutput(appRoot) {
  await assertPaths(appRoot, "node", [
    ".output/public/__resux/runtime-client.mjs",
    ".output/server/index.mjs",
  ]);

  await runSharpSmoke(path.join(appRoot, ".output", "server"), "node deployment");
}

async function assertStaticOutput(appRoot) {
  const outputRoot = path.join(appRoot, ".output");
  await assertPaths(appRoot, "static", [
    ".output/public/__resux/runtime-client.mjs",
  ]);

  await assertNoSharpRuntimeLeak(outputRoot, "static output");
  await assertNoNodeBuiltinImports(outputRoot, "static output");
}

async function assertNetlifyOutput(appRoot) {
  await assertPaths(appRoot, "netlify", [
    "dist/__resux/runtime-client.mjs",
    ".netlify/functions-internal",
  ]);

  const functionsRoot = path.join(appRoot, ".netlify", "functions-internal");
  const functions = await readdir(functionsRoot, { withFileTypes: true });
  const functionDirectories = functions.filter((entry) => entry.isDirectory());
  if (!functionDirectories.length) {
    fail("netlify target did not emit any internal function directories.");
  }

  const manifests = await Promise.all(functionDirectories.map(async (entry) => ({
    name: entry.name,
    root: path.join(functionsRoot, entry.name),
    present: await exists(path.join(
      functionsRoot,
      entry.name,
      ".resux",
      "server",
      "manifest.mjs",
    )),
  })));
  const resuxFunctions = manifests.filter((entry) => entry.present);
  if (!resuxFunctions.length) {
    fail(
      "netlify target functions are missing .resux/server/manifest.mjs; emitted directories: "
      + functionDirectories.map((entry) => entry.name).join(", "),
    );
  }

  for (const entry of resuxFunctions) {
    await runIsolatedSharpSmoke(entry.root, `netlify function ${entry.name}`);
  }
}

async function assertVercelOutput(appRoot) {
  const outputRoot = path.join(appRoot, ".vercel", "output");
  await assertPaths(appRoot, "vercel", [
    ".vercel/output/static/__resux/runtime-client.mjs",
    ".vercel/output/config.json",
    ".vercel/output/functions",
  ]);

  const outputConfig = JSON.parse(await readFile(path.join(outputRoot, "config.json"), "utf8"));
  if (outputConfig.version !== 3) {
    fail(`vercel config.json expected version=3, received ${String(outputConfig.version)}`);
  }
  if (!Array.isArray(outputConfig.routes)) {
    fail("vercel config.json routes are missing.");
  }
  for (const route of outputConfig.routes) {
    if (
      route
      && typeof route.src === "string"
      && route.headers
      && route.continue !== true
      && route.dest === undefined
      && route.handle === undefined
      && route.status === undefined
      && route.check === undefined
      && route.middlewarePath === undefined
    ) {
      fail(`vercel config.json route ${route.src} is header-only and must set continue=true.`);
    }
  }
  if (!outputConfig.routes.some((route) => route?.handle === "filesystem")) {
    fail("vercel config.json is missing { handle: \"filesystem\" }.");
  }
  if (!outputConfig.routes.some((route) => route?.src === "/(.*)" || route?.src === "/(?:.*)")) {
    fail("vercel config.json is missing a catch-all route.");
  }

  const functionsRoot = path.join(outputRoot, "functions");
  const functions = await readdir(functionsRoot, { withFileTypes: true });
  const emittedFunctions = functions.filter((entry) => entry.isDirectory() && entry.name.endsWith(".func"));
  if (!emittedFunctions.length) {
    fail("vercel target emitted no function directories.");
  }

  for (const fn of emittedFunctions) {
    const functionRoot = path.join(functionsRoot, fn.name);
    await assertPaths(functionRoot, `vercel function ${fn.name}`, [
      ".vc-config.json",
      ".resux/server/manifest.mjs",
    ]);
    await runIsolatedSharpSmoke(functionRoot, `vercel function ${fn.name}`);
  }
}

async function assertCloudflareOutput(appRoot) {
  const runtimeCandidates = [
    path.join(appRoot, ".output", "public", "__resux", "runtime-client.mjs"),
    path.join(appRoot, "dist", "__resux", "runtime-client.mjs"),
  ];
  let resolvedRuntimeClient = null;
  for (const candidate of runtimeCandidates) {
    if (await exists(candidate)) {
      resolvedRuntimeClient = candidate;
      break;
    }
  }
  if (!resolvedRuntimeClient) {
    fail("cloudflare target is missing the __resux/runtime-client.mjs asset.");
  }

  const publicRoot = path.dirname(path.dirname(resolvedRuntimeClient));
  const outputRoots = [
    publicRoot,
    path.join(appRoot, ".output", "server"),
    path.join(appRoot, "dist"),
  ];
  const existingRoots = [];
  for (const root of new Set(outputRoots)) {
    if (await exists(root)) {
      existingRoots.push(root);
    }
  }
  if (!existingRoots.length) {
    fail("cloudflare target emitted no worker/server JavaScript output.");
  }

  for (const root of existingRoots) {
    await assertNoSharpRuntimeLeak(root, "cloudflare output");
  }
}

async function assertPaths(root, targetName, relativePaths) {
  for (const relativePath of relativePaths) {
    if (!(await exists(path.join(root, relativePath)))) {
      fail(`${targetName} target is missing ${relativePath}`);
    }
  }
}

async function verifyTarget(deployTarget, assertOutput) {
  const appRoot = await mkdtemp(path.join(os.tmpdir(), `resux-deploy-target-${deployTarget}-`));
  try {
    await createFixtureApp(appRoot, deployTarget);
    await runBuild(appRoot, deployTarget);
    await assertOutput(appRoot);
    console.log(`[verify:deploy-targets] ${deployTarget} PASS`);
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
}

function selectedTargets() {
  const requested = (process.env.RESUX_DEPLOY_TARGET_FILTER ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!requested.length) {
    return [...targetAssertions.entries()];
  }

  const unknown = requested.filter((target) => !targetAssertions.has(target));
  if (unknown.length) {
    fail(`unknown deployment target(s): ${unknown.join(", ")}`);
  }

  return requested.map((target) => [target, targetAssertions.get(target)]);
}

async function main() {
  if (!(await exists(cliPath))) {
    fail("dist/bin.js not found. Run `npm run build` first.");
  }

  for (const [deployTarget, assertOutput] of selectedTargets()) {
    await verifyTarget(deployTarget, assertOutput);
  }
  console.log("[verify:deploy-targets] PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
