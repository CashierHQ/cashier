import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type Plugin } from "vite";
import packageConfig from "./package.json";
import * as child from "child_process";
import { svelteTesting } from "@testing-library/svelte/vite";
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

const browserBufferAlias: Plugin = {
  name: "browser-buffer-alias",
  enforce: "pre" as const,
  resolveId(
    id: string,
    importer: string | undefined,
    options: { ssr?: boolean },
  ) {
    if (id === "buffer" && !options.ssr) {
      return this.resolve("buffer/", importer, { skipSelf: true });
    }
    return null;
  },
};

export default defineConfig({
  plugins: [browserBufferAlias, tailwindcss(), sveltekit()],
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
