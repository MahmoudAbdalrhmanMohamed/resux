import { resolveResuxConfig, type ResuxResolvedConfig } from "./config.js";
import { createResuxHooks, type ResuxHooks } from "./hooks.js";
import { ResuxModuleContainer } from "./module-container.js";

export interface ResuxCoreOptions {
  rootDir: string;
  buildDir: string;
  config: Record<string, unknown>;
}

export interface ResuxCoreApp {
  rootDir: string;
  buildDir: string;
  options: ResuxResolvedConfig;
  hooks: ResuxHooks;
  hook: ResuxHooks["hook"];
  callHook: ResuxHooks["callHook"];
  modules: ResuxModuleContainer;
}

export function createResux(options: ResuxCoreOptions): ResuxCoreApp {
  const hooks = createResuxHooks();
  const resolved = resolveResuxConfig(options.config);
  const modules = new ResuxModuleContainer();
  return {
    rootDir: options.rootDir,
    buildDir: options.buildDir,
    options: resolved,
    hooks,
    hook: hooks.hook.bind(hooks),
    callHook: hooks.callHook.bind(hooks),
    modules
  };
}
