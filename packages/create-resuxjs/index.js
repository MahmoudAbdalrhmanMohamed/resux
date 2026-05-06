#!/usr/bin/env node
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const createEntry = require.resolve("resuxjs/create");
const { runCreateResux } = await import(pathToFileURL(createEntry).href);

await runCreateResux(process.argv.slice(2));
