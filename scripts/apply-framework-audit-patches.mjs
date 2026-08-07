import { readFile, rm, writeFile } from "node:fs/promises";

const file = "src/runtime/index.ts";
let source = await readFile(file, "utf8");
const search = `    useError(): Ref<ResuxError | null> {\n      return activeResuxError;\n    },`;
const replacement = `    useError(): Ref<ResuxError | null> {\n      return readActiveResuxError();\n    },`;
const count = source.split(search).length - 1;
if (count !== 1) {
  throw new Error(`Expected one remaining server useError target, found ${count}.`);
}
source = source.replace(search, replacement);
await writeFile(file, source, "utf8");
await rm("scripts/apply-framework-audit-patches.mjs", { force: true });
await rm(".github/workflows/framework-audit-patch.yml", { force: true });
