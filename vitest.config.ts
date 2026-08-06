import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "resuxjs/create": path.resolve(rootDir, "src/create.ts"),
      "resuxjs/i18n": path.resolve(rootDir, "src/i18n/index.ts"),
      "resuxjs/reactivity": path.resolve(rootDir, "src/reactivity/index.ts"),
      "resuxjs/runtime": path.resolve(rootDir, "src/runtime/index.ts"),
      "resuxjs/compiler": path.resolve(rootDir, "src/compiler/adapter.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 60000
  }
});
