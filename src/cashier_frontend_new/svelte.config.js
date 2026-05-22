import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    alias: {
      $modules: "./src/modules",
      $shared: "../lib/cashier_shared/generated/ts",
      $sharedTemplates: "../lib/cashier_shared/templates",
      // Ensure @icp-sdk/core/principal resolves from the frontend's node_modules
      // when TypeScript checks files in ../shared/generated/ts/ (which is
      // outside the frontend's node_modules ancestor path).
      "@icp-sdk/core/principal":
        "./node_modules/@icp-sdk/core/lib/esm/principal",
    },
  },
};

export default config;
