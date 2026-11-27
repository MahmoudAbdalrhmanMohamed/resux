import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Errors catch real mistakes. Dead code and style findings are warnings so they show up
// in `npm run lint` without blocking; clean them up in small follow-ups.
export default tseslint.config(
  { ignores: ["dist/**", "docs/**", "templates/**", "node_modules/**", ".resux/**", "packages/**", "tests/**", "scripts/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-this-alias": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "preserve-caught-error": "off",
      "no-control-regex": "off",
      "no-unsafe-optional-chaining": "warn",
    },
  },
);
