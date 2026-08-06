import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const budgetPath = path.join(rootDir, "runtime-size-budget.json");

async function fileBytes(filePath) {
  return (await stat(filePath)).size;
}

async function directoryBytes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let total = 0;
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await directoryBytes(entryPath);
      total += nested.total;
      files.push(...nested.files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const bytes = await fileBytes(entryPath);
    total += bytes;
    files.push({
      path: path.relative(rootDir, entryPath).replaceAll(path.sep, "/"),
      bytes
    });
  }

  return {
    total,
    files: files.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path))
  };
}

function countLines(value) {
  if (value.length === 0) {
    return 0;
  }
  return value.split(/\r?\n/).length;
}

export async function collectRuntimeMetrics() {
  const sourceRuntimePath = path.join(rootDir, "src/runtime/index.ts");
  const distRuntimePath = path.join(rootDir, "dist/runtime/index.js");
  const distRuntimeDeclarationPath = path.join(rootDir, "dist/runtime/index.d.ts");
  const distRuntimeDirectory = path.join(rootDir, "dist/runtime");

  let runtimeModule;
  try {
    runtimeModule = await import(`${pathToFileURL(distRuntimePath).href}?metrics=${Date.now()}`);
  } catch (error) {
    throw new Error(
      `Runtime metrics need built output at dist/runtime/index.js. Run \"npm run build\" first. ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (typeof runtimeModule.getClientRuntimeSource !== "function") {
    throw new Error("dist/runtime/index.js does not export getClientRuntimeSource().");
  }

  const [sourceRuntime, distRuntimeJavaScript, distRuntimeDeclaration, distRuntimeDirectoryStats] = await Promise.all([
    readFile(sourceRuntimePath, "utf8"),
    readFile(distRuntimePath, "utf8"),
    readFile(distRuntimeDeclarationPath, "utf8"),
    directoryBytes(distRuntimeDirectory)
  ]);
  const clientRuntime = runtimeModule.getClientRuntimeSource();

  return {
    sourceRuntimeBytes: Buffer.byteLength(sourceRuntime),
    sourceRuntimeLines: countLines(sourceRuntime),
    distRuntimeJavaScriptBytes: Buffer.byteLength(distRuntimeJavaScript),
    distRuntimeDeclarationBytes: Buffer.byteLength(distRuntimeDeclaration),
    distRuntimeTotalBytes: distRuntimeDirectoryStats.total,
    generatedClientRuntimeBytes: Buffer.byteLength(clientRuntime),
    generatedClientRuntimeGzipBytes: gzipSync(clientRuntime).byteLength,
    distRuntimeFiles: distRuntimeDirectoryStats.files
  };
}

export async function readRuntimeBudgets() {
  return JSON.parse(await readFile(budgetPath, "utf8"));
}

export function checkRuntimeBudgets(metrics, budgets) {
  const failures = [];
  for (const [name, limit] of Object.entries(budgets)) {
    const actual = metrics[name];
    if (typeof actual !== "number") {
      failures.push(`${name}: metric is missing`);
      continue;
    }
    if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
      failures.push(`${name}: budget must be a positive finite number`);
      continue;
    }
    if (actual > limit) {
      failures.push(`${name}: ${actual} bytes exceeds ${limit} bytes`);
    }
  }
  return failures;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function renderMarkdown(metrics, budgets) {
  const rows = [
    ["Source runtime", "sourceRuntimeBytes"],
    ["Built runtime JavaScript", "distRuntimeJavaScriptBytes"],
    ["Built runtime declarations", "distRuntimeDeclarationBytes"],
    ["Built runtime directory", "distRuntimeTotalBytes"],
    ["Generated browser runtime", "generatedClientRuntimeBytes"],
    ["Generated browser runtime (gzip)", "generatedClientRuntimeGzipBytes"]
  ];
  const output = [
    "## Runtime metrics",
    "",
    `Source lines: **${metrics.sourceRuntimeLines.toLocaleString()}**`,
    "",
    "| Metric | Current | Budget | Status |",
    "| --- | ---: | ---: | --- |"
  ];

  for (const [label, key] of rows) {
    const actual = metrics[key];
    const limit = budgets[key];
    const status = actual <= limit ? "pass" : "over budget";
    output.push(`| ${label} | ${formatBytes(actual)} | ${formatBytes(limit)} | ${status} |`);
  }

  output.push("", "Largest built runtime files:", "");
  for (const file of metrics.distRuntimeFiles.slice(0, 10)) {
    output.push(`- \`${file.path}\`: ${formatBytes(file.bytes)}`);
  }
  return output.join("\n");
}

function renderText(metrics, budgets) {
  const failures = checkRuntimeBudgets(metrics, budgets);
  return [
    `source runtime: ${formatBytes(metrics.sourceRuntimeBytes)} (${metrics.sourceRuntimeLines} lines)`,
    `built runtime JS: ${formatBytes(metrics.distRuntimeJavaScriptBytes)}`,
    `built runtime declarations: ${formatBytes(metrics.distRuntimeDeclarationBytes)}`,
    `built runtime directory: ${formatBytes(metrics.distRuntimeTotalBytes)}`,
    `generated client runtime: ${formatBytes(metrics.generatedClientRuntimeBytes)}`,
    `generated client runtime gzip: ${formatBytes(metrics.generatedClientRuntimeGzipBytes)}`,
    failures.length === 0 ? "runtime budgets: pass" : `runtime budgets: fail\n${failures.join("\n")}`
  ].join("\n");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const metrics = await collectRuntimeMetrics();
  const budgets = await readRuntimeBudgets();
  const failures = checkRuntimeBudgets(metrics, budgets);

  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify({ metrics, budgets, failures }, null, 2)}\n`);
  } else if (args.has("--markdown")) {
    process.stdout.write(`${renderMarkdown(metrics, budgets)}\n`);
  } else {
    process.stdout.write(`${renderText(metrics, budgets)}\n`);
  }

  if (args.has("--check") && failures.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
