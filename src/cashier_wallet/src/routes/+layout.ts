// Wallet is 100% browser-side — disable SSR globally to prevent
// @dfinity/agent CJS require() calls from crashing the Node dev server.
export const ssr = false
