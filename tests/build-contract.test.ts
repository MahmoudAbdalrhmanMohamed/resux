import { describe, expect, it } from "vitest";
import {
  RESUX_BUILD_CONTRACT_VERSION,
  RESUX_BUILD_MODULES,
  createResuxBuildContract,
} from "../src/build/index.js";

describe("Resux build contract", () => {
  it("keeps stable module specifiers independent of the builder", () => {
    const contract = createResuxBuildContract(".resux/");
    expect(contract.version).toBe(RESUX_BUILD_CONTRACT_VERSION);
    expect(contract.buildDir).toBe(".resux");
    expect(contract.artifacts.serverEntry.specifier).toBe(RESUX_BUILD_MODULES.serverEntry);
    expect(contract.artifacts.resumeManifest.file).toBe(".resux/contract/resume-manifest.mjs");
    expect(contract.artifacts.routeResources.specifier).toBe("resux/route-resources");
    expect(contract.artifacts.routeResources.file).toBe(".resux/contract/route-resources.mjs");
  });
});
