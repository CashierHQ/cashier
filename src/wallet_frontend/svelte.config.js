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
      "@dfinity/principal": "./node_modules/@dfinity/principal",
    },
  },
};

export default config;
