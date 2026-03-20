/// <reference types="node" />
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// Comma-separated list of extra hostnames to trust during development (e.g.
// Cloudflare Tunnel or ngrok hostnames). Set ALLOWED_HOSTS in your .env or
// shell before running `pnpm dev`. Never commit real values here.
const extraHosts = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(",").map((h) => h.trim())
  : [];

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    // @dfinity/agent references Node.js `global` — polyfill for browser
    global: "globalThis",
  },
  server: {
    port: 5177,
    strictPort: true,
    cors: true,
    allowedHosts: extraHosts,
  },
});
