import { cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathExists, readJsonRecord } from "./common.js";

interface PackageRecord extends Record<string, unknown> {
  name?: unknown;
}

async function findPackageJsonFromEntry(
  packageName: string,
  entryPath: string,
): Promise<string | null> {
  let currentDirectory = path.dirname(entryPath);

  while (true) {
    const candidate = path.join(currentDirectory, "package.json");
    const packageJson = (await readJsonRecord(candidate)) as PackageRecord | null;
    if (packageJson?.name === packageName) {
      return candidate;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }
    currentDirectory = parentDirectory;
  }
}

async function resolvePackageJsonPath(
  appRoot: string,
  packageName: string,
): Promise<string> {
  const resolver = createRequire(path.join(appRoot, "package.json"));

  try {
    return resolver.resolve(`${packageName}/package.json`);
  } catch {
    const entryPath = resolver.resolve(packageName);
    const packageJsonPath = await findPackageJsonFromEntry(packageName, entryPath);
    if (packageJsonPath) {
      return packageJsonPath;
    }
    throw new Error(
      `Resux deployment could resolve "${packageName}" to ${entryPath}, but could not locate its package root.`,
    );
  }
}

export async function ensureResuxFrameworkRuntime(
  appRoot: string,
  runtimeRoots: string[],
): Promise<void> {
  if (!runtimeRoots.length) {
    return;
  }

  const packageJsonPath = await resolvePackageJsonPath(appRoot, "resuxjs");
  const packageRoot = path.dirname(packageJsonPath);
  const distRoot = path.join(packageRoot, "dist");
  if (!(await pathExists(distRoot))) {
    throw new Error(
      `Resux deployment resolved resuxjs at ${packageRoot}, but its dist runtime is missing.`,
    );
  }

  for (const runtimeRoot of runtimeRoots) {
    const targetRoot = path.join(runtimeRoot, "node_modules", "resuxjs");
    await rm(targetRoot, { recursive: true, force: true });
    await mkdir(targetRoot, { recursive: true });
    await cp(packageJsonPath, path.join(targetRoot, "package.json"), { force: true });
    await cp(distRoot, path.join(targetRoot, "dist"), {
      recursive: true,
      force: true,
      dereference: true,
    });
  }
}
