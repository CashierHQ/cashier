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
            "**/src/declarations",
            "**/src/cashier_frontend/*.config.js",
            "**/src/example",
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
            "react/prop-types": [2, { ignore: ["className"] }],
        },
    },
];
