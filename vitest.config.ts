import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@mahmoud-abdelrahman/resux/runtime": path.resolve(__dirname, "src/runtime/index.ts"),
      "@mahmoud-abdelrahman/resux/compiler": path.resolve(__dirname, "src/compiler/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
