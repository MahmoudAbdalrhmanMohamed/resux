import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(rootDir, "dist", "cli.js");

function fail(message) {
  throw new Error(`[verify:vercel-output] ${message}`);
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
          NITRO_PRESET: "vercel"
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

function parseCatchAllDestination(routes) {
  const catchAll = routes.find((route) =>
    typeof route?.src === "string"
    && typeof route?.dest === "string"
    && (route.src === "/(.*)" || route.src === "/(?:.*)")
  );

  if (!catchAll) {
    return null;
  }

  const rawDest = catchAll.dest.split("?")[0] ?? "";
  if (!rawDest.startsWith("/")) {
    return rawDest;
  }
  return rawDest.slice(1);
}

async function ensureFunctionContracts(outputRoot, functionNames) {
  for (const functionName of functionNames) {
    const functionDir = path.join(outputRoot, "functions", functionName);
    const vcConfigPath = path.join(functionDir, ".vc-config.json");
    const serverManifestPath = path.join(functionDir, ".resux", "server", "manifest.mjs");

    if (!(await exists(vcConfigPath))) {
      fail(`Missing function config: ${path.relative(outputRoot, vcConfigPath)}`);
    }
    if (!(await exists(serverManifestPath))) {
      fail(`Missing server runtime payload: ${path.relative(outputRoot, serverManifestPath)}`);
    }

    const parsedConfig = JSON.parse(await readFile(vcConfigPath, "utf8"));
    if (typeof parsedConfig.runtime !== "string" || !parsedConfig.runtime.startsWith("nodejs")) {
      fail(`Unexpected runtime in ${functionName}/.vc-config.json: ${String(parsedConfig.runtime)}`);
    }
    if (parsedConfig.handler !== "index.mjs") {
      fail(`Unexpected handler in ${functionName}/.vc-config.json: ${String(parsedConfig.handler)}`);
    }
  }
}

async function main() {
  if (!(await exists(cliPath))) {
    fail("dist/cli.js not found. Run `npm run build` first.");
  }

  const appRoot = path.join(os.tmpdir(), `resux-vercel-output-${Date.now()}`);
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
    path.join(appRoot, "vercel.json"),
    JSON.stringify(
      {
        $schema: "https://openapi.vercel.sh/vercel.json",
        framework: "nitro",
        buildCommand: "npm run build"
      },
      null,
      2
    ),
    "utf8",
  );

  await symlink(path.join(rootDir, "node_modules"), path.join(appRoot, "node_modules"), "junction");

  await runBuild(appRoot);

  const outputRoot = path.join(appRoot, ".vercel", "output");
  const runtimeClientPath = path.join(outputRoot, "static", "__resux", "runtime-client.mjs");
  const outputConfigPath = path.join(outputRoot, "config.json");
  const functionsRoot = path.join(outputRoot, "functions");

  if (!(await exists(runtimeClientPath))) {
    fail("Missing runtime client asset at .vercel/output/static/__resux/runtime-client.mjs");
  }
  if (!(await exists(outputConfigPath))) {
    fail("Missing Build Output API file at .vercel/output/config.json");
  }
  if (!(await exists(functionsRoot))) {
    fail("Missing functions directory at .vercel/output/functions");
  }

  const outputConfig = JSON.parse(await readFile(outputConfigPath, "utf8"));
  if (outputConfig.version !== 3) {
    fail(`Expected config.json version=3, received ${String(outputConfig.version)}.`);
  }
  if (!Array.isArray(outputConfig.routes) || outputConfig.routes.length === 0) {
    fail("config.json routes are missing or empty.");
  }
  if (!outputConfig.routes.some((route) => route?.handle === "filesystem")) {
    fail("config.json is missing { handle: \"filesystem\" } route.");
  }

  const functionNames = await readdir(functionsRoot, { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory() && entry.name.endsWith(".func")).map((entry) => entry.name));
  if (functionNames.length === 0) {
    fail("No server functions emitted under .vercel/output/functions.");
  }

  const catchAllDest = parseCatchAllDestination(outputConfig.routes);
  if (!catchAllDest) {
    fail("No catch-all destination route found in config.json.");
  }
  const expectedFunctionDir = path.join(functionsRoot, `${catchAllDest}.func`);
  if (!(await exists(expectedFunctionDir))) {
    fail(`Catch-all route destination "/${catchAllDest}" has no matching function directory.`);
  }

  await ensureFunctionContracts(outputRoot, functionNames);
  console.log("[verify:vercel-output] PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
