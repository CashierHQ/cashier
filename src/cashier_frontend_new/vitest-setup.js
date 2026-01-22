import "@testing-library/jest-dom/vitest";

// Mock environment variables for tests
// All canister IDs must be predefined in env, but we set defaults for tests
if (typeof process !== "undefined" && process.env) {
  // Standard ICP Ledger Canister ID: ryjl3-tyaaa-aaaaa-aaaba-cai
  process.env.PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID =
    process.env.PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID ||
    "ryjl3-tyaaa-aaaaa-aaaba-cai";

  // KongSwap Index Canister ID (use a valid Principal ID for tests)
  process.env.PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID =
    process.env.PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID ||
    "ryjl3-tyaaa-aaaaa-aaaba-cai";
}
