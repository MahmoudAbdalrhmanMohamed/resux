import { readFile, writeFile } from "node:fs/promises";

const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
let source = await readFile(runtimePath, "utf8");

const resolverFilter = `  if (!isRouterManagedPagePath(target.pathname)) {\n    return { url: null, reason: "non-page-route" };\n  }\n`;
if (!source.includes(resolverFilter)) throw new Error("resolver page filter anchor not found");
source = source.replace(resolverFilter, "");

const clickAnchor = `  if (shouldIgnoreNavigationTarget(event.target, anchor)) {\n    logManagedMediaDebug("router-ignore", {`;
const clickReplacement = `  if (!isRouterManagedPagePath(target.pathname)) {\n    logManagedMediaDebug("router-ignore", {\n      reason: "non-page-route",\n      href: target.href\n    });\n    return false;\n  }\n\n${clickAnchor}`;
if (!source.includes(clickAnchor)) throw new Error("click route filter insertion anchor not found");
source = source.replace(clickAnchor, clickReplacement);

const prefetchAnchor = `  if (shouldIgnoreNavigationTarget(eventTarget, anchor)) {\n    logManagedMediaDebug("router-prefetch-ignore", {`;
const prefetchReplacement = `  if (!isRouterManagedPagePath(target.pathname)) {\n    logManagedMediaDebug("router-prefetch-ignore", {\n      reason: "non-page-route",\n      href: target.href\n    });\n    return null;\n  }\n\n${prefetchAnchor}`;
if (!source.includes(prefetchAnchor)) throw new Error("prefetch route filter insertion anchor not found");
source = source.replace(prefetchAnchor, prefetchReplacement);

await writeFile(runtimePath, source, "utf8");
console.log("Restored managed-media interception before generic page-route filtering.");
