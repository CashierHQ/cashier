import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/src/declarations/**",
            "**/*.config.js",
            "**/*.did.*",
            "**/src/example",
            "**/src/cashier_frontend/src/components/ui/**",
        ],
    },
    {
        languageOptions: { globals: globals.browser },
    },
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        rules: {
            "react/react-in-jsx-scope": "off",
            // ignore for shadcn components
            "react/prop-types": "off",
        },
    },
];
