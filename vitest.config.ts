import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@resux/runtime": path.resolve(__dirname, "packages/runtime/src/index.ts"),
      "@resux/compiler": path.resolve(__dirname, "packages/compiler/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
