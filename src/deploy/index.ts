import path from "node:path";
import {
  detectDeployProviderFromEnv,
  loadResuxDeployConfig,
  normalizeProviderPreset,
  readJsonRecord,
} from "./common.js";
import { cloudflareDeployModule } from "./cloudflare.js";
import { netlifyDeployModule } from "./netlify.js";
import { nodeDeployModule } from "./node.js";
import { staticDeployModule } from "./static.js";
import type {
  DeployBuildContext,
  DeployDetectionContext,
  DeploymentResolution,
  DeployTargetModule,
  ResuxResolvedDeployTarget,
} from "./types.js";
import { vercelDeployModule } from "./vercel.js";

const deployModules: DeployTargetModule[] = [
  vercelDeployModule,
  netlifyDeployModule,
  cloudflareDeployModule,
  staticDeployModule,
  nodeDeployModule,
];

const moduleByTarget = new Map<ResuxResolvedDeployTarget, DeployTargetModule>(
  deployModules.map((module) => [module.target, module]),
);

function moduleFromPreset(preset: string): DeployTargetModule | null {
  const normalized = preset.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return deployModules.find((module) =>
    module.presetAliases.some((alias) => alias === normalized)
  ) ?? null;
}

function moduleFromPackageScripts(scripts: Record<string, unknown>): DeployTargetModule | null {
  const joined = Object.values(scripts).map((value) => String(value).toLowerCase()).join("\n");
  if (joined.includes("vercel")) {
    return vercelDeployModule;
  }
  if (joined.includes("netlify")) {
    return netlifyDeployModule;
  }
  if (joined.includes("cloudflare") || joined.includes("wrangler")) {
    return cloudflareDeployModule;
  }
  if (joined.includes("nitro") && joined.includes("static")) {
    return staticDeployModule;
  }
  return null;
}

async function detectTargetFromPackageConfig(appRoot: string): Promise<DeployTargetModule | null> {
  const packageJson = await readJsonRecord(path.join(appRoot, "package.json"));
  if (!packageJson) {
    return null;
  }

  const scripts = packageJson.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    return null;
  }

  return moduleFromPackageScripts(scripts as Record<string, unknown>);
}

function buildDetectionContext(
  appRoot: string,
  outDir: string,
  env: NodeJS.ProcessEnv,
  explicitNitroPreset: string | null,
  deployConfig: DeployDetectionContext["deployConfig"],
): DeployDetectionContext {
  return {
    appRoot,
    outDir,
    env,
    explicitNitroPreset,
    deployConfig,
  };
}

function resolveModuleFromTarget(target: string | undefined): DeployTargetModule | null {
  if (!target || target === "auto") {
    return null;
  }
  return moduleByTarget.get(target as ResuxResolvedDeployTarget) ?? null;
}

function readExplicitNitroPreset(
  env: NodeJS.ProcessEnv,
  configPreset: string | undefined,
): string | null {
  const envPreset = (env.NITRO_PRESET ?? env.RESUX_NITRO_PRESET)?.trim();
  if (envPreset) {
    return envPreset;
  }
  const normalizedConfigPreset = configPreset?.trim();
  return normalizedConfigPreset || null;
}

function createResolution(
  module: DeployTargetModule,
  nitroPreset: string | null,
  reason: string,
): DeploymentResolution {
  return {
    target: module.target,
    nitroPreset,
    outputLabel: module.outputLabel,
    reason,
  };
}

export async function resolveDeployment(
  appRoot: string,
  outDir: string,
  env: NodeJS.ProcessEnv,
): Promise<DeploymentResolution> {
  const deployConfig = await loadResuxDeployConfig(appRoot, outDir);
  const explicitNitroPreset = readExplicitNitroPreset(env, deployConfig.nitroPreset);
  const detectionContext = buildDetectionContext(
    appRoot,
    outDir,
    env,
    explicitNitroPreset,
    deployConfig,
  );

  if (explicitNitroPreset) {
    const presetModule = moduleFromPreset(explicitNitroPreset);
    if (presetModule) {
      return createResolution(
        presetModule,
        explicitNitroPreset,
        "explicit Nitro preset",
      );
    }
  }

  const configuredTargetModule = resolveModuleFromTarget(deployConfig.target);
  if (configuredTargetModule) {
    const configuredPreset =
      deployConfig.nitroPreset
      ?? configuredTargetModule.inferPreset?.(detectionContext)
      ?? null;
    return createResolution(
      configuredTargetModule,
      configuredPreset,
      "resux.config deploy.target",
    );
  }

  const provider = detectDeployProviderFromEnv(env);
  if (provider) {
    const providerPreset = normalizeProviderPreset(provider);
    const providerModule = moduleFromPreset(providerPreset);
    if (providerModule) {
      if (providerModule.target === "cloudflare" && deployConfig.target !== "cloudflare") {
        // Cloudflare worker presets need an edge-compatible app handler.
        // Keep auto mode on node fallback unless the app explicitly opts in.
      } else {
      return createResolution(
        providerModule,
        providerPreset,
        `environment provider (${provider})`,
      );
      }
    }
  }

  for (const module of deployModules) {
    if (module.target === "cloudflare" && deployConfig.target !== "cloudflare") {
      continue;
    }
    if (!(await module.detect?.(detectionContext))) {
      continue;
    }
    const inferredPreset = module.inferPreset?.(detectionContext) ?? null;
    return createResolution(module, inferredPreset, `${module.target} project detection`);
  }

  const packageDetectedModule = await detectTargetFromPackageConfig(appRoot);
  if (packageDetectedModule) {
    const inferredPreset = packageDetectedModule.inferPreset?.(detectionContext) ?? null;
    return createResolution(
      packageDetectedModule,
      inferredPreset,
      "package.json scripts",
    );
  }

  const fallbackPreset = nodeDeployModule.inferPreset?.(detectionContext) ?? null;
  return createResolution(nodeDeployModule, fallbackPreset, "default node target");
}

export async function applyDeploymentPostBuild(context: DeployBuildContext): Promise<void> {
  const module = moduleByTarget.get(context.target);
  await module?.postBuild?.(context);
}
