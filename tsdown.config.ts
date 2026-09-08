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
  deps: {
    neverBundle: true,
  },
});
