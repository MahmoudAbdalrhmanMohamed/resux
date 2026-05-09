import { existsSync } from "node:fs";
import { cp, lstat, mkdir, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SUPPORTED_NODE_VERSIONS = [18, 20, 22] as const;

type BuildOutputRoute = Record<string, unknown>;

interface BuildOutputConfig extends Record<string, unknown> {
  version?: unknown;
  routes?: unknown;
}

interface VercelProjectConfig extends Record<string, unknown> {
  framework?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function parseMajorNodeVersion(version: string): number {
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isNaN(major) ? 22 : major;
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

async function readJsonRecord(file: string): Promise<Record<string, unknown> | null> {
  const raw = await readFile(file, "utf8").catch(() => null);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
  return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
      force: true
    });
  }
}

async function isNitroVercelProject(appRoot: string): Promise<boolean> {
  const vercelConfigPath = path.join(appRoot, "vercel.json");
  const config = (await readJsonRecord(vercelConfigPath)) as VercelProjectConfig | null;
  if (!config) {
    return false;
  }

  const framework = typeof config.framework === "string" ? config.framework.trim().toLowerCase() : "";
  return framework === "nitro";
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

export async function shouldPreferVercelPreset(
  appRoot: string,
  _env: NodeJS.ProcessEnv,
): Promise<boolean> {
  if (isRunningInsideVercelContainer(appRoot)) {
    return true;
  }

  return isNitroVercelProject(appRoot);
}

export async function patchNitroPublicClientAssets(appRoot: string): Promise<void> {
  const resuxClientDir = path.join(appRoot, ".resux", "client");
  if (!(await pathExists(resuxClientDir))) {
    return;
  }

  const publicTargets = [
    {
      root: path.join(appRoot, ".output"),
      target: path.join(appRoot, ".output", "public", "__resux")
    },
    {
      root: path.join(appRoot, ".vercel", "output"),
      target: path.join(appRoot, ".vercel", "output", "static", "__resux")
    }
  ];

  for (const { root, target } of publicTargets) {
    if (!(await pathExists(root))) {
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    await cp(resuxClientDir, target, {
      recursive: true,
      force: true
    });
  }
}

export async function patchVercelBuildOutput(appRoot: string): Promise<void> {
  const outputDir = path.join(appRoot, ".vercel", "output");
  const functionsDir = path.join(outputDir, "functions");
  await materializeLinkedFunctions(functionsDir);
  const functionNames: string[] = await readdir(functionsDir, { withFileTypes: true })
    .then((entries) =>
      entries
        .filter((entry) => entry.isDirectory() && entry.name.endsWith(".func"))
        .map((entry) => entry.name),
    )
    .catch((): string[] => []);

  if (!functionNames.length) {
    return;
  }

  const resuxServerDir = path.join(appRoot, ".resux", "server");
  const resuxClientDir = path.join(appRoot, ".resux", "client");
  const hasResuxServer = await pathExists(resuxServerDir);
  const hasResuxClient = await pathExists(resuxClientDir);
  const defaultFunctionConfig = {
    runtime: resolveVercelNodeRuntime(),
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
    supportsResponseStreaming: true
  };

  for (const functionName of functionNames) {
    const functionDir = path.join(functionsDir, functionName);

    if (hasResuxServer) {
      await cp(resuxServerDir, path.join(functionDir, ".resux", "server"), {
        recursive: true,
        force: true
      });
    }

    if (hasResuxClient) {
      await cp(resuxClientDir, path.join(functionDir, ".resux", "client"), {
        recursive: true,
        force: true
      });
    }

    const functionConfigPath = path.join(functionDir, ".vc-config.json");
    if (!(await pathExists(functionConfigPath))) {
      await writeFile(
        functionConfigPath,
        JSON.stringify(defaultFunctionConfig, null, 2),
        "utf8",
      );
    }
  }

  const outputConfigPath = path.join(outputDir, "config.json");
  const parsedOutputConfig = await readFile(outputConfigPath, "utf8")
    .then((contents): unknown => JSON.parse(contents))
    .catch((): unknown => ({}));
  const safeOutputConfig = normalizeBuildOutputConfig(parsedOutputConfig);
  const routes = Array.isArray(safeOutputConfig.routes)
    ? [...safeOutputConfig.routes as BuildOutputRoute[]]
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
    routes
  };
  await writeFile(outputConfigPath, JSON.stringify(outputConfig, null, 2), "utf8");
}
