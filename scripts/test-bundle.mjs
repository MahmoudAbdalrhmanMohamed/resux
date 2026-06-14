import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const runtimeFile = path.join(repoRoot, "dist", "runtime", "index.js");

if (!existsSync(runtimeFile)) {
  console.error("dist/runtime/index.js was not found. Run `npm run build` first.");
  process.exit(1);
}

const runtimeSource = readFileSync(runtimeFile, "utf8");
if (/\bswiper\b/i.test(runtimeSource)) {
  console.error("Bundle test failed: runtime bundle should not import Swiper by default.");
  process.exit(1);
}

console.log("Bundle checks passed: no default Swiper runtime import detected.");
