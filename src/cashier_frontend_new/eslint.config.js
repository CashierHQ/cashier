import prettier from "eslint-config-prettier";
import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default defineConfig([
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
      // Warn on console.log statements to prevent debug code in production
      // Allow console.error and console.warn for legitimate error handling
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Enforce absolute imports using path aliases ($lib, $modules) instead of relative parent imports
      // Allows: ./ for same-directory imports, $lib/*, $modules/*
      // Disallows: ../*, ../../* etc.
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["../*"],
              message:
                "Use path aliases ($lib, $modules) instead of relative parent imports",
            },
          ],
        },
      ],
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
    },
  },
]);
