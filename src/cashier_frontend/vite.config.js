// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";
import tailwindcss from "tailwindcss";
import path, { resolve } from "path";
import crypto from "crypto";

export default defineConfig(({ command, mode }) => {
    // Determine which .env file to use based on mode
    // Supports: .env.local, .env.staging, .env.production
    const envFile = `.env.${mode}`;
    const envPath = resolve(__dirname, envFile);

    // Load the environment variables from the determined .env file
    dotenv.config({ path: envPath });

    // Generate build information
    const timestamp = new Date().toISOString();
    const packageJson = require("./package.json");
    const version = packageJson.version;

    // Generate a build hash based on timestamp
    const buildHash = crypto
        .createHash("sha256")
        .update(`${version}-${timestamp}`)
        .digest("hex")
        .substring(0, 8);

    console.log(`Building for ${mode} environment using ${envFile}`);
    console.log(`Build version: ${version}, Build hash: ${buildHash}`);

    return {
        build: {
            emptyOutDir: true,
        },
        define: {
            __APP_VERSION__: JSON.stringify(version),
            __BUILD_HASH__: JSON.stringify(buildHash),
            __BUILD_TIMESTAMP__: JSON.stringify(timestamp),
            __BUILD_MODE__: JSON.stringify(mode),
        },
        optimizeDeps: {
            esbuildOptions: {
                define: {
                    global: "globalThis",
                },
            },
        },
        esbuild: {
            // Remove console logs in production and staging environments
            pure: ["production", "staging"].includes(mode)
                ? ["console.log", "console.debug", "console.info", "console.warn"]
                : [],
        },
        plugins: [
            react(),
            environment("all", { prefix: "CANISTER_" }),
            environment("all", { prefix: "DFX_" }),
        ],
        worker: {
            format: "es",
            plugins: [
                // Add any plugins needed for workers
            ],
        },
        resolve: {
            alias: [
                {
                    find: "declarations",
                    replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
                },
                {
                    find: "@",
                    replacement: path.resolve(__dirname, "./src"),
                },
            ],
        },
        css: {
            postcss: {
                plugins: [tailwindcss()],
            },
        },
    };
});
