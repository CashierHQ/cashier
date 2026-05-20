import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";

/**
 * Shared TS/JS baseline. Workspace packages with custom needs
 * (e.g. frontend with Svelte) should `import { baseConfig }` from
 * here and spread it before adding package-specific rules.
 */
export const baseConfig = [
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-undef": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Codegen + CLI scripts: console output is intentional;
    // case-block `let` declarations are common in AST walkers.
    files: ["**/scripts/**/*.{ts,js,mjs,cjs}"],
    rules: {
      "no-console": "off",
      "no-case-declarations": "off",
    },
  },
];

/**
 * Default export: baseConfig + root-level ignores (frontend has its
 * own config, so ignore it here to avoid double-linting).
 */
export default defineConfig([
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "**/.svelte-kit/**",
      "**/generated/**",
      "**/coverage/**",
      "src/cashier_frontend_new/**",
      "target/**",
      ".dfx/**",
    ],
  },
]);
