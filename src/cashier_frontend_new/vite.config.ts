import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import packageConfig from "./package.json";
import * as child from "child_process";
import { svelteTesting } from "@testing-library/svelte/vite";
// Get commit hash
const commitHash = child.execSync("git rev-parse --short HEAD").toString();

process.env.VITE_DEV_BUILD_COMMIT_HASH = commitHash;
process.env.VITE_DEV_BUILD_APP_VERSION = packageConfig.version;
process.env.VITE_DEV_BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
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
    env: {
      // Set default env variables for tests if not already set
      PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID:
        process.env.PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID ||
        "ryjl3-tyaaa-aaaaa-aaaba-cai",
      PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID:
        process.env.PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID ||
        "ryjl3-tyaaa-aaaaa-aaaba-cai",
    },
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
