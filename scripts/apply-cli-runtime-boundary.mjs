import { readFile, writeFile } from "node:fs/promises";

const cliFile = "src/cli.ts";
let cli = await readFile(cliFile, "utf8");
const selfExecute = `if (isMainModule()) {\n  void runResuxCli(process.argv.slice(2)).catch((error) => {\n    console.error(error instanceof Error ? error.message : String(error));\n    process.exitCode = 1;\n  });\n}\n\n`;
if (!cli.includes(selfExecute)) {
  throw new Error("Expected cli.ts self-execution block was not found");
}
cli = cli.replace(selfExecute, "");
await writeFile(cliFile, cli, "utf8");

const deployFile = "scripts/verify-deploy-targets.mjs";
let deploy = await readFile(deployFile, "utf8");
if (!deploy.includes('path.join(rootDir, "dist", "cli.js")')) {
  throw new Error("Expected deploy verifier CLI path was not found");
}
deploy = deploy.replace('path.join(rootDir, "dist", "cli.js")', 'path.join(rootDir, "dist", "bin.js")');
await writeFile(deployFile, deploy, "utf8");

const packageFile = "package.json";
const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
if (typeof packageJson.scripts?.["create:local"] === "string") {
  packageJson.scripts["create:local"] = packageJson.scripts["create:local"].replace("node dist/cli.js", "node dist/bin.js");
}
await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
