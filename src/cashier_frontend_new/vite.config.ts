import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import packageConfig from "./package.json";
import * as child from "child_process";

// Get commit hash
const commitHash = child.execSync("git rev-parse --short HEAD").toString();

process.env.VITE_DEV_BUILD_COMMIT_HASH = commitHash;
process.env.VITE_DEV_BUILD_APP_VERSION = packageConfig.version;
process.env.VITE_DEV_BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        // polyfill for esbuild, use for any nodejs standard library module used in the browser
        global: "globalThis",
      },
    },
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
});
