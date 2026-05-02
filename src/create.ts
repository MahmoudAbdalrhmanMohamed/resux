#!/usr/bin/env node
import { spawn } from "node:child_process";
import type { Dirent } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface, type Interface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

interface CliOptions {
  targetDir?: string;
  install?: boolean;
  packageManager?: PackageManager;
  force: boolean;
  yes: boolean;
  help: boolean;
}

const defaultProjectName = "resux-app";
const packageManagers = new Set<PackageManager>(["npm", "pnpm", "yarn", "bun"]);

if (isMainModule()) {
  runCreateResux(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export async function runCreateResux(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return;
  }

  const prompts = createInterface({ input: stdin, output: stdout });

  try {
    const targetDir = await readTargetDir(options, prompts);
    const root = path.resolve(process.cwd(), targetDir);
    const projectName = toPackageName(path.basename(root));
    const title = toTitle(projectName);
    const frameworkPackage = await readFrameworkPackage();
    const install = options.install ?? await promptConfirm(prompts, "Install dependencies?", canPrompt(), options.yes);
    const packageManager = options.packageManager ?? detectPackageManager();

    await prepareTarget(root, options.force);
    await copyTemplate(path.resolve(fileURLToPath(new URL("../templates/default", import.meta.url))), root, {
      "%PROJECT_NAME%": projectName,
      "%PROJECT_TITLE%": title
    });
    await writeFile(path.join(root, "package.json"), createStarterPackageJson(projectName, frameworkPackage), "utf8");

    if (install) {
      await installDependencies(root, packageManager);
    }

    printNextSteps({ root, packageManager, installed: install });
  } finally {
    prompts.close();
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    force: false,
    yes: false,
    help: false
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-y" || arg === "--yes") {
      options.yes = true;
    } else if (arg === "--install") {
      options.install = true;
    } else if (arg === "--no-install") {
      options.install = false;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--package-manager" || arg === "--pm") {
      options.packageManager = readPackageManager(args[++index]);
    } else if (arg.startsWith("--package-manager=")) {
      options.packageManager = readPackageManager(arg.slice("--package-manager=".length));
    } else if (arg.startsWith("--pm=")) {
      options.packageManager = readPackageManager(arg.slice("--pm=".length));
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option "${arg}". Run resux init --help for usage.`);
    } else if (!options.targetDir) {
      options.targetDir = arg;
    } else {
      throw new Error(`Unexpected argument "${arg}". Only one project directory can be provided.`);
    }
  }

  return options;
}

function readPackageManager(value: string | undefined): PackageManager {
  if (!value || !packageManagers.has(value as PackageManager)) {
    throw new Error("Package manager must be one of npm, pnpm, yarn, or bun.");
  }
  return value as PackageManager;
}

async function readTargetDir(options: CliOptions, prompts: Interface): Promise<string> {
  if (options.targetDir) {
    return options.targetDir;
  }

  if (options.yes || !canPrompt()) {
    return defaultProjectName;
  }

  const answer = await prompts.question(`Project name (${defaultProjectName}): `);
  return answer.trim() || defaultProjectName;
}

async function promptConfirm(prompts: Interface, label: string, defaultValue: boolean, yes: boolean): Promise<boolean> {
  if (yes || !canPrompt()) {
    return defaultValue;
  }

  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = (await prompts.question(`${label} (${suffix}) `)).trim().toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
}

async function prepareTarget(root: string, force: boolean): Promise<void> {
  await mkdir(root, { recursive: true });
  const entries = await readdir(root);

  if (entries.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(`Target directory "${root}" is not empty. Choose another name or pass --force.`);
  }

  for (const entry of entries) {
    await rm(path.join(root, entry), { recursive: true, force: true });
  }
}

async function copyTemplate(
  sourceRoot: string,
  targetRoot: string,
  replacements: Record<string, string>
): Promise<void> {
  await copyDirectory(sourceRoot, targetRoot, "", replacements);
}

async function copyDirectory(
  sourceDir: string,
  targetDir: string,
  relativeDir: string,
  replacements: Record<string, string>
): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    await copyEntry(entry, sourceDir, targetDir, relativeDir, replacements);
  }
}

async function copyEntry(
  entry: Dirent,
  sourceDir: string,
  targetDir: string,
  relativeDir: string,
  replacements: Record<string, string>
): Promise<void> {
  const source = path.join(sourceDir, entry.name);
  const targetName = entry.name === "_gitignore" ? ".gitignore" : entry.name;
  const target = path.join(targetDir, targetName);
  const relativePath = path.join(relativeDir, entry.name);

  if (entry.isDirectory()) {
    await copyDirectory(source, target, relativePath, replacements);
    return;
  }

  if (!entry.isFile()) {
    return;
  }

  let contents = await readFile(source, "utf8");

  for (const [needle, value] of Object.entries(replacements)) {
    contents = contents.replaceAll(needle, value);
  }

  await writeFile(target, contents, "utf8");
}

async function readFrameworkPackage(): Promise<{ name: string; version: string }> {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
  const contents = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(contents) as { name?: unknown; version?: unknown };

  return {
    name: typeof packageJson.name === "string" ? packageJson.name : "@mahmoud-abdelrahman/resux",
    version: typeof packageJson.version === "string" ? packageJson.version : "0.0.0"
  };
}

function createStarterPackageJson(projectName: string, frameworkPackage: { name: string; version: string }): string {
  return `${JSON.stringify({
    name: projectName,
    private: true,
    type: "module",
    scripts: {
      dev: "resux dev .",
      build: "resux build .",
      "build:nitro": "npm run build && nitro build",
      preview: "resux preview .",
      start: "resux start .",
      "start:nitro": "node .output/server/index.mjs",
      inspect: "resux inspect ."
    },
    dependencies: {
      [frameworkPackage.name]: `^${frameworkPackage.version}`
    }
  }, null, 2)}\n`;
}

async function installDependencies(root: string, packageManager: PackageManager): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(packageManager, ["install"], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${packageManager} install exited with code ${code ?? "unknown"}.`));
      }
    });
  });
}

function printNextSteps(options: { root: string; packageManager: PackageManager; installed: boolean }): void {
  const relative = path.relative(process.cwd(), options.root) || ".";
  const cdTarget = formatShellPath(relative);

  console.log(`\nCreated Resux app in ${options.root}`);
  console.log("\nNext steps:");

  if (cdTarget !== ".") {
    console.log(`  cd ${cdTarget}`);
  }

  if (!options.installed) {
    console.log(`  ${options.packageManager} install`);
  }

  console.log(`  ${runCommand(options.packageManager, "dev")}`);
}

function runCommand(packageManager: PackageManager, script: string): string {
  if (packageManager === "npm") {
    return `npm run ${script}`;
  }

  if (packageManager === "bun") {
    return `bun run ${script}`;
  }

  return `${packageManager} ${script}`;
}

function detectPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent ?? "";

  if (agent.startsWith("pnpm")) {
    return "pnpm";
  }

  if (agent.startsWith("yarn")) {
    return "yarn";
  }

  if (agent.startsWith("bun")) {
    return "bun";
  }

  return "npm";
}

function toPackageName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");

  return normalized || defaultProjectName;
}

function toTitle(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Resux App";
}

function formatShellPath(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function canPrompt(): boolean {
  return Boolean(stdin.isTTY && stdout.isTTY);
}

function isMainModule(): boolean {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

function printHelp(): void {
  console.log(`resux init

Usage:
  npx @mahmoud-abdelrahman/resux@latest init [project-dir] [options]
  resux init [project-dir] [options]

Options:
  --install               Install dependencies after scaffolding
  --no-install            Skip dependency installation
  --package-manager <pm>  Use npm, pnpm, yarn, or bun for next steps
  --force                 Empty the target directory before scaffolding
  -y, --yes               Use default answers
  -h, --help              Show this help message
`);
}
