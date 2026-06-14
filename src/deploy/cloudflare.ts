import path from "node:path";
import { assertRuntimeClientAsset, ensureResuxClientAssets, pathExists } from "./common.js";
import type {
  DeployBuildContext,
  DeployDetectionContext,
  DeployTargetModule,
} from "./types.js";

async function detect(context: DeployDetectionContext): Promise<boolean> {
  if (context.env.CF_PAGES || context.env.CLOUDFLARE_PAGES || context.env.WORKERS_CI) {
    return true;
  }

  return (
    (await pathExists(path.join(context.appRoot, "wrangler.toml")))
    || (await pathExists(path.join(context.appRoot, "wrangler.json")))
    || (await pathExists(path.join(context.appRoot, "wrangler.jsonc")))
  );
}

function inferPreset(context: DeployDetectionContext): string {
  if (context.env.CF_PAGES || context.env.CLOUDFLARE_PAGES) {
    return "cloudflare-pages";
  }
  return "cloudflare-module";
}

async function postBuild(context: DeployBuildContext): Promise<void> {
  await ensureResuxClientAssets(context.appRoot, [
    {
      root: path.join(context.appRoot, ".output", "public"),
      target: path.join(context.appRoot, ".output", "public", "__resux"),
    },
    {
      root: path.join(context.appRoot, "dist"),
      target: path.join(context.appRoot, "dist", "__resux"),
    },
  ]);

  if (await pathExists(path.join(context.appRoot, ".output", "public"))) {
    await assertRuntimeClientAsset(path.join(context.appRoot, ".output", "public"));
  } else if (await pathExists(path.join(context.appRoot, "dist"))) {
    await assertRuntimeClientAsset(path.join(context.appRoot, "dist"));
  }
}

export const cloudflareDeployModule: DeployTargetModule = {
  target: "cloudflare",
  presetAliases: ["cloudflare", "cloudflare-pages", "cloudflare-module", "cloudflare-worker"],
  outputLabel: "dist",
  detect,
  inferPreset,
  postBuild,
};
