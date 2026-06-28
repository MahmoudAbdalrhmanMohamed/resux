import { validatePolicyConfig, type ResuxHalalPolicy } from "./config.js";

export function defineResuxHalalPolicy(config: ResuxHalalPolicy): ResuxHalalPolicy {
  return validatePolicyConfig(config);
}
