import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  root: "src",
  outDir: "dist",
  format: "esm",
  unbundle: true,
  dts: true,
  sourcemap: true,
  clean: true,
  platform: "node",
  target: "node20",
  // Keep the package's established ESM contract (`.js` + `.d.ts`).
  // tsdown defaults to fixed `.mjs`/`.d.mts` for the Node platform unless
  // fixedExtension is disabled; being explicit here also protects the public
  // exports map and the compiler-adapter preparation step from that default.
  fixedExtension: false,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  deps: {
    neverBundle: true,
  },
});
