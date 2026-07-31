import { readFile, writeFile } from "node:fs/promises";

const file = "src/fonts/index.ts";
let source = await readFile(file, "utf8");
const before = "window.addEventListener('load',loadFonts,{once:true})";
const after = "window.addEventListener('load',loadFonts)";
const first = source.indexOf(before);
if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
  throw new Error("Could not uniquely locate lazy font load listener.");
}
source = source.slice(0, first) + after + source.slice(first + before.length);
await writeFile(file, source, "utf8");
