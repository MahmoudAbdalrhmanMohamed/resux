import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { builtinModules, createRequire } from "node:module";
import path from "node:path";
import { pathExists, readJsonRecord } from "./common.js";

interface PackageRecord extends Record<string, unknown> {
  name?: unknown;
  dependencies?: unknown;
  optionalDependencies?: unknown;
  peerDependencies?: unknown;
  peerDependenciesMeta?: unknown;
}

const nodeBuiltins = new Set(
  builtinModules.flatMap((name) => [
    name,
    name.startsWith("node:") ? name.slice(5) : `node:${name}`,
  ]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runtimeDependencyNames(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  return Object.keys(value).filter((name) => name.trim().length > 0);
}

function dependencyTargetPath(runtimeRoot: string, packageName: string): string {
  return path.join(runtimeRoot, "node_modules", ...packageName.split("/"));
}

function packageNameFromSpecifier(specifier: string): string | null {
  if (
    !specifier
    || specifier.startsWith(".")
    || specifier.startsWith("/")
    || specifier.startsWith("#")
    || specifier.startsWith("data:")
    || specifier.startsWith("file:")
    || nodeBuiltins.has(specifier)
  ) {
    return null;
  }

  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return scope && name ? `${scope}/${name}` : null;
  }

  const packageName = specifier.split("/")[0] ?? "";
  return packageName && !nodeBuiltins.has(packageName) ? packageName : null;
}

async function walkRuntimeModuleFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkRuntimeModuleFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && /\.(?:mjs|cjs|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function collectServerRuntimeDependencyNames(
  serverRoot: string,
): Promise<string[]> {
  if (!(await pathExists(serverRoot))) {
    return [];
  }

  const dependencyNames = new Set<string>();
  const patterns = [
    /\b(?:import|export)\s+[\s\S]*?\sfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const file of await walkRuntimeModuleFiles(serverRoot)) {
    const source = await readFile(file, "utf8");
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
        const packageName = packageNameFromSpecifier(match[1] ?? "");
        if (packageName && packageName !== "resuxjs" && packageName !== "resux") {
          dependencyNames.add(packageName);
        }
      }
    }
  }

  return [...dependencyNames].sort();
}

function resolveResuxPackageRequire(
  appRequire: ReturnType<typeof createRequire>,
): ReturnType<typeof createRequire> | null {
  for (const packageName of ["resuxjs", "resux"]) {
    try {
      return createRequire(appRequire.resolve(packageName));
    } catch {
      try {
        return createRequire(appRequire.resolve(`${packageName}/package.json`));
      } catch {
        // Keep trying known package names.
      }
    }
  }
  return null;
}

function formatResolutionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function findPackageJsonFromEntry(
  dependency: string,
  entryPath: string,
): Promise<string | null> {
  let currentDirectory = path.dirname(entryPath);

  while (true) {
    const candidate = path.join(currentDirectory, "package.json");
    const packageJson = (await readJsonRecord(candidate)) as PackageRecord | null;
    if (packageJson?.name === dependency) {
      return candidate;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }
    currentDirectory = parentDirectory;
  }
}

async function findPackageJsonFromSearchPaths(
  dependency: string,
  resolver: ReturnType<typeof createRequire>,
): Promise<string | null> {
  const searchPaths = resolver.resolve.paths(dependency) ?? [];
  for (const nodeModulesRoot of searchPaths) {
    const candidate = path.join(
      nodeModulesRoot,
      ...dependency.split("/"),
      "package.json",
    );
    const packageJson = (await readJsonRecord(candidate)) as PackageRecord | null;
    if (packageJson?.name === dependency) {
      return candidate;
    }
  }
  return null;
}

async function resolveDependencyPackageJsonPath(
  dependency: string,
  resolver: ReturnType<typeof createRequire>,
  resolutionErrors?: string[],
): Promise<string | null> {
  let entryResolutionError: unknown = null;
  try {
    const entryPath = resolver.resolve(dependency);
    const packageJsonPath = await findPackageJsonFromEntry(dependency, entryPath);
    if (packageJsonPath) {
      return packageJsonPath;
    }
    entryResolutionError = new Error(
      `Resolved "${dependency}" to ${entryPath}, but its package root could not be located.`,
    );
  } catch (error) {
    entryResolutionError = error;
  }

  // Native packages such as @img/sharp-linux-x64 intentionally expose only
  // specific subpaths, so neither the package root nor ./package.json is
  // necessarily resolvable through exports. Node still exposes the node_modules
  // lookup roots; inspect those roots directly without bypassing package identity.
  const searchPathPackageJson = await findPackageJsonFromSearchPaths(dependency, resolver);
  if (searchPathPackageJson) {
    return searchPathPackageJson;
  }

  // Preserve compatibility with packages that explicitly export package.json.
  try {
    return resolver.resolve(`${dependency}/package.json`);
  } catch (packageJsonError) {
    resolutionErrors?.push(
      `${formatResolutionError(entryResolutionError)} | ${formatResolutionError(packageJsonError)}`,
    );
    return null;
  }
}

export async function copyRuntimeDependencyTree(
  appRoot: string,
  runtimeRoot: string,
  rootDependency: string,
  consumerLabel: string,
): Promise<void> {
  const appRequire = createRequire(path.join(appRoot, "package.json"));
  const resuxPackageRequire = resolveResuxPackageRequire(appRequire);
  const rootResolvers = [appRequire, ...(resuxPackageRequire ? [resuxPackageRequire] : [])];
  const resolutionErrors: string[] = [];
  let rootDependencyPackageJsonPath: string | null = null;

  for (const resolver of rootResolvers) {
    rootDependencyPackageJsonPath = await resolveDependencyPackageJsonPath(
      rootDependency,
      resolver,
      resolutionErrors,
    );
    if (rootDependencyPackageJsonPath) {
      break;
    }
  }

  if (!rootDependencyPackageJsonPath) {
    throw new Error(
      `${consumerLabel} requires "${rootDependency}" but it could not be resolved from app or framework dependencies. (${resolutionErrors.join(" | ")})`,
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
    const targetPackageRoot = dependencyTargetPath(runtimeRoot, next.dependency);

    await rm(targetPackageRoot, { recursive: true, force: true });
    await mkdir(path.dirname(targetPackageRoot), { recursive: true });
    await cp(sourcePackageRoot, targetPackageRoot, {
      recursive: true,
      force: true,
      dereference: true,
    });

    const packageJson = (await readJsonRecord(sourcePackageJsonPath)) as PackageRecord | null;
    if (!packageJson) {
      continue;
    }

    const dependencyResolver = createRequire(sourcePackageJsonPath);
    for (const dependency of runtimeDependencyNames(packageJson.dependencies)) {
      const dependencyPackageJsonPath = await resolveDependencyPackageJsonPath(
        dependency,
        dependencyResolver,
      );
      if (!dependencyPackageJsonPath) {
        throw new Error(
          `${consumerLabel} dependency "${next.dependency}" is missing required package "${dependency}".`,
        );
      }
      pending.push({ dependency, packageJsonPath: dependencyPackageJsonPath });
    }

    for (const dependency of runtimeDependencyNames(packageJson.optionalDependencies)) {
      const dependencyPackageJsonPath = await resolveDependencyPackageJsonPath(
        dependency,
        dependencyResolver,
      );
      if (!dependencyPackageJsonPath) {
        continue;
      }
      pending.push({ dependency, packageJsonPath: dependencyPackageJsonPath });
    }

    // Peer dependencies are runtime requirements supplied by the consuming app
    // rather than nested package dependencies. Include installed peers in the
    // serverless closure, but do not fail packaging when an optional/uninstalled
    // peer is intentionally absent. This mirrors Node's runtime resolution model
    // without treating peer declarations as unconditional npm package imports.
    for (const dependency of runtimeDependencyNames(packageJson.peerDependencies)) {
      const dependencyPackageJsonPath = await resolveDependencyPackageJsonPath(
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
    dependencyTargetPath(runtimeRoot, rootDependency),
    "package.json",
  );
  if (!(await pathExists(requiredDependencyPath))) {
    throw new Error(
      `${consumerLabel} could not prepare "${rootDependency}" for ${runtimeRoot}.`,
    );
  }
}

export async function ensureRuntimeDependencyTrees(
  appRoot: string,
  runtimeRoots: string[],
  rootDependency: string,
  consumerLabel: string,
): Promise<void> {
  for (const runtimeRoot of runtimeRoots) {
    await copyRuntimeDependencyTree(
      appRoot,
      runtimeRoot,
      rootDependency,
      consumerLabel,
    );
  }
}

export async function ensureServerRuntimeDependencyTrees(
  appRoot: string,
  serverRoot: string,
  runtimeRoots: string[],
  consumerLabel: string,
): Promise<string[]> {
  const dependencies = await collectServerRuntimeDependencyNames(serverRoot);
  for (const dependency of dependencies) {
    await ensureRuntimeDependencyTrees(
      appRoot,
      runtimeRoots,
      dependency,
      `${consumerLabel} server runtime`,
    );
  }
  return dependencies;
}