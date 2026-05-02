#!/usr/bin/env node
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const resuxEntry = require.resolve("resuxjs");
const createEntry = path.join(path.dirname(resuxEntry), "create.js");
const { runCreateResux } = await import(pathToFileURL(createEntry).href);

await runCreateResux(process.argv.slice(2));
