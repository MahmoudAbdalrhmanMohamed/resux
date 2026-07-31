import { readFile, writeFile } from "node:fs/promises";

const file = "scripts/apply-icon-runtime-fixes.mjs";
let source = await readFile(file, "utf8");
const before = `.filter((entry): entry is IconPathData => Boolean(entry.d));`;
const after = `.filter((entry) => Boolean(entry.d));`;
const first = source.indexOf(before);
if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
  throw new Error("Could not uniquely locate icon path type predicate.");
}
source = source.slice(0, first) + after + source.slice(first + before.length);
await writeFile(file, source, "utf8");
