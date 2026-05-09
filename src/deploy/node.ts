import path from "node:path";
import {
  assertResuxServerManifest,
  assertRuntimeClientAsset,
  ensureResuxClientAssets,
  pathExists,
} from "./common.js";
import type { DeployBuildContext, DeployTargetModule } from "./types.js";

async function postBuild(context: DeployBuildContext): Promise<void> {
  await ensureResuxClientAssets(context.appRoot, [
    {
      root: path.join(context.appRoot, ".output"),
      target: path.join(context.appRoot, ".output", "public", "__resux"),
    },
  ]);

  await assertResuxServerManifest(context.appRoot);
  await assertRuntimeClientAsset(path.join(context.appRoot, ".output", "public"));
  const serverEntry = path.join(context.appRoot, ".output", "server", "index.mjs");
  if (!(await pathExists(serverEntry))) {
    throw new Error("Resux node deployment output is missing .output/server/index.mjs.");
  }
}

export const nodeDeployModule: DeployTargetModule = {
  target: "node",
  presetAliases: ["node-server", "node", "node_cluster", "node-cluster"],
  outputLabel: ".output",
  inferPreset: () => "node-server",
  postBuild,
};
