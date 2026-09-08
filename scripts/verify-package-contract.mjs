import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const exists = async (path) => {
  try {
    await access(resolve(root, path));
    return true;
  } catch {
    return false;
  }
};
const fail = (message) => {
  throw new Error(`[package-contract] ${message}`);
};

const pkg = await readJson("package.json");
const lock = await readJson("package-lock.json");
const createPkg = await readJson("packages/create-resuxjs/package.json");

if (pkg.name !== "resuxjs") fail(`expected package name resuxjs, got ${pkg.name}`);
if (pkg.private) fail("resuxjs must not be private");
if (/\bexperimental\b/i.test(pkg.description ?? "")) {
  fail("package description still marks the framework as experimental");
}
if (pkg.engines?.node !== ">=20.19.0") {
  fail(`unexpected Node engine: ${pkg.engines?.node ?? "missing"}`);
}

if (lock.name !== pkg.name || lock.version !== pkg.version) {
  fail("package-lock root metadata is out of sync with package.json");
}
if (lock.packages?.[""]?.name !== pkg.name || lock.packages?.[""]?.version !== pkg.version) {
  fail("package-lock packages[''] metadata is out of sync with package.json");
}

if (createPkg.name !== "create-resuxjs") fail("create package name must be create-resuxjs");
if (createPkg.private) fail("create-resuxjs must not be private");
if (createPkg.version !== pkg.version) {
  fail(`create-resuxjs ${createPkg.version} does not match resuxjs ${pkg.version}`);
}
if (createPkg.dependencies?.resuxjs !== `^${pkg.version}`) {
  fail(`create-resuxjs must depend on resuxjs ^${pkg.version}`);
}

const expectedFiles = ["dist", "templates", "README.md"];
for (const entry of expectedFiles) {
  if (!pkg.files?.includes(entry)) fail(`package files[] must include ${entry}`);
}

const targets = new Set();
for (const value of Object.values(pkg.bin ?? {})) targets.add(value);
for (const entry of Object.values(pkg.exports ?? {})) {
  if (typeof entry === "string") {
    if (entry !== "./package.json") targets.add(entry);
    continue;
  }
  if (!entry || typeof entry !== "object") continue;
  for (const target of Object.values(entry)) {
    if (typeof target === "string") targets.add(target);
  }
}

for (const target of targets) {
  const path = target.replace(/^\.\//, "");
  if (!(await exists(path))) fail(`published entry point is missing: ${target}`);
}

if (!(await exists("packages/create-resuxjs/index.js"))) {
  fail("create-resuxjs bin entry is missing");
}

console.log(`[package-contract] verified resuxjs@${pkg.version} and create-resuxjs@${createPkg.version}`);
