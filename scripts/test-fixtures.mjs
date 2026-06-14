import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const fixturesRoot = path.join(repoRoot, "tests", "fixtures");

if (!existsSync(fixturesRoot)) {
  console.log("No fixtures directory found at tests/fixtures. Skipping fixture build tests.");
  process.exit(0);
}

const fixtureDirs = readdirSync(fixturesRoot)
  .map((entry) => path.join(fixturesRoot, entry))
  .filter((candidate) => statSync(candidate).isDirectory())
  .sort();

if (fixtureDirs.length === 0) {
  console.log("No fixture projects discovered. Skipping.");
  process.exit(0);
}

for (const fixture of fixtureDirs) {
  const packageJson = path.join(fixture, "package.json");
  if (!existsSync(packageJson)) {
    continue;
  }
  console.log(`Running fixture build: ${path.relative(repoRoot, fixture)}`);
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
    cwd: fixture,
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
