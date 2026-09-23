import { realpath } from "node:fs/promises";
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
