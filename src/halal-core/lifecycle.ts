import { enforceDevGuard, enforceBuildGuard } from "./enforce.js";

export function registerHalalCoreHooks(hooks: any, appRoot: string, outDir: string) {
  if (!hooks) return;

  // Hook into build:before or compile:before lifecycle
  if (typeof hooks.hook === "function") {
    hooks.hook("build:before", async () => {
      await enforceBuildGuard(appRoot, outDir);
    });
    hooks.hook("dev:before", async () => {
      await enforceDevGuard(appRoot, outDir);
    });
  }
}
