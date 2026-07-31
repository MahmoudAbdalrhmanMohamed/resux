import { readFile, writeFile } from "node:fs/promises";

const file = "src/icons/index.ts";
let source = await readFile(file, "utf8");
const startMarker = "function readSvgAttribute(source: string, name: string): string {";
const endMarker = "\n}\n\nexport const Icon = defineComponent";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
if (start < 0 || end < 0) {
  throw new Error("Could not find generated icon attribute parser.");
}
const replacement = `function readSvgAttribute(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
  const match = new RegExp(
    "\\\\b" + escapedName + "\\\\s*=\\\\s*(?:\\\"([^\\\"]*)\\\"|'([^']*)')",
    "i",
  ).exec(source);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}`;
source = source.slice(0, start) + replacement + source.slice(end + 2);
await writeFile(file, source, "utf8");
console.log("Normalized icon attribute parser.");
