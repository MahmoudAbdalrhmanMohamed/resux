import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep, win32 } from "node:path";

const root = process.cwd();
const createPackageRoot = resolve(root, "packages/create-resuxjs");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const fail = (message) => {
  throw new Error(`[package-contract] ${message}`);
};

const isContainedPath = (packageRoot, targetPath) => {
  const pathFromRoot = relative(packageRoot, targetPath);
  return Boolean(pathFromRoot)
    && pathFromRoot !== ".."
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot);
};

const verifyFileTarget = async ({ packageRoot, target, kind, label }) => {
  if (typeof target !== "string" || target.length === 0) {
    fail(`${label} has an invalid ${kind} target`);
  }
  if (target.includes("\0")) {
    fail(`${label} ${kind} target contains a null byte: ${target}`);
  }
  if (kind === "export" && !target.startsWith("./")) {
    fail(`${label} export target must start with ./: ${target}`);
  }
  if (isAbsolute(target) || win32.isAbsolute(target)) {
    fail(`${label} ${kind} target must be package-relative: ${target}`);
  }

  // Normalize separators before containment checks so Windows-style traversal
  // cannot be interpreted as an in-package filename on POSIX runners.
  const normalizedTarget = target.replaceAll("\\", "/");
  const targetPath = resolve(packageRoot, normalizedTarget);
  if (!isContainedPath(packageRoot, targetPath)) {
    fail(`${label} ${kind} target escapes the package root: ${target}`);
  }

  let targetStat;
  try {
    targetStat = await stat(targetPath);
  } catch {
    fail(`${label} ${kind} target is missing: ${target}`);
  }
  if (!targetStat.isFile()) {
    fail(`${label} ${kind} target must resolve to a regular file: ${target}`);
  }
};

const collectExportTargets = (value, targets = []) => {
  if (typeof value === "string") {
    targets.push(value);
    return targets;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectExportTargets(entry, targets);
    return targets;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectExportTargets(entry, targets);
  }
  return targets;
};

const collectBinTargets = (bin, packageName) => {
  if (typeof bin === "string") {
    return [[packageName, bin]];
  }
  if (!bin || typeof bin !== "object" || Array.isArray(bin)) {
    fail(`${packageName} must declare a valid bin target`);
  }
  return Object.entries(bin);
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

for (const [command, target] of collectBinTargets(pkg.bin, pkg.name)) {
  await verifyFileTarget({
    packageRoot: root,
    target,
    kind: "bin",
    label: `${pkg.name} bin ${command}`,
  });
}

for (const target of collectExportTargets(pkg.exports)) {
  await verifyFileTarget({
    packageRoot: root,
    target,
    kind: "export",
    label: pkg.name,
  });
}

for (const [command, target] of collectBinTargets(createPkg.bin, createPkg.name)) {
  await verifyFileTarget({
    packageRoot: createPackageRoot,
    target,
    kind: "bin",
    label: `${createPkg.name} bin ${command}`,
  });
}

console.log(`[package-contract] verified resuxjs@${pkg.version} and create-resuxjs@${createPkg.version}`);
