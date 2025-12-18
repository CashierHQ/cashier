import "@testing-library/jest-dom/vitest";

// Mock environment variables for tests
// Standard ICP Ledger Canister ID: ryjl3-tyaaa-aaaaa-aaaba-cai
// Standard ICP Index Canister ID: qhbym-qaaaa-aaaaa-aaafq-cai
if (typeof process !== "undefined" && process.env) {
  process.env.PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID =
    process.env.PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID ||
    "ryjl3-tyaaa-aaaaa-aaaba-cai";
  process.env.PUBLIC_TOKEN_ICP_INDEX_CANISTER_ID =
    process.env.PUBLIC_TOKEN_ICP_INDEX_CANISTER_ID ||
    "qhbym-qaaaa-aaaaa-aaafq-cai";
}
