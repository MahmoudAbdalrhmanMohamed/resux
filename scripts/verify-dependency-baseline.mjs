import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const directDependencies = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
};

const fail = (message) => {
  throw new Error(`[dependency-baseline] ${message}`);
};

const versionFromRange = (range, name) => {
  if (typeof range !== "string") fail(`${name} must use a string version range`);
  const match = range.match(/^(?:\^|~)?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) fail(`${name} must use a stable semver range, got ${range}`);
  return {
    raw: `${match[1]}.${match[2]}.${match[3]}`,
    major: Number(match[1]),
  };
};

for (const [name, range] of Object.entries(directDependencies)) {
  versionFromRange(range, name);
}

const vue = versionFromRange(pkg.dependencies?.vue, "vue");
const compilerDom = versionFromRange(pkg.dependencies?.["@vue/compiler-dom"], "@vue/compiler-dom");
const compilerSfc = versionFromRange(pkg.dependencies?.["@vue/compiler-sfc"], "@vue/compiler-sfc");
if (vue.raw !== compilerDom.raw || vue.raw !== compilerSfc.raw) {
  fail(`Vue runtime/compiler baselines must match exactly: vue=${vue.raw}, compiler-dom=${compilerDom.raw}, compiler-sfc=${compilerSfc.raw}`);
}

const expectedMajors = new Map([
  ["vite", 8],
  ["@vitejs/plugin-vue", 6],
  ["vue", 3],
  ["@vue/compiler-dom", 3],
  ["@vue/compiler-sfc", 3],
  ["nitropack", 2],
  ["h3", 1],
  ["typescript", 5],
  ["vitest", 4],
  ["happy-dom", 20],
  ["@types/node", 24],
]);
for (const [name, expectedMajor] of expectedMajors) {
  const version = versionFromRange(directDependencies[name], name);
  if (version.major !== expectedMajor) {
    fail(`${name} must stay on production baseline major ${expectedMajor}; got ${version.raw}`);
  }
}

console.log(
  `[dependency-baseline] stable baseline verified: Vue ${vue.raw}, Vite ${versionFromRange(pkg.dependencies.vite, "vite").raw}, Nitro ${versionFromRange(pkg.dependencies.nitropack, "nitropack").raw}`,
);
