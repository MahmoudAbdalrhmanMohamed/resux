import path from "node:path";
import { ensureResuxClientAssets } from "./common.js";
import type { DeployBuildContext, DeployTargetModule } from "./types.js";

async function postBuild(context: DeployBuildContext): Promise<void> {
  await ensureResuxClientAssets(context.appRoot, [
    {
      root: path.join(context.appRoot, ".output"),
      target: path.join(context.appRoot, ".output", "public", "__resux"),
    },
  ]);
}

export const nodeDeployModule: DeployTargetModule = {
  target: "node",
  presetAliases: ["node-server", "node", "node_cluster", "node-cluster"],
  outputLabel: ".output",
  inferPreset: () => "node-server",
  postBuild,
};

