import { spawn } from "node:child_process";
import type { Dirent } from "node:fs";
import { lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface, type Interface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
type StarterTemplate =
  | "minimal"
  | "default"
  | "full"
  | "i18n"
  | "pwa"
  | "media"
  | "package-compatibility"
  | "dashboard";
type StarterFeature =
  | "seo"
  | "i18n"
  | "media"
  | "pwa"
  | "tailwind"
  | "package-compatibility"
  | "server-api"
  | "tests";

interface CliOptions {
  targetDir?: string;
  install?: boolean;
  packageManager?: PackageManager;
  template?: StarterTemplate;
  features?: StarterFeature[];
  hreflang?: boolean;
  force: boolean;
  yes: boolean;
  help: boolean;
}

const defaultProjectName = "resux-app";
const packageManagers = new Set<PackageManager>(["npm", "pnpm", "yarn", "bun"]);
const starterTemplates: StarterTemplate[] = [
  "minimal",
  "default",
  "full",
  "i18n",
  "pwa",
  "media",
  "package-compatibility",
  "dashboard",
];
const starterFeatures: StarterFeature[] = [
  "seo",
  "i18n",
  "media",
  "pwa",
  "tailwind",
  "package-compatibility",
  "server-api",
  "tests",
];

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
    const template = await readStarterTemplate(options, prompts);
    const templateDefaults = defaultFeaturesForTemplate(template);
    const features = uniqueFeatures([
      ...templateDefaults,
      ...await readStarterFeatures(options, prompts, template),
    ]);
    const hreflang = await readHreflangSupport(options, prompts, features);
    const install = options.install ?? await promptConfirm(prompts, "Install dependencies?", canPrompt(), options.yes);
    const packageManager = options.packageManager ?? detectPackageManager();

    assertSafeCreateTarget(root, process.cwd(), options.force);
    await prepareTarget(root, options.force);
    await copyTemplate(path.resolve(fileURLToPath(new URL("../templates/default", import.meta.url))), root, {
      "%PROJECT_NAME%": projectName,
      "%PROJECT_TITLE%": title
    });
    await writeFile(
      path.join(root, "package.json"),
      createStarterPackageJson(projectName, frameworkPackage, features, template),
      "utf8",
    );
    await applyStarterFeatureScaffold(root, title, features, { hreflang });
    await ensureStarterProjectStructure(root, title, features, template);

    if (install) {
      await installDependencies(root, packageManager);
    }

    printNextSteps({ root, packageManager, installed: install, features, template });
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
    } else if (arg === "--template") {
      options.template = readTemplate(args[++index]);
    } else if (arg.startsWith("--template=")) {
      options.template = readTemplate(arg.slice("--template=".length));
    } else if (arg === "--features") {
      options.features = normalizeFeatureList(args[++index]);
    } else if (arg.startsWith("--features=")) {
      options.features = normalizeFeatureList(arg.slice("--features=".length));
    } else if (arg === "--package-manager" || arg === "--pm") {
      options.packageManager = readPackageManager(args[++index]);
    } else if (arg.startsWith("--package-manager=")) {
      options.packageManager = readPackageManager(arg.slice("--package-manager=".length));
    } else if (arg.startsWith("--pm=")) {
      options.packageManager = readPackageManager(arg.slice("--pm=".length));
    } else if (arg === "--hreflang") {
      options.hreflang = true;
    } else if (arg === "--no-hreflang") {
      options.hreflang = false;
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

function readTemplate(value: string | undefined): StarterTemplate {
  if (!value || !starterTemplates.includes(value as StarterTemplate)) {
    throw new Error(`Template must be one of: ${starterTemplates.join(", ")}.`);
  }
  return value as StarterTemplate;
}

function normalizeFeatureList(raw: string | undefined): StarterFeature[] {
  if (!raw) {
    return [];
  }
  const entries = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const selected: StarterFeature[] = [];
  const seen = new Set<StarterFeature>();

  for (const entry of entries) {
    if (!starterFeatures.includes(entry as StarterFeature)) {
      throw new Error(`Unknown feature "${entry}". Supported features: ${starterFeatures.join(", ")}.`);
    }
    const feature = entry as StarterFeature;
    if (!seen.has(feature)) {
      seen.add(feature);
      selected.push(feature);
    }
  }

  return selected;
}

function uniqueFeatures(features: StarterFeature[]): StarterFeature[] {
  return [...new Set(features)];
}

function defaultFeaturesForTemplate(template: StarterTemplate): StarterFeature[] {
  if (template === "minimal") {
    return [];
  }
  if (template === "full") {
    return ["seo", "i18n", "media", "pwa", "tailwind", "package-compatibility", "server-api", "tests"];
  }
  if (template === "i18n") {
    return ["i18n"];
  }
  if (template === "pwa") {
    return ["pwa"];
  }
  if (template === "media") {
    return ["media"];
  }
  if (template === "package-compatibility") {
    return ["package-compatibility"];
  }
  if (template === "dashboard") {
    return ["seo", "tailwind", "server-api"];
  }
  return ["seo"];
}

async function readStarterTemplate(options: CliOptions, prompts: Interface): Promise<StarterTemplate> {
  if (options.template) {
    return options.template;
  }
  if (options.yes || !canPrompt()) {
    return "default";
  }
  const answer = (await prompts.question(`Template (${starterTemplates.join(", ")}) [default]: `)).trim();
  if (!answer) {
    return "default";
  }
  return readTemplate(answer);
}

async function readStarterFeatures(options: CliOptions, prompts: Interface, template: StarterTemplate): Promise<StarterFeature[]> {
  if (Array.isArray(options.features)) {
    return options.features;
  }

  if (options.yes || !canPrompt()) {
    return [];
  }

  const selected: StarterFeature[] = [];
  const labels: Record<StarterFeature, string> = {
    seo: "SEO utilities",
    i18n: "i18n (localized routes + translations)",
    media: "media page + helpers",
    pwa: "PWA manifest scaffold",
    tailwind: "Tailwind CSS setup",
    "package-compatibility": "third-party package compatibility examples",
    "server-api": "server API and route examples",
    tests: "basic tests scaffold",
  };

  const promptOrder: StarterFeature[] = [
    "tailwind",
    "i18n",
    "pwa",
    "media",
    "package-compatibility",
    "server-api",
    "tests",
    "seo",
  ];
  const templateDefaults = new Set(defaultFeaturesForTemplate(template));

  for (const feature of promptOrder) {
    const enabled = await promptConfirm(
      prompts,
      `Enable ${labels[feature]}?`,
      templateDefaults.has(feature),
      false,
    );
    if (enabled) {
      selected.push(feature);
    }
  }

  return selected;
}

async function readHreflangSupport(
  options: CliOptions,
  prompts: Interface,
  features: StarterFeature[]
): Promise<boolean> {
  if (!features.includes("i18n") && !features.includes("seo")) {
    return false;
  }

  if (typeof options.hreflang === "boolean") {
    return options.hreflang;
  }

  if (options.yes || !canPrompt()) {
    return false;
  }

  return promptConfirm(prompts, "Add hreflang alternate links?", false, false);
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

export function assertSafeCreateTarget(root: string, cwd: string, force: boolean): void {
  if (!force) {
    return;
  }

  const target = path.resolve(root);
  const workingDirectory = path.resolve(cwd);
  const filesystemRoot = path.parse(target).root;
  const homeDirectory = path.resolve(homedir());
  const relativeWorkingDirectory = path.relative(target, workingDirectory);
  const containsWorkingDirectory = relativeWorkingDirectory === ""
    || (!relativeWorkingDirectory.startsWith("..") && !path.isAbsolute(relativeWorkingDirectory));

  if (target === filesystemRoot || target === homeDirectory || containsWorkingDirectory) {
    throw new Error(
      `Refusing to use --force on protected directory "${target}". Choose a new child directory instead.`,
    );
  }
}

async function prepareTarget(root: string, force: boolean): Promise<void> {
  const existing = await lstat(root).catch(() => null);
  if (existing?.isSymbolicLink()) {
    throw new Error(`Refusing to create a Resux project through symbolic link "${root}". Choose a real directory instead.`);
  }

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
    name: typeof packageJson.name === "string" ? packageJson.name : "resuxjs",
    version: typeof packageJson.version === "string" ? packageJson.version : "0.0.0"
  };
}

function createStarterPackageJson(
  projectName: string,
  frameworkPackage: { name: string; version: string },
  features: StarterFeature[],
  template: StarterTemplate,
): string {
  const selected = new Set(features);
  const includeTests = selected.has("tests") || template === "default" || template === "full";
  const devDependencies: Record<string, string> = {
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3",
    "vue-tsc": "^3.3.8",
  };
  if (includeTests) {
    devDependencies.vitest = "^4.0.8";
  }
  if (selected.has("tailwind")) {
    devDependencies.tailwindcss = "^3.4.17";
    devDependencies.postcss = "^8.5.6";
    devDependencies.autoprefixer = "^10.4.22";
  }
  return `${JSON.stringify({
    name: projectName,
    private: true,
    type: "module",
    scripts: {
      prepare: "resux prepare",
      dev: "resux dev",
      build: "resux build",
      preview: "resux preview",
      start: "resux start",
      inspect: "resux inspect",
      typecheck: "vue-tsc --noEmit",
      ...(includeTests ? { test: "vitest run" } : {}),
    },
    dependencies: {
      [frameworkPackage.name]: `^${frameworkPackage.version}`
    },
    devDependencies,
    engines: {
      node: ">=20.19.0",
    },
  }, null, 2)}\n`;
}

async function applyStarterFeatureScaffold(
  root: string,
  title: string,
  features: StarterFeature[],
  options: { hreflang: boolean }
): Promise<void> {
  const selected = new Set(features);
  await writeFile(path.join(root, "resux.config.ts"), createStarterResuxConfig(title, selected, options), "utf8");

  if (!selected.has("seo")) {
    await removeSeoFromPage(path.join(root, "pages", "index.vue"));
    await removeSeoFromPage(path.join(root, "pages", "about.vue"));
  }

  if (selected.has("i18n")) {
    await scaffoldI18nFiles(root);
  }

  if (selected.has("media")) {
    await scaffoldMediaPage(root);
  }

  if (selected.has("pwa")) {
    await scaffoldPwaFiles(root, title);
  }

  await extendDefaultLayoutNavigation(root, selected);
  await annotateStarterReadme(root, selected);
}

async function ensureStarterProjectStructure(
  root: string,
  title: string,
  features: StarterFeature[],
  template: StarterTemplate,
): Promise<void> {
  const selected = new Set(features);
  const shouldIncludeTests = selected.has("tests") || template === "default" || template === "full";
  const shouldIncludeServerApi = selected.has("server-api") || template === "default" || template === "full";
  const shouldIncludePackageExamples = selected.has("package-compatibility") || template === "package-compatibility" || template === "full";

  const requiredDirs = [
    "pages",
    "layouts",
    "components",
    "composables",
    "utils",
    "shared",
    "middleware",
    "plugins",
    "server/api",
    "server/routes",
    "server/middleware",
    "server/plugins",
    "server/utils",
    "public/images",
    "assets/css",
    "types",
    "tests",
  ];

  for (const relativeDir of requiredDirs) {
    await mkdir(path.join(root, relativeDir), { recursive: true });
  }

  await ensureFile(
    path.join(root, ".npmrc"),
    "engine-strict=true\n",
  );
  await ensureFile(
    path.join(root, ".env.example"),
    "# Runtime environment defaults\nAPP_ORIGIN=http://localhost:3000\n",
  );
  await ensureFile(
    path.join(root, "types", "app.d.ts"),
    'import "resuxjs/globals";\n\nexport {};\n',
  );
  await ensureFile(
    path.join(root, "types", "assets.d.ts"),
    'declare module "*.css";\n',
  );
  await ensureFile(
    path.join(root, "assets", "css", "main.css"),
    `:root {
  --rx-bg: #020617;
  --rx-surface: #0f172a;
  --rx-text: #e2e8f0;
  --rx-muted: #94a3b8;
  --rx-accent: #22d3ee;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: radial-gradient(circle at top, #111827 0%, var(--rx-bg) 60%);
  color: var(--rx-text);
}
a {
  color: var(--rx-accent);
}
`,
  );
  await ensureFile(
    path.join(root, "components", "AppHeader.vue"),
    `<template>
  <header class="starter-header">
    <ResuxLink to="/">${title}</ResuxLink>
    <nav>
      <ResuxLink to="/">Home</ResuxLink>
      <ResuxLink to="/about">About</ResuxLink>
    </nav>
  </header>
</template>

<style scoped>
.starter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

nav {
  display: inline-flex;
  gap: 0.75rem;
}
</style>
`,
  );
  await ensureFile(
    path.join(root, "components", "AppFooter.vue"),
    `<template>
  <footer class="starter-footer">
    <small>Powered by Resux</small>
  </footer>
</template>

<style scoped>
.starter-footer {
  opacity: 0.75;
  margin-top: 2rem;
}
</style>
`,
  );
  await ensureFile(
    path.join(root, "composables", "useCounter.ts"),
    `export function useCounter(key = "starter-counter") {
  const count = useState<number>(key, () => 0);
  const increment = () => {
    count.value += 1;
  };
  const decrement = () => {
    count.value -= 1;
  };
  return { count, increment, decrement };
}
`,
  );
  await ensureFile(
    path.join(root, "utils", "formatDate.ts"),
    `export function formatDate(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}
`,
  );
  await ensureFile(
    path.join(root, "shared", "constants.ts"),
    `export const APP_NAME = ${JSON.stringify(title)};
`,
  );
  await ensureFile(
    path.join(root, "middleware", "analytics.global.ts"),
    `export default defineResuxRouteMiddleware((to, from) => {
  if (to.path === from.path) {
    return;
  }
  console.debug("[resux] analytics", { from: from.path, to: to.path });
});
`,
  );
  await ensureFile(
    path.join(root, "plugins", "example.ts"),
    `export default defineResuxPlugin((app) => {
  app.provide("examplePlugin", "plugins/example.ts loaded");
});
`,
  );
  await ensureFile(
    path.join(root, "plugins", "client-only.client.ts"),
    `export default defineResuxPlugin(() => {
  if (typeof window !== "undefined") {
    console.debug("[resux] client-only plugin ready");
  }
});
`,
  );
  await ensureFile(
    path.join(root, "plugins", "server-only.server.ts"),
    `export default defineResuxPlugin(() => {
  console.debug("[resux] server-only plugin ready");
});
`,
  );
  await ensureFile(
    path.join(root, "server", "utils", "serverHelper.ts"),
    `export function serverHelper(name: string): string {
  return "hello " + name;
}
`,
  );
  await ensureFile(
    path.join(root, "server", "middleware", "logger.ts"),
    `import { defineEventHandler } from "h3";

export default defineEventHandler((event) => {
  const method = event.node.req.method ?? "GET";
  const path = event.node.req.url ?? "/";
  console.debug("[resux] request", method, path);
});
`,
  );
  await ensureFile(
    path.join(root, "public", "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Resux">
  <rect width="128" height="128" rx="24" fill="#0f172a" />
  <path d="M32 30h30c20 0 34 12 34 29 0 16-14 29-34 29H46v30H32z" fill="#22d3ee"/>
  <circle cx="88" cy="93" r="11" fill="#a5f3fc"/>
</svg>
`,
  );
  await ensureFile(
    path.join(root, "public", "images", "logo.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" role="img" aria-label="Resux">
  <rect width="640" height="160" rx="24" fill="#020617"/>
  <text x="56" y="104" font-size="72" font-family="Segoe UI, sans-serif" fill="#22d3ee">Resux</text>
</svg>
`,
  );

  if (shouldIncludeServerApi) {
    await ensureFile(
      path.join(root, "server", "api", "hello.get.ts"),
      `import { defineEventHandler } from "h3";
export default defineEventHandler(() => {
  return { message: "hello resux" };
});
`,
    );
    await ensureFile(
      path.join(root, "server", "routes", "health.get.ts"),
      `import { defineEventHandler } from "h3";

export default defineEventHandler(() => ({ ok: true }));
`,
    );
    await ensureFile(
      path.join(root, "server", "plugins", "example.ts"),
      `import { defineNitroPlugin } from "nitropack/runtime/plugin";

export default defineNitroPlugin(() => {
  console.debug("[resux] nitro plugin booted");
});
`,
    );
  }

  if (shouldIncludeTests) {
    await ensureFile(
      path.join(root, "tests", "basic.test.ts"),
      `import { describe, expect, it } from "vitest";

describe("starter", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});
`,
    );
  }

  if (selected.has("tailwind")) {
    await ensureFile(
      path.join(root, "tailwind.config.ts"),
      `import type { Config } from "tailwindcss";

export default {
  content: [
    "./app.vue",
    "./pages/**/*.{vue,ts}",
    "./layouts/**/*.vue",
    "./components/**/*.vue",
    "./plugins/**/*.{ts,js}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
`,
    );
    await ensureFile(
      path.join(root, "postcss.config.cjs"),
      `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    );
    await ensureFile(
      path.join(root, "assets", "css", "tailwind.css"),
      `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    );
  }

  if (shouldIncludePackageExamples) {
    await ensurePackageCompatibilityPages(root);
  }
}

async function ensurePackageCompatibilityPages(root: string): Promise<void> {
  const pagesRoot = path.join(root, "pages", "package-tests");
  await mkdir(pagesRoot, { recursive: true });
  await ensureFile(
    path.join(root, "plugins", "package-enhancements.client.ts"),
    `type PackageStatus = "idle" | "loading" | "ready" | "error" | "disposed";
type SwiperLike = new (
  element: HTMLElement,
  options: Record<string, unknown>,
) => { destroy?: (deleteInstance?: boolean, cleanStyles?: boolean) => void };

const SWIPER_PACKAGE = "swiper";
const SWIPER_MODULES_PACKAGE = "swiper/modules";
const MISSING_PACKAGE = "resux-missing-package-demo";

function setEnhancementStatus(target: Element, status: PackageStatus, detail = "") {
  const root = target.closest("[data-rx-package-demo]") || target;
  if (!root || typeof (root as Element).querySelector !== "function") {
    return;
  }
  const statusNode = (root as Element).querySelector("[data-rx-package-status]");
  if (statusNode) {
    statusNode.textContent = detail ? status + ": " + detail : status;
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readSwiperOptions(target: Element): Record<string, unknown> {
  const raw = target.getAttribute("data-swiper-options");
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid JSON and use defaults.
  }
  return {};
}

defineClientEnhancement("swiper-carousel", async (target) => {
  setEnhancementStatus(target, "loading");
  try {
    const [Swiper, modules] = await Promise.all([
      useClientPackage<SwiperLike>(SWIPER_PACKAGE, {
        css: ["swiper/css", "swiper/css/navigation", "swiper/css/pagination"],
      }),
      useClientPackage<Record<string, unknown>>(SWIPER_MODULES_PACKAGE, {
        preferDefault: false,
      }),
    ]);
    const carousel = target.querySelector(".swiper");
    if (!carousel) {
      setEnhancementStatus(target, "error", "Missing .swiper element");
      return;
    }
    const instance = new Swiper(carousel as HTMLElement, {
      modules: [modules.Navigation, modules.Pagination].filter(Boolean),
      slidesPerView: 1,
      spaceBetween: 16,
      breakpoints: {
        640: { slidesPerView: 1.2, spaceBetween: 16 },
        768: { slidesPerView: 2, spaceBetween: 20 },
        1024: { slidesPerView: 3, spaceBetween: 24 },
        1280: { slidesPerView: 4, spaceBetween: 24 },
      },
      navigation: {
        nextEl: target.querySelector("[data-rx-next]") as HTMLElement | null,
        prevEl: target.querySelector("[data-rx-prev]") as HTMLElement | null,
      },
      pagination: {
        el: target.querySelector("[data-rx-pagination]") as HTMLElement | null,
        clickable: true,
      },
      ...readSwiperOptions(target),
    });
    setEnhancementStatus(target, "ready");
    return () => {
      instance.destroy?.(true, true);
      setEnhancementStatus(target, "disposed");
    };
  } catch (error) {
    setEnhancementStatus(target, "error", toMessage(error));
  }
});

for (const name of ["chart-demo", "animation-demo", "video-player-demo", "markdown-demo", "css-package-demo"]) {
  defineClientEnhancement(name, async (target) => {
    setEnhancementStatus(target, "ready", "Client enhancement active");
  });
}

defineClientEnhancement("missing-package-demo", async (target) => {
  setEnhancementStatus(target, "loading");
  try {
    await useClientPackage(MISSING_PACKAGE);
    setEnhancementStatus(target, "ready");
  } catch (error) {
    setEnhancementStatus(target, "error", toMessage(error));
  }
});
`,
  );

  await ensureFile(
    path.join(pagesRoot, "index.vue"),
    `<script setup lang="ts">
useSeoMeta({
  title: "Resux Package Compatibility Demos",
  description: "SSR-first npm package demos with client enhancements and resumability-safe patterns.",
})
</script>

<template>
  <main class="page">
    <h1>Package compatibility demos</h1>
    <p>Each page renders semantic SSR HTML first, then applies browser-only enhancement without hydration.</p>
    <ul>
      <li><ResuxLink to="/package-tests/swiper">Swiper</ResuxLink></li>
      <li><ResuxLink to="/package-tests/chart">Chart</ResuxLink></li>
      <li><ResuxLink to="/package-tests/animation">Animation</ResuxLink></li>
      <li><ResuxLink to="/package-tests/video-player">Video player</ResuxLink></li>
      <li><ResuxLink to="/package-tests/markdown">Markdown</ResuxLink></li>
      <li><ResuxLink to="/package-tests/utility">Utility</ResuxLink></li>
      <li><ResuxLink to="/package-tests/css-package">CSS package</ResuxLink></li>
      <li><ResuxLink to="/package-tests/missing-package">Missing package</ResuxLink></li>
    </ul>
  </main>
</template>
`,
  );

  const examples: Array<{ file: string; title: string; enhancement?: string }> = [
    { file: "swiper.vue", title: "Swiper", enhancement: "swiper-carousel" },
    { file: "chart.vue", title: "Chart", enhancement: "chart-demo" },
    { file: "animation.vue", title: "Animation", enhancement: "animation-demo" },
    { file: "video-player.vue", title: "Video player", enhancement: "video-player-demo" },
    { file: "markdown.vue", title: "Markdown", enhancement: "markdown-demo" },
    { file: "utility.vue", title: "Utility" },
    { file: "css-package.vue", title: "CSS package", enhancement: "css-package-demo" },
    { file: "missing-package.vue", title: "Missing package", enhancement: "missing-package-demo" },
  ];

  for (const example of examples) {
    await ensureFile(
      path.join(pagesRoot, example.file),
      `<script setup lang="ts">
useSeoMeta({
  title: "Resux ${example.title} Package Demo",
  description: "SSR-first ${example.title.toLowerCase()} compatibility demo with progressive enhancement.",
  ogTitle: "Resux ${example.title} Demo",
})
</script>

<template>
  <main class="page">
    <h1>${example.title} package demo</h1>
    <p>Semantic HTML is rendered on the server before any package code runs.</p>
    <section class="panel" data-rx-package-demo="true"${example.enhancement ? `
      use-client-enhancement="${example.enhancement}"
      data-trigger="visible"` : ""}>
      <p data-rx-package-status>idle</p>
      <ul>
        <li>SSR content remains visible without JavaScript.</li>
        <li>Enhancement is isolated to client runtime only.</li>
      </ul>
      <div class="swiper"${example.enhancement === "swiper-carousel" ? "" : " style=\"display:none\""}>
        <div class="swiper-wrapper">
          <article class="swiper-slide"><h2>Item 1</h2><p>SSR card content.</p><a href="/package-tests">Read more</a></article>
          <article class="swiper-slide"><h2>Item 2</h2><p>SSR card content.</p><a href="/package-tests">Read more</a></article>
          <article class="swiper-slide"><h2>Item 3</h2><p>SSR card content.</p><a href="/package-tests">Read more</a></article>
          <article class="swiper-slide"><h2>Item 4</h2><p>SSR card content.</p><a href="/package-tests">Read more</a></article>
        </div>
      </div>
      ${example.enhancement === "swiper-carousel" ? '<div data-rx-prev aria-label="Previous slide"></div><div data-rx-next aria-label="Next slide"></div><div data-rx-pagination></div>' : ''}
    </section>
  </main>
</template>
`,
    );
  }
}

async function ensureFile(filePath: string, contents: string): Promise<void> {
  if (await pathExists(filePath)) {
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function createStarterResuxConfig(
  title: string,
  features: Set<StarterFeature>,
  options: { hreflang: boolean }
): string {
  const modules = [
    `"resux:security"`,
    `"resux:performance"`,
    ...(features.has("i18n") ? [`"resuxjs/i18n"`] : [])
  ];

  const headLinks = [
    ...(features.has("tailwind") ? [`{ rel: "stylesheet", href: "/tailwind.css" }`] : []),
    `{ rel: "stylesheet", href: "/styles.css" }`,
    ...(features.has("pwa") ? [`{ rel: "manifest", href: "/manifest.webmanifest" }`] : [])
  ];

  const headMeta = features.has("pwa")
    ? `,
      meta: [
        { name: "theme-color", content: "#0f172a" },
        { name: "application-name", content: ${JSON.stringify(title)} }
      ]`
    : "";

  const i18nBlock = features.has("i18n")
    ? `,
  i18n: {
    defaultLocale: "en",
    fallbackLocale: "en",
    strategy: "prefix_except_default",
    locales: [
      { code: "en", name: "English", dir: "ltr" },
      { code: "ar", name: "العربية", dir: "rtl" }
    ],
    messages: {
      en: () => import("./locales/en.json"),
      ar: () => import("./locales/ar.json")
    },
    seo: {
      hreflang: ${options.hreflang ? "true" : "false"}
    }
  }`
    : "";

  const packageBlock = features.has("package-compatibility")
    ? `,
  packages: {
    mode: {
      "swiper": "progressive",
      "chart.js": "progressive",
      "gsap": "clientOnly",
      "plyr": "progressive",
      "marked": "ssr",
      "date-fns": "ssr",
      "highlight.js": "progressive"
    }
  }`
    : "";

  return `export default defineResuxConfig({
  deploy: {
    target: "auto"
  },
  modules: [
    ${modules.join(",\n    ")}
  ],
  app: {
    head: {
      link: [
        ${headLinks.join(",\n        ")}
      ]${headMeta}
    }
  },
  runtimeConfig: {
    public: {
      appName: ${JSON.stringify(title)}
    }
  }${packageBlock}${i18nBlock}
})
`;
}

async function removeSeoFromPage(filePath: string): Promise<void> {
  const source = await readFile(filePath, "utf8");
  const withoutSeo = source.replace(/\nuseSeoMeta\(\{[\s\S]*?\}\)\n/g, "\n");
  await writeFile(filePath, withoutSeo, "utf8");
}

async function scaffoldI18nFiles(root: string): Promise<void> {
  const localesDir = path.join(root, "locales");
  await mkdir(localesDir, { recursive: true });
  await writeFile(path.join(localesDir, "en.json"), `${JSON.stringify({
    demo: {
      badge: "I18n demo",
      title: "Localized starter",
      subtitle: "Switch locale prefixes and translate strings without hydration.",
      currentLocale: "Current locale: {locale}",
      currentDir: "Direction: {dir}",
      welcome: "Welcome, {name}!"
    }
  }, null, 2)}\n`, "utf8");
  await writeFile(path.join(localesDir, "ar.json"), `${JSON.stringify({
    demo: {
      badge: "عرض الترجمة",
      title: "مشروع مترجم",
      subtitle: "بدل اللغات والمسارات بدون ترطيب.",
      currentLocale: "اللغة الحالية: {locale}",
      currentDir: "الاتجاه: {dir}",
      welcome: "مرحبًا {name}!"
    }
  }, null, 2)}\n`, "utf8");

  await writeFile(path.join(root, "pages", "i18n.vue"), `<script setup lang="ts">
import { useI18n } from "resuxjs/i18n"

definePageMeta({
  title: {
    en: "I18n",
    ar: "الترجمة"
  }
})

const i18n = useI18n()
</script>

<template>
  <main class="page narrow">
    <p class="eyebrow">{{ i18n.t("demo.badge") }}</p>
    <h1>{{ i18n.t("demo.title") }}</h1>
    <p class="lede">{{ i18n.t("demo.subtitle") }}</p>
    <p>{{ i18n.t("demo.currentLocale", { locale: i18n.locale.value }) }}</p>
    <p>{{ i18n.t("demo.currentDir", { dir: i18n.dir.value }) }}</p>
    <p>{{ i18n.t("demo.welcome", { name: "Resux" }) }}</p>
    <div class="actions">
      <ResuxLink :to="i18n.switchLocalePath('en')">English</ResuxLink>
      <ResuxLink :to="i18n.switchLocalePath('ar')">العربية</ResuxLink>
    </div>
  </main>
</template>
`, "utf8");
}

async function scaffoldMediaPage(root: string): Promise<void> {
  await writeFile(path.join(root, "pages", "media.vue"), `<script setup lang="ts">
definePageMeta({
  title: "Media"
})
</script>

<template>
  <main class="page">
    <p class="eyebrow">Media</p>
    <h1>Responsive media components</h1>
    <p class="lede">This route validates Resux media rendering with SSR + resumable handlers.</p>

    <section class="stats-grid">
      <article class="stat">
        <span>ResuxImg</span>
        <ResuxImg
          src="/resux-placeholder.svg"
          alt="Resux placeholder"
          width="256"
          height="256"
          format="webp"
          quality="82"
          sizes="(min-width: 768px) 30vw, 80vw"
          preload
          priority
        />
      </article>
      <article class="stat">
        <span>ResuxPicture</span>
        <ResuxPicture
          src="/resux-placeholder.svg"
          alt="Resux placeholder picture"
          widths="240,360,480"
          formats="avif,webp,png"
          sizes="(min-width: 768px) 30vw, 80vw"
        />
      </article>
    </section>
  </main>
</template>
`, "utf8");
}

async function scaffoldPwaFiles(root: string, title: string): Promise<void> {
  await writeFile(path.join(root, "public", "manifest.webmanifest"), `${JSON.stringify({
    name: title,
    short_name: title.replace(/\s+/g, " ").slice(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/resux-placeholder.svg",
        sizes: "96x96",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  }, null, 2)}\n`, "utf8");

  await writeFile(path.join(root, "public", "sw.js"), `self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})
`, "utf8");
}

async function extendDefaultLayoutNavigation(root: string, features: Set<StarterFeature>): Promise<void> {
  const layoutPath = path.join(root, "layouts", "default.vue");
  const source = await readFile(layoutPath, "utf8");
  const additions = [
    ...(features.has("i18n") ? ['        <ResuxLink to="/i18n">I18n</ResuxLink>'] : []),
    ...(features.has("media") ? ['        <ResuxLink to="/media">Media</ResuxLink>'] : [])
  ];

  if (!additions.length) {
    return;
  }

  const marker = "      </nav>";
  const next = source.includes(marker)
    ? source.replace(marker, `${additions.join("\n")}\n${marker}`)
    : source;
  await writeFile(layoutPath, next, "utf8");
}

async function annotateStarterReadme(root: string, features: Set<StarterFeature>): Promise<void> {
  if (!features.size) {
    return;
  }

  const readmePath = path.join(root, "README.md");
  const source = await readFile(readmePath, "utf8");
  const featureList = [...features].map((feature) => `- ${feature}`).join("\n");
  const next = `${source.trimEnd()}\n\n## Optional Features\n\n${featureList}\n`;
  await writeFile(readmePath, next, "utf8");
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

function printNextSteps(options: {
  root: string;
  packageManager: PackageManager;
  installed: boolean;
  features: StarterFeature[];
  template: StarterTemplate;
}): void {
  const relative = path.relative(process.cwd(), options.root) || ".";
  const cdTarget = formatShellPath(relative);

  console.log(`\nCreated Resux app in ${options.root}`);
  console.log(`Template: ${options.template}`);
  console.log("\nNext steps:");

  if (cdTarget !== ".") {
    console.log(`  cd ${cdTarget}`);
  }

  if (!options.installed) {
    console.log(`  ${options.packageManager} install`);
  }

  console.log(`  ${runCommand(options.packageManager, "dev")}`);
  if (options.features.length > 0) {
    console.log(`\nSelected optional features: ${options.features.join(", ")}`);
  }
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
  npx resuxjs@latest init [project-dir] [options]
  resux init [project-dir] [options]

Options:
  --install               Install dependencies after scaffolding
  --no-install            Skip dependency installation
  --template <name>       Starter template (minimal,default,full,i18n,pwa,media,package-compatibility,dashboard)
  --features <list>       Comma-separated optional starter features (seo,i18n,media,pwa,tailwind,package-compatibility,server-api,tests)
  --hreflang              Enable i18n hreflang alternate links in generated config
  --no-hreflang           Disable i18n hreflang alternate links in generated config
  --package-manager <pm>  Use npm, pnpm, yarn, or bun for next steps
  --force                 Empty the target directory before scaffolding
  -y, --yes               Use default answers
  -h, --help              Show this help message
`);
}
