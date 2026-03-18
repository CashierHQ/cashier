import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import packageConfig from "./package.json";
import * as child from "child_process";
import { svelteTesting } from "@testing-library/svelte/vite";
// Get commit hash
let commitHash = "unknown";
try {
  commitHash = child.execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // In restricted environments (e.g. sandboxed CI), shelling out may be blocked.
  commitHash = "unknown";
}

process.env.VITE_DEV_BUILD_COMMIT_HASH = commitHash;
process.env.VITE_DEV_BUILD_APP_VERSION = packageConfig.version;
process.env.VITE_DEV_BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: {
      // Force Vite/Rollup to use the npm 'buffer' polyfill instead of treating
      // 'buffer' as a Node.js built-in (which becomes __vite-browser-external in prod builds).
      buffer: "buffer/",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
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
