import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import * as child from "child_process";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import packageConfig from "./package.json";

// Get commit hash
const commitHash = child.execSync("git rev-parse --short HEAD").toString();

process.env.VITE_DEV_BUILD_COMMIT_HASH = commitHash;
process.env.VITE_DEV_BUILD_APP_VERSION = packageConfig.version;
process.env.VITE_DEV_BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    nodePolyfills({
      include: ["buffer", "process", "stream"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  test: {
    setupFiles: ["./vitest-setup.js"],
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec,jsdom.spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
      {
        plugins: [svelteTesting()],
        extends: "./vite.config.ts",
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
});
