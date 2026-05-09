export type ResuxDeployTarget =
  | "auto"
  | "node"
  | "vercel"
  | "netlify"
  | "cloudflare"
  | "static";

export type ResuxResolvedDeployTarget = Exclude<ResuxDeployTarget, "auto">;

export interface ResuxDeployConfig {
  target?: ResuxDeployTarget;
  nitroPreset?: string;
}

export interface DeployBuildContext {
  appRoot: string;
  outDir: string;
  env: NodeJS.ProcessEnv;
  nitroPreset: string | null;
  target: ResuxResolvedDeployTarget;
}

export interface DeployDetectionContext {
  appRoot: string;
  outDir: string;
  env: NodeJS.ProcessEnv;
  explicitNitroPreset: string | null;
  deployConfig: ResuxDeployConfig;
}

export interface DeployTargetModule {
  target: ResuxResolvedDeployTarget;
  presetAliases: string[];
  outputLabel: string;
  detect?(context: DeployDetectionContext): Promise<boolean>;
  inferPreset?(context: DeployDetectionContext): string | null;
  postBuild?(context: DeployBuildContext): Promise<void>;
}

export interface DeploymentResolution {
  target: ResuxResolvedDeployTarget;
  nitroPreset: string | null;
  outputLabel: string;
  reason: string;
}
