import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import packageConfig from "./package.json";
import * as child from "child_process";
import { svelteTesting } from "@testing-library/svelte/vite";
import { icpBindgen } from "@icp-sdk/bindgen/plugins/vite";
// Get commit hash. In restricted envs (e.g. sandboxed CI) shelling out may be blocked.
let commitHash: string;
try {
  commitHash = child.execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  commitHash = "unknown";
}

process.env.VITE_DEV_BUILD_COMMIT_HASH = commitHash;
process.env.VITE_DEV_BUILD_APP_VERSION = packageConfig.version;
process.env.VITE_DEV_BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig({
  plugins: [
    icpBindgen({
      didFile: "./src/lib/generated/.did/cashier_backend.did",
      outDir: "./src/lib/generated/cashier_backend",
      output: { declarations: { flat: true } },
    }),
    icpBindgen({
      didFile: "./src/lib/generated/.did/token_storage.did",
      outDir: "./src/lib/generated/token_storage",
      output: { declarations: { flat: true } },
    }),
    icpBindgen({
      didFile: "./src/lib/generated/.did/icp_ledger_canister.did",
      outDir: "./src/lib/generated/icp_ledger_canister",
      output: { declarations: { flat: true } },
    }),
    tailwindcss(),
    sveltekit(),
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
