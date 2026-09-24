import { lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";

export function isPathWithinBoundary(boundary: string, target: string): boolean {
  const absoluteBoundary = path.resolve(boundary);
  const absoluteTarget = path.resolve(target);
  const relative = path.relative(absoluteBoundary, absoluteTarget);
  return relative === ""
    || (
      relative !== ".."
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative)
    );
}

export function resolveRequestPathWithinBoundary(
  base: string,
  boundary: string,
  pathname: string,
): string | null {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const resolved = path.resolve(base, `.${decodedPath}`);
  return isPathWithinBoundary(boundary, resolved) ? resolved : null;
}

export async function isRealPathWithinBoundary(
  boundary: string,
  target: string,
): Promise<boolean> {
  try {
    const [realBoundary, realTarget] = await Promise.all([
      realpath(boundary),
      realpath(target),
    ]);
    return isPathWithinBoundary(realBoundary, realTarget);
  } catch {
    return false;
  }
}


async function lstatIfExists(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export async function prepareSafeFileWriteWithinBoundary(
  boundary: string,
  target: string,
): Promise<string> {
  const absoluteBoundary = path.resolve(boundary);
  const absoluteTarget = path.resolve(target);
  if (!isPathWithinBoundary(absoluteBoundary, absoluteTarget)) {
    throw new Error("Refusing to write outside the configured filesystem boundary.");
  }

  const realBoundary = await realpath(absoluteBoundary);
  const relativeTarget = path.relative(absoluteBoundary, absoluteTarget);
  const safeTarget = path.resolve(realBoundary, relativeTarget);
  if (!isPathWithinBoundary(realBoundary, safeTarget)) {
    throw new Error("Refusing to write outside the configured filesystem boundary.");
  }

  const parent = path.dirname(safeTarget);
  const relativeParent = path.relative(realBoundary, parent);
  let current = realBoundary;

  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stats = await lstatIfExists(current);
    if (!stats) {
      try {
        await mkdir(current);
      } catch (error) {
        if (
          !(error instanceof Error)
          || !("code" in error)
          || (error as NodeJS.ErrnoException).code !== "EEXIST"
        ) {
          throw error;
        }
      }
      stats = await lstat(current);
    }
    if (stats.isSymbolicLink()) {
      throw new Error("Refusing to write through a symbolic link.");
    }
    if (!stats.isDirectory()) {
      throw new Error("Refusing to write through a non-directory path component.");
    }
  }

  const realParent = await realpath(parent);
  if (!isPathWithinBoundary(realBoundary, realParent)) {
    throw new Error("Refusing to write outside the configured filesystem boundary.");
  }

  const targetStats = await lstatIfExists(safeTarget);
  if (targetStats?.isSymbolicLink()) {
    throw new Error("Refusing to overwrite a symbolic link.");
  }
  if (targetStats && !targetStats.isFile()) {
    throw new Error("Refusing to overwrite a non-file filesystem entry.");
  }

  return safeTarget;
}
