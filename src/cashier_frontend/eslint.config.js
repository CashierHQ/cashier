import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "**/src/declarations/**",
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
            // ignore for shadcn components
            "react/prop-types": [2, { ignore: ["className"] }],
            "react/no-unescaped-entities": "off",
        },
    },
];
