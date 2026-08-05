import { promises as fsPromises } from "node:fs";
import { readFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import * as implementation from "./implementation.js";
import {
  normalizeResuxSfcSource,
  rethrowWithResuxDirectiveBrand,
} from "./directives.js";
import type { BuildOptions, BuildResult, CompiledComponent } from "./implementation.js";

export * from "./implementation.js";
export { normalizeResuxDirectiveSyntax, normalizeResuxSfcSource } from "./directives.js";

export function compileVueSource(
  source: string,
  options: { file: string; id: string; name: string },
): CompiledComponent {
  const usesResuxDirectives = source.includes("rx-");

  try {
    return implementation.compileVueSource(
      normalizeResuxSfcSource(source, options.file),
      options,
    );
  } catch (error) {
    if (usesResuxDirectives) {
      return rethrowWithResuxDirectiveBrand(error);
    }
    throw error;
  }
}

export async function compileVueFile(
  file: string,
  options: { id: string; name?: string },
): Promise<CompiledComponent> {
  const source = await readFile(file, "utf8");
  return compileVueSource(source, {
    file,
    id: options.id,
    name: options.name ?? pascalCase(path.basename(file, ".vue")),
  });
}

let buildQueue: Promise<void> = Promise.resolve();

export function buildProject(
  appRoot: string,
  outDir?: string,
  options?: BuildOptions,
): Promise<BuildResult> {
  return enqueueBuild(async () => {
    try {
      return await withResuxDirectiveFileReads(() => (
        implementation.buildProject(appRoot, outDir, options)
      ));
    } catch (error) {
      return rethrowWithResuxDirectiveBrand(error);
    }
  });
}

function enqueueBuild<T>(task: () => Promise<T>): Promise<T> {
  const run = buildQueue.then(task, task);
  buildQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function withResuxDirectiveFileReads<T>(task: () => Promise<T>): Promise<T> {
  const mutableFs = fsPromises as typeof fsPromises & { readFile: typeof fsPromises.readFile };
  const originalReadFile = mutableFs.readFile;

  mutableFs.readFile = (async (...args: Parameters<typeof originalReadFile>) => {
    const result = await originalReadFile(...args);
    const file = args[0];
    const filename = typeof file === "string"
      ? file
      : file instanceof URL
        ? file.pathname
        : Buffer.isBuffer(file)
          ? file.toString()
          : String(file);

    if (!filename.toLowerCase().endsWith(".vue")) {
      return result;
    }

    if (typeof result === "string") {
      return normalizeResuxSfcSource(result, filename);
    }

    if (Buffer.isBuffer(result)) {
      return Buffer.from(normalizeResuxSfcSource(result.toString("utf8"), filename), "utf8");
    }

    return result;
  }) as typeof originalReadFile;

  syncBuiltinESMExports();

  try {
    return await task();
  } finally {
    mutableFs.readFile = originalReadFile;
    syncBuiltinESMExports();
  }
}

function pascalCase(value: string): string {
  return value
    .replace(/\[[^\]]+\]/g, (match) => match.slice(1, -1))
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
