import { copyFile, mkdir, readFile } from "node:fs/promises";
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

  // TypeScript emits the original compiler as index.*. Preserve that output once,
  // then expose the small rx adapter at the established public index.* path.
  // On repeated incremental builds index.* already equals adapter.*, so the
  // preserved implementation is intentionally left untouched.
  if (publicSource !== adapterSource) {
    await copyFile(publicEntry, implementationEntry);
  }

  await copyFile(adapterEntry, publicEntry);
}
