import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cliPath = path.resolve(process.cwd(), "dist", "cli.js");
const source = await readFile(cliPath, "utf8");
const entryPattern = /if \(isMainModule\(\)\) \{\r?\n\s*await runResuxCli\(process\.argv\.slice\(2\)\);\r?\n\}/;

if (!entryPattern.test(source)) {
  if (source.includes("void runResuxCli(process.argv.slice(2))")) {
    console.log("Build output already has a non-blocking CLI entry.");
    process.exit(0);
  }
  throw new Error(
    "Unable to finalize dist/cli.js: the expected CLI entry was not found. "
    + "Update scripts/finalize-build.mjs when the source entry changes.",
  );
}

const finalized = source.replace(
  entryPattern,
  `if (isMainModule()) {
    void runResuxCli(process.argv.slice(2)).catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}`,
);

await writeFile(cliPath, finalized, "utf8");
console.log("Finalized dist/cli.js without top-level await.");
