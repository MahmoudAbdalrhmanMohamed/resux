import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "resuxjs/runtime": path.resolve(__dirname, "src/runtime/index.ts"),
      "resuxjs/compiler": path.resolve(__dirname, "src/compiler/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
