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
    // Frontend needs browser globals in addition to node (already in baseConfig)
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
      // Allow links without resolve() - external links don't need it
      // Internal navigation should still use resolve() via goto()
      "svelte/no-navigation-without-resolve": [
        "error",
        {
          ignoreLinks: true, // Ignore <a> tags, but still check goto(), pushState(), replaceState()
        },
      ],
      // $bindable(default) provides a fallback when parent doesn't bind; even
      // if a $effect overwrites it on mount, the default is part of the prop
      // contract — not a useless assignment.
      "no-useless-assignment": "off",
    },
  },
  {
    ignores: [
      "./.svelte-kit/**/*",
      "./build/**/*",
      "./src/lib/generated/**/*",
      "./src/lib/paraglide/**/*",
      "./src/lib/shadcn/**/*",
    ],
  },
]);
