import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  ensureResuxClientAssets,
  ensureResuxServerPayload,
  pathExists,
} from "./common.js";
import type {
  DeployBuildContext,
  DeployDetectionContext,
  DeployTargetModule,
} from "./types.js";

async function detect(context: DeployDetectionContext): Promise<boolean> {
  if (context.env.NETLIFY && !context.env.NETLIFY_LOCAL) {
    return true;
  }

  return pathExists(path.join(context.appRoot, "netlify.toml"));
}

async function listInternalFunctionRoots(appRoot: string): Promise<string[]> {
  const functionsInternalDir = path.join(appRoot, ".netlify", "functions-internal");
  const entries = await readdir(functionsInternalDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(functionsInternalDir, entry.name));
}

async function postBuild(context: DeployBuildContext): Promise<void> {
  await ensureResuxClientAssets(context.appRoot, [
    {
      root: path.join(context.appRoot, "dist"),
      target: path.join(context.appRoot, "dist", "__resux"),
    },
    {
      root: path.join(context.appRoot, ".output"),
      target: path.join(context.appRoot, ".output", "public", "__resux"),
    },
  ]);

  const functionRoots = await listInternalFunctionRoots(context.appRoot);
  const payloadTargets = functionRoots.map((functionRoot) =>
    path.join(functionRoot, ".resux", "server")
  );
  await ensureResuxServerPayload(context.appRoot, payloadTargets);
}

export const netlifyDeployModule: DeployTargetModule = {
  target: "netlify",
  presetAliases: ["netlify", "netlify_builder", "netlify-builder", "netlify-edge"],
  outputLabel: "dist + .netlify/functions-internal",
  detect,
  inferPreset: () => "netlify",
  postBuild,
};

