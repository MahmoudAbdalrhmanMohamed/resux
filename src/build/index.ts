export const RESUX_BUILD_CONTRACT_VERSION = 1 as const;

export const RESUX_BUILD_MODULES = {
  serverEntry: "resux/server-entry",
  clientEntry: "resux/client-entry",
  clientManifest: "resux/client-manifest",
  serverManifest: "resux/server-manifest",
  routes: "resux/routes",
  styles: "resux/styles",
  resumeManifest: "resux/resume-manifest",
  routeResources: "resux/route-resources",
} as const;

export type ResuxBuildModuleKey = keyof typeof RESUX_BUILD_MODULES;
export type ResuxBuildModuleSpecifier = (typeof RESUX_BUILD_MODULES)[ResuxBuildModuleKey];

export interface ResuxBuildArtifact {
  key: ResuxBuildModuleKey;
  specifier: ResuxBuildModuleSpecifier;
  file: string;
}

export interface ResuxBuildContract {
  version: typeof RESUX_BUILD_CONTRACT_VERSION;
  buildDir: string;
  artifacts: Record<ResuxBuildModuleKey, ResuxBuildArtifact>;
}

const BUILD_FILES: Record<ResuxBuildModuleKey, string> = {
  serverEntry: "contract/server-entry.mjs",
  clientEntry: "contract/client-entry.mjs",
  clientManifest: "contract/client-manifest.mjs",
  serverManifest: "contract/server-manifest.mjs",
  routes: "contract/routes.mjs",
  styles: "contract/styles.mjs",
  resumeManifest: "contract/resume-manifest.mjs",
  routeResources: "contract/route-resources.mjs",
};

function joinBuildPath(buildDir: string, file: string): string {
  const root = buildDir.replace(/[\\/]+$/g, "");
  return `${root}/${file}`;
}

export function createResuxBuildContract(buildDir = ".resux"): ResuxBuildContract {
  const artifacts = Object.fromEntries(
    (Object.keys(RESUX_BUILD_MODULES) as ResuxBuildModuleKey[]).map((key) => [
      key,
      {
        key,
        specifier: RESUX_BUILD_MODULES[key],
        file: joinBuildPath(buildDir, BUILD_FILES[key]),
      },
    ]),
  ) as Record<ResuxBuildModuleKey, ResuxBuildArtifact>;

  return {
    version: RESUX_BUILD_CONTRACT_VERSION,
    buildDir: buildDir.replace(/[\\/]+$/g, ""),
    artifacts,
  };
}

export function getResuxBuildArtifact(
  contract: ResuxBuildContract,
  key: ResuxBuildModuleKey,
): ResuxBuildArtifact {
  return contract.artifacts[key];
}
