// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";
import tailwindcss from "tailwindcss";
import path, { resolve } from "path";

export default defineConfig(({ command, mode }) => {
    // Determine which .env file to use based on mode
    // Supports: .env.local, .env.staging, .env.production
    const envFile = `.env.${mode}`;
    const envPath = resolve(__dirname, envFile);

    // Load the environment variables from the determined .env file
    dotenv.config({ path: envPath });

    console.log(`Building for ${mode} environment using ${envFile}`);

    return {
        build: {
            emptyOutDir: true,
        },
        optimizeDeps: {
            esbuildOptions: {
                define: {
                    global: "globalThis",
                },
            },
        },
        esbuild: {
            pure: mode === "production" ? ["console.log"] : [],
        },
        server: {
            proxy: {
                "/api": {
                    target: "http://127.0.0.1:4943",
                    changeOrigin: true,
                },
            },
        },
        plugins: [
            react(),
            environment("all", { prefix: "CANISTER_" }),
            environment("all", { prefix: "DFX_" }),
        ],
        worker: {
            format: "es",
            plugins: () => [
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
