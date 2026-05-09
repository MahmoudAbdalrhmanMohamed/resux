import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(rootDir, "dist", "cli.js");

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

async function runBuild(appRoot) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [cliPath, "build", "."],
      {
        cwd: appRoot,
        stdio: "inherit",
        env: {
          ...process.env,
          NITRO_PRESET: ""
        }
      }
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build exited with code ${code ?? "unknown"}.`));
      }
    });
  });
}

async function createFixtureApp(appRoot, deployTarget) {
  await mkdir(path.join(appRoot, "pages", "docs"), { recursive: true });

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
  await symlink(path.join(rootDir, "node_modules"), path.join(appRoot, "node_modules"), "junction");
}

async function assertNodeOutput(appRoot) {
  const runtimeClientPath = path.join(appRoot, ".output", "public", "__resux", "runtime-client.mjs");
  const serverEntryPath = path.join(appRoot, ".output", "server", "index.mjs");
  if (!(await exists(runtimeClientPath))) {
    fail("node target is missing .output/public/__resux/runtime-client.mjs");
  }
  if (!(await exists(serverEntryPath))) {
    fail("node target is missing .output/server/index.mjs");
  }
}

async function assertStaticOutput(appRoot) {
  const runtimeClientPath = path.join(appRoot, ".output", "public", "__resux", "runtime-client.mjs");
  if (!(await exists(runtimeClientPath))) {
    fail("static target is missing .output/public/__resux/runtime-client.mjs");
  }
}

async function assertNetlifyOutput(appRoot) {
  const runtimeClientPath = path.join(appRoot, "dist", "__resux", "runtime-client.mjs");
  if (!(await exists(runtimeClientPath))) {
    fail("netlify target is missing dist/__resux/runtime-client.mjs");
  }

  const functionsRoot = path.join(appRoot, ".netlify", "functions-internal");
  if (!(await exists(functionsRoot))) {
    fail("netlify target is missing .netlify/functions-internal");
  }

  const functions = await readdir(functionsRoot, { withFileTypes: true });
  const serverFunction = functions.find((entry) => entry.isDirectory());
  if (!serverFunction) {
    fail("netlify target did not emit any internal function directories.");
  }

  const serverManifestPath = path.join(
    functionsRoot,
    serverFunction.name,
    ".resux",
    "server",
    "manifest.mjs",
  );
  if (!(await exists(serverManifestPath))) {
    fail("netlify target function is missing .resux/server/manifest.mjs");
  }
}

async function assertVercelOutput(appRoot) {
  const outputRoot = path.join(appRoot, ".vercel", "output");
  const runtimeClientPath = path.join(outputRoot, "static", "__resux", "runtime-client.mjs");
  const outputConfigPath = path.join(outputRoot, "config.json");
  const functionsRoot = path.join(outputRoot, "functions");

  if (!(await exists(runtimeClientPath))) {
    fail("vercel target is missing .vercel/output/static/__resux/runtime-client.mjs");
  }
  if (!(await exists(outputConfigPath))) {
    fail("vercel target is missing .vercel/output/config.json");
  }
  if (!(await exists(functionsRoot))) {
    fail("vercel target is missing .vercel/output/functions");
  }

  const outputConfig = JSON.parse(await readFile(outputConfigPath, "utf8"));
  if (outputConfig.version !== 3) {
    fail(`vercel config.json expected version=3, received ${String(outputConfig.version)}`);
  }
  if (!Array.isArray(outputConfig.routes)) {
    fail("vercel config.json routes are missing.");
  }
  if (!outputConfig.routes.some((route) => route?.handle === "filesystem")) {
    fail("vercel config.json is missing { handle: \"filesystem\" }.");
  }
  if (!outputConfig.routes.some((route) => route?.src === "/(.*)" || route?.src === "/(?:.*)")) {
    fail("vercel config.json is missing a catch-all route.");
  }

  const functions = await readdir(functionsRoot, { withFileTypes: true });
  const emittedFunctions = functions.filter((entry) => entry.isDirectory() && entry.name.endsWith(".func"));
  if (!emittedFunctions.length) {
    fail("vercel target emitted no function directories.");
  }

  for (const fn of emittedFunctions) {
    const functionRoot = path.join(functionsRoot, fn.name);
    if (!(await exists(path.join(functionRoot, ".vc-config.json")))) {
      fail(`vercel function ${fn.name} is missing .vc-config.json`);
    }
    if (!(await exists(path.join(functionRoot, ".resux", "server", "manifest.mjs")))) {
      fail(`vercel function ${fn.name} is missing .resux/server/manifest.mjs`);
    }
  }
}

async function verifyTarget(deployTarget, assertOutput) {
  const appRoot = path.join(os.tmpdir(), `resux-deploy-target-${deployTarget}-${Date.now()}`);
  await createFixtureApp(appRoot, deployTarget);
  await runBuild(appRoot);
  await assertOutput(appRoot);
}

async function main() {
  if (!(await exists(cliPath))) {
    fail("dist/cli.js not found. Run `npm run build` first.");
  }

  await verifyTarget("node", assertNodeOutput);
  await verifyTarget("static", assertStaticOutput);
  await verifyTarget("netlify", assertNetlifyOutput);
  await verifyTarget("vercel", assertVercelOutput);
  console.log("[verify:deploy-targets] PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
