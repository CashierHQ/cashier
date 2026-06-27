import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";
import { baseConfig } from "../../eslint.config.js";
import svelteConfig from "./svelte.config.js";

export default defineConfig([
  ...baseConfig,
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig,
      },
    },
    rules: {
      "svelte/no-navigation-without-resolve": ["error", { ignoreLinks: true }],
      "no-useless-assignment": "off",
    },
  },
  {
    ignores: ["./.svelte-kit/**/*", "./build/**/*", "./src/lib/generated/**/*"],
  },
]);
