// This is a static SPA (adapter-static). Disable SSR globally so Node never
// tries to execute browser-only code (@dfinity/agent, buffer, etc.) server-side.
export const ssr = false
