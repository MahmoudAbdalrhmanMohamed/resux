#!/usr/bin/env node
import { runCreateResux } from "./create.js";

await runCreateResux(process.argv.slice(2));

