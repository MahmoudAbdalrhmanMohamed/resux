#!/usr/bin/env node
import { runResuxCli } from "./cli.js";

await runResuxCli(process.argv.slice(2));

