import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";
import tailwindcss from "tailwindcss";
import path, { resolve } from "path";

export default defineConfig((mode) => {
    const envFile = mode === "staging" ? ".env.staging" : ".env.local";
    const envPath = resolve(__dirname, `../../${envFile}`);

    // Load the environment variables from the determined .env file
    dotenv.config({ path: envPath });

    console.log("cashier backend ", process.env.CANISTER_ID_CASHIER_BACKEND);

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
