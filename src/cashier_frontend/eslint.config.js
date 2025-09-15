// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "**/*.config.js",
            "**/*.did.*",
            "**/src/example",
            "src/components/ui/**",
        ],
    },
    {
        files: ["src/*.{ts,tsx}"],
    },
    {
        languageOptions: { globals: globals.browser },
    },
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        rules: {
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
        },
    },
];
