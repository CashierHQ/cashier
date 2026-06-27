import "@testing-library/jest-dom/vitest";

if (typeof process !== "undefined" && process.env) {
  process.env.PUBLIC_GATE_SERVICE_CANISTER_ID =
    process.env.PUBLIC_GATE_SERVICE_CANISTER_ID || "aaaaa-aa";
  process.env.PUBLIC_HOST_ICP =
    process.env.PUBLIC_HOST_ICP || "http://localhost:4943";
  process.env.PUBLIC_X_CLIENT_ID =
    process.env.PUBLIC_X_CLIENT_ID || "test_client_id";
}
