import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerDir = path.join(projectRoot, "dist", "compiler");

await mkdir(compilerDir, { recursive: true });
await installCompilerEntry(".js");
await installCompilerEntry(".d.ts");

async function installCompilerEntry(extension) {
  const publicEntry = path.join(compilerDir, `index${extension}`);
  const adapterEntry = path.join(compilerDir, `adapter${extension}`);
  const implementationEntry = path.join(compilerDir, `implementation${extension}`);

  const [publicSource, adapterSource] = await Promise.all([
    readFile(publicEntry, "utf8"),
    readFile(adapterEntry, "utf8"),
  ]);

  // Preserve the original compiler implementation before exposing the adapter at
  // the established public index.* path. tsdown can collapse the adapter's
  // implementation re-export back to ./index.js, which would become a self-import
  // after the adapter is installed as index.*. Point those generated specifiers at
  // the preserved implementation instead.
  if (publicSource !== adapterSource) {
    await copyFile(publicEntry, implementationEntry);
  }

  const preparedAdapterSource = adapterSource
    .replaceAll('"./index.js"', '"./implementation.js"')
    .replaceAll("'./index.js'", "'./implementation.js'");

  await writeFile(publicEntry, preparedAdapterSource, "utf8");
}
