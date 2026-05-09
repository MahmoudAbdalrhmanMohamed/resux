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

export const staticDeployModule: DeployTargetModule = {
  target: "static",
  presetAliases: ["static", "_static"],
  outputLabel: ".output/public",
  inferPreset: () => "static",
  postBuild,
};

