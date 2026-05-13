import { existsSync } from "node:fs";
import { cp, lstat, mkdir, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  assertRuntimeClientAsset,
  ensureResuxClientAssets,
  ensureResuxServerPayload,
  pathExists,
  readJsonRecord,
  writeJson,
} from "./common.js";
import type {
  DeployBuildContext,
  DeployDetectionContext,
  DeployTargetModule,
} from "./types.js";

const SUPPORTED_NODE_VERSIONS = [18, 20, 22] as const;

type BuildOutputRoute = Record<string, unknown>;

interface BuildOutputConfig extends Record<string, unknown> {
  version?: unknown;
  routes?: unknown;
}

interface PackageRecord extends Record<string, unknown> {
  dependencies?: unknown;
  optionalDependencies?: unknown;
}

function parseMajorNodeVersion(version: string): number {
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isNaN(major) ? 22 : major;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveVercelNodeRuntime(nodeVersion = process.versions.node): string {
  const systemNodeVersion = parseMajorNodeVersion(nodeVersion);
  const runtimeVersion =
    SUPPORTED_NODE_VERSIONS.find((version) => version >= systemNodeVersion)
    ?? SUPPORTED_NODE_VERSIONS[SUPPORTED_NODE_VERSIONS.length - 1];
  return `nodejs${runtimeVersion}.x`;
}

function resolveFallbackFunctionName(functionNames: string[]): string | null {
  if (functionNames.includes("__fallback.func")) {
    return "__fallback";
  }
  if (functionNames.includes("[...].func")) {
    return "[...]";
  }
  const fallback = functionNames.find((name) => name.endsWith(".func"));
  return fallback ? fallback.slice(0, -5) : null;
}

function isCatchAllRouteSrc(src: unknown): boolean {
  if (typeof src !== "string") {
    return false;
  }

  return src === "/(.*)" || src === "/(?:.*)" || /^\/\((?:\?:)?\.\*\)$/.test(src);
}

function routeDestIncludesFunctionName(route: Record<string, unknown>, functionName: string): boolean {
  if (typeof route.dest !== "string" || !functionName) {
    return false;
  }

  const normalizedDest = route.dest.startsWith("/") ? route.dest.slice(1) : route.dest;
  return normalizedDest === functionName;
}

function normalizeBuildOutputConfig(value: unknown): BuildOutputConfig {
  if (!isRecord(value)) {
    return {};
  }
  return value;
}

function runtimeDependencyNames(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  return Object.keys(value).filter((name) => name.trim().length > 0);
}

function dependencyTargetPath(functionRoot: string, packageName: string): string {
  return path.join(functionRoot, "node_modules", ...packageName.split("/"));
}

function resolveResuxPackageRequire(
  appRequire: ReturnType<typeof createRequire>,
): ReturnType<typeof createRequire> | null {
  for (const packageName of ["resuxjs", "resux"]) {
    try {
      const packageJsonPath = appRequire.resolve(`${packageName}/package.json`);
      return createRequire(packageJsonPath);
    } catch {
      // Keep trying known package names.
    }
  }
  return null;
}

function resolveDependencyPackageJsonPath(
  dependency: string,
  resolver: ReturnType<typeof createRequire>,
): string | null {
  try {
    return resolver.resolve(`${dependency}/package.json`);
  } catch {
    return null;
  }
}

async function copyRuntimeDependencyTree(
  appRoot: string,
  functionRoot: string,
  rootDependency: string,
): Promise<void> {
  const appRequire = createRequire(path.join(appRoot, "package.json"));
  const resuxPackageRequire = resolveResuxPackageRequire(appRequire);
  const rootResolvers = [appRequire, ...(resuxPackageRequire ? [resuxPackageRequire] : [])];
  const resolutionErrors: string[] = [];
  let rootDependencyPackageJsonPath: string | null = null;
  for (const resolver of rootResolvers) {
    try {
      rootDependencyPackageJsonPath = resolver.resolve(`${rootDependency}/package.json`);
      break;
    } catch (error) {
      resolutionErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (!rootDependencyPackageJsonPath) {
    throw new Error(
      `Resux Vercel image optimizer requires "${rootDependency}" but it could not be resolved from app or framework dependencies. (${resolutionErrors.join(" | ")})`,
    );
  }

  const pending = [{
    dependency: rootDependency,
    packageJsonPath: rootDependencyPackageJsonPath,
  }];
  const copied = new Set<string>();

  while (pending.length > 0) {
    const next = pending.shift();
    if (!next || copied.has(next.dependency)) {
      continue;
    }
    copied.add(next.dependency);

    const sourcePackageJsonPath = next.packageJsonPath;
    const sourcePackageRoot = path.dirname(sourcePackageJsonPath);
    const targetPackageRoot = dependencyTargetPath(functionRoot, next.dependency);
    await rm(targetPackageRoot, { recursive: true, force: true });
    await mkdir(path.dirname(targetPackageRoot), { recursive: true });
    await cp(sourcePackageRoot, targetPackageRoot, {
      recursive: true,
      force: true,
    });

    const packageJson = (await readJsonRecord(sourcePackageJsonPath)) as PackageRecord | null;
    if (!packageJson) {
      continue;
    }

    const dependencyResolver = createRequire(sourcePackageJsonPath);
    for (const dependency of runtimeDependencyNames(packageJson.dependencies)) {
      const dependencyPackageJsonPath = resolveDependencyPackageJsonPath(
        dependency,
        dependencyResolver,
      );
      if (!dependencyPackageJsonPath) {
        throw new Error(
          `Resux Vercel image optimizer dependency "${next.dependency}" is missing required package "${dependency}".`,
        );
      }
      pending.push({ dependency, packageJsonPath: dependencyPackageJsonPath });
    }
    for (const dependency of runtimeDependencyNames(packageJson.optionalDependencies)) {
      const dependencyPackageJsonPath = resolveDependencyPackageJsonPath(
        dependency,
        dependencyResolver,
      );
      if (!dependencyPackageJsonPath) {
        continue;
      }
      pending.push({ dependency, packageJsonPath: dependencyPackageJsonPath });
    }
  }

  const requiredDependencyPath = path.join(
    dependencyTargetPath(functionRoot, rootDependency),
    "package.json",
  );
  if (!(await pathExists(requiredDependencyPath))) {
    throw new Error(
      `Resux Vercel deployment could not prepare "${rootDependency}" for ${functionRoot}.`,
    );
  }
}

async function ensureFunctionImageOptimizerDependencies(
  appRoot: string,
  functionRoots: string[],
): Promise<void> {
  for (const functionRoot of functionRoots) {
    await copyRuntimeDependencyTree(appRoot, functionRoot, "sharp");
  }
}

function isHeaderOnlyRoute(route: BuildOutputRoute): boolean {
  if (!isRecord(route)) {
    return false;
  }

  return (
    typeof route.src === "string"
    && isRecord(route.headers)
    && route.continue !== true
    && route.dest === undefined
    && route.handle === undefined
    && route.status === undefined
    && route.check === undefined
    && route.middlewarePath === undefined
  );
}

function normalizeRoute(route: BuildOutputRoute): BuildOutputRoute {
  if (isHeaderOnlyRoute(route)) {
    return { ...route, continue: true };
  }
  return route;
}

function isRunningInsideVercelContainer(appRoot: string): boolean {
  const normalizedRoot = appRoot.replace(/\\/g, "/");
  if (normalizedRoot.startsWith("/vercel/path")) {
    return true;
  }

  return (
    existsSync("/vercel")
    || existsSync("/vercel/path")
    || existsSync("/vercel/path0")
    || existsSync("/vercel/output")
  );
}

async function detect(context: DeployDetectionContext): Promise<boolean> {
  if (isRunningInsideVercelContainer(context.appRoot)) {
    return true;
  }

  if (context.env.NOW_BUILDER || context.env.VERCEL || context.env.VERCEL_ENV) {
    return true;
  }
  return false;
}

async function materializeLinkedFunctions(functionsDir: string): Promise<void> {
  const entries = await readdir(functionsDir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.name.endsWith(".func")) {
      continue;
    }

    const functionPath = path.join(functionsDir, entry.name);
    const stats = await lstat(functionPath).catch(() => null);
    if (!stats?.isSymbolicLink()) {
      continue;
    }

    const resolvedTarget = await realpath(functionPath).catch(() => null);
    if (!resolvedTarget) {
      continue;
    }

    await rm(functionPath, { recursive: true, force: true });
    await cp(resolvedTarget, functionPath, {
      recursive: true,
      force: true,
    });
  }
}

async function listFunctionDirectories(functionsDir: string): Promise<string[]> {
  const entries = await readdir(functionsDir, { withFileTypes: true }).catch(() => []);
  const functionNames: string[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith(".func")) {
      continue;
    }

    const functionPath = path.join(functionsDir, entry.name);
    if (entry.isDirectory()) {
      functionNames.push(entry.name);
      continue;
    }

    if (!entry.isSymbolicLink()) {
      continue;
    }

    const linkedStats = await stat(functionPath).catch(() => null);
    if (linkedStats?.isDirectory()) {
      functionNames.push(entry.name);
    }
  }

  return functionNames;
}

async function postBuild(context: DeployBuildContext): Promise<void> {
  await ensureResuxClientAssets(context.appRoot, [
    {
      root: path.join(context.appRoot, ".output"),
      target: path.join(context.appRoot, ".output", "public", "__resux"),
    },
    {
      root: path.join(context.appRoot, ".vercel", "output"),
      target: path.join(context.appRoot, ".vercel", "output", "static", "__resux"),
    },
  ]);
  await assertRuntimeClientAsset(path.join(context.appRoot, ".vercel", "output", "static"));

  const outputDir = path.join(context.appRoot, ".vercel", "output");
  const functionsDir = path.join(outputDir, "functions");
  await materializeLinkedFunctions(functionsDir);

  const functionNames = await listFunctionDirectories(functionsDir);
  if (!functionNames.length) {
    throw new Error(
      "Resux vercel deployment output is missing function directories under .vercel/output/functions.",
    );
  }

  const functionRoots = functionNames.map((functionName) =>
    path.join(functionsDir, functionName)
  );
  await ensureResuxServerPayload(
    context.appRoot,
    functionRoots.map((root) => path.join(root, ".resux", "server")),
  );
  await ensureResuxClientAssets(
    context.appRoot,
    functionRoots.map((root) => ({
      root,
      target: path.join(root, ".resux", "client"),
    })),
  );
  await ensureFunctionImageOptimizerDependencies(context.appRoot, functionRoots);
  for (const functionRoot of functionRoots) {
    const manifestPath = path.join(functionRoot, ".resux", "server", "manifest.mjs");
    if (!(await pathExists(manifestPath))) {
      const chunkManifestPath = path.join(functionRoot, "chunks", "raw", "manifest.mjs");
      const hasChunkManifest = await pathExists(chunkManifestPath);
      throw new Error(
        hasChunkManifest
          ? `Resux vercel deployment output is missing ${manifestPath}. Found ${chunkManifestPath} but not the copied Resux server payload. Stop concurrent dev/watch processes, clean .vercel/output, and rerun build.`
          : `Resux vercel deployment output is missing ${manifestPath}.`,
      );
    }
  }

  const defaultFunctionConfig = {
    runtime: resolveVercelNodeRuntime(),
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
  };

  for (const functionRoot of functionRoots) {
    const functionConfigPath = path.join(functionRoot, ".vc-config.json");
    if (!(await pathExists(functionConfigPath))) {
      await writeFile(
        functionConfigPath,
        JSON.stringify(defaultFunctionConfig, null, 2),
        "utf8",
      );
    }
  }

  const outputConfigPath = path.join(outputDir, "config.json");
  const parsedOutputConfig = await readJsonRecord(outputConfigPath);
  const safeOutputConfig = normalizeBuildOutputConfig(parsedOutputConfig ?? {});
  const routes = Array.isArray(safeOutputConfig.routes)
    ? (safeOutputConfig.routes as BuildOutputRoute[]).map(normalizeRoute)
    : [];
  const hasFilesystemRoute = routes.some((route) => route?.handle === "filesystem");
  if (!hasFilesystemRoute) {
    routes.push({ handle: "filesystem" });
  }

  const fallbackFunctionName = resolveFallbackFunctionName(functionNames);
  const hasNativeCatchAllFunction = functionNames.includes("[...].func");
  const hasCatchAllRoute =
    hasNativeCatchAllFunction || routes.some((route) => isCatchAllRouteSrc(route?.src));
  const hasFallbackDest = fallbackFunctionName
    ? routes.some((route) => routeDestIncludesFunctionName(route ?? {}, fallbackFunctionName))
    : false;
  if (fallbackFunctionName && !hasCatchAllRoute && !hasFallbackDest) {
    routes.push({ src: "/(.*)", dest: `/${fallbackFunctionName}` });
  }

  const outputConfig: BuildOutputConfig = {
    ...safeOutputConfig,
    version: 3,
    routes,
  };
  await mkdir(path.dirname(outputConfigPath), { recursive: true });
  await writeJson(outputConfigPath, outputConfig);
}

export const vercelDeployModule: DeployTargetModule = {
  target: "vercel",
  presetAliases: ["vercel", "vercel-edge"],
  outputLabel: ".vercel/output",
  detect,
  inferPreset: () => "vercel",
  postBuild,
};
