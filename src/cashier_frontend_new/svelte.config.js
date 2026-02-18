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
      $shared: "../shared/generated/ts",
      $sharedTemplates: "../shared/templates",
    },
  },
};

export default config;
