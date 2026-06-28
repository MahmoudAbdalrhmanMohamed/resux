import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export interface ReviewContact {
  name: string;
  email: string;
}

export interface ReviewEvidence {
  type: string;
  path: string;
  description: string;
}

export interface StricterRules {
  blockAiChatWithoutModeration?: boolean;
  blockUnmoderatedUserUploads?: boolean;
  [key: string]: boolean | undefined;
}

export interface HalalAIConfig {
  enabled?: boolean;
  strict?: boolean;
  blockProductionBuild?: boolean;
  scanRoutes?: boolean;
  scanMeta?: boolean;
  scanContent?: boolean;
  scanExternalLinks?: boolean;
  scanRuntimeConfig?: boolean;
  scanDependencies?: boolean;
  categories?: Record<string, "block" | "warn" | "review" | "allow">;
}

export interface ResuxHalalPolicy {
  projectName?: string;
  projectType?: string;
  description?: string;
  reviewContact?: ReviewContact;
  stricterRules?: StricterRules;
  additionalBlockedCategories?: string[];
  evidence?: ReviewEvidence[];
  internalTeamNotes?: string;
  halalAI?: HalalAIConfig;
}

const FORBIDDEN_FIELDS = [
  "enabled",
  "mode",
  "ignoreCoreRules",
  "allowBlockedCategories",
  "disableHarmDetection",
  "removeDefaultRules",
  "halalGuard",
];

export function validatePolicyConfig(config: Record<string, any>): ResuxHalalPolicy {
  if (!config) {
    return {};
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (field in config) {
      throw new Error(
        `[resux-halal-core] Invalid configuration field "${field}". You are not permitted to disable, bypass, or weaken the core safety and halal guidelines of ResuxJS.`
      );
    }
  }

  if (config.halalAI) {
    if (config.halalAI.enabled === false) {
      throw new Error(
        `[resux-halal-core] Invalid configuration: "halalAI.enabled" cannot be set to false. You are not permitted to disable, bypass, or weaken the core safety and halal guidelines of ResuxJS.`
      );
    }
  }

  // Basic validation of types
  if (config.projectName && typeof config.projectName !== "string") {
    throw new Error("[resux-halal-core] 'projectName' must be a string.");
  }
  if (config.projectType && typeof config.projectType !== "string") {
    throw new Error("[resux-halal-core] 'projectType' must be a string.");
  }
  if (config.description && typeof config.description !== "string") {
    throw new Error("[resux-halal-core] 'description' must be a string.");
  }

  return config as ResuxHalalPolicy;
}

export async function loadMainResuxConfig(appRoot: string): Promise<Record<string, any>> {
  const possiblePaths = [
    path.join(appRoot, "resux.config.ts"),
    path.join(appRoot, "resux.config.js"),
    path.join(appRoot, "resux.config.mjs"),
  ];

  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        let compiledSource: string;
        if (configPath.endsWith(".ts")) {
          const source = readFileSync(configPath, "utf8");
          const normalized = source.replace(/\bdefineResuxConfig\s*\(/g, "(");
          compiledSource = ts.transpileModule(normalized, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ES2022
            }
          }).outputText;
        } else {
          compiledSource = readFileSync(configPath, "utf8");
        }

        const tempDir = path.join(appRoot, ".resux", "server");
        const fs = await import("node:fs");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, `halal-temp-config-${Date.now()}.mjs`);
        fs.writeFileSync(tempPath, compiledSource, "utf8");

        try {
          const fileUrl = pathToFileURL(tempPath).href;
          const module = await import(fileUrl);
          const config = module.default || module;
          return config;
        } finally {
          try {
            fs.unlinkSync(tempPath);
          } catch {}
        }
      } catch (err: any) {
        console.warn(`[resux-halal-core] Warning: failed to load resux.config.ts for Halal AI check: ${err.message}`);
      }
    }
  }
  return {};
}

export async function loadProjectPolicy(appRoot: string): Promise<ResuxHalalPolicy> {
  const policy: ResuxHalalPolicy = {};

  try {
    const mainConfig = await loadMainResuxConfig(appRoot);
    if (mainConfig.halalAI) {
      policy.halalAI = mainConfig.halalAI;
    }
  } catch (err: any) {
    if (err.message.includes("not permitted to disable")) {
      throw err;
    }
  }

  const possiblePaths = [
    path.join(appRoot, "resux.halal.config.ts"),
    path.join(appRoot, "resux.halal.config.js"),
    path.join(appRoot, "resux.halal.config.mjs"),
  ];

  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        const fileUrl = pathToFileURL(configPath).href;
        const module = await import(fileUrl);
        const config = module.default || module;
        const validated = validatePolicyConfig(config);
        Object.assign(policy, validated);
        break;
      } catch (err: any) {
        throw new Error(`[resux-halal-core] Failed to load halal configuration at ${configPath}: ${err.message}`);
      }
    }
  }

  return validatePolicyConfig(policy);
}
