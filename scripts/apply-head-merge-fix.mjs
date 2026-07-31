import { readFile, writeFile } from "node:fs/promises";

const file = "src/core/module-container.ts";
let source = await readFile(file, "utf8");
const before = `function mergeHead(current: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  return {
    ...current,
    ...next,
    meta: [
      ...(Array.isArray(current.meta) ? current.meta : []),
      ...(Array.isArray(next.meta) ? next.meta : [])
    ],
    link: [
      ...(Array.isArray(current.link) ? current.link : []),
      ...(Array.isArray(next.link) ? next.link : [])
    ]
  };
}`;
const after = `function mergeHead(current: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  return {
    ...current,
    ...next,
    meta: mergeHeadArray(current.meta, next.meta),
    link: mergeHeadArray(current.link, next.link),
    style: mergeHeadArray(current.style, next.style),
    script: mergeHeadArray(current.script, next.script),
    noscript: mergeHeadArray(current.noscript, next.noscript),
    htmlAttrs: {
      ...(isObject(current.htmlAttrs) ? current.htmlAttrs : {}),
      ...(isObject(next.htmlAttrs) ? next.htmlAttrs : {}),
    },
    bodyAttrs: {
      ...(isObject(current.bodyAttrs) ? current.bodyAttrs : {}),
      ...(isObject(next.bodyAttrs) ? next.bodyAttrs : {}),
    },
  };
}

function mergeHeadArray(current: unknown, next: unknown): unknown[] {
  return [
    ...(Array.isArray(current) ? current : []),
    ...(Array.isArray(next) ? next : []),
  ];
}`;
const first = source.indexOf(before);
if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
  throw new Error("Could not uniquely locate mergeHead implementation.");
}
source = source.slice(0, first) + after + source.slice(first + before.length);
await writeFile(file, source, "utf8");
console.log("Applied module head composition fix.");
