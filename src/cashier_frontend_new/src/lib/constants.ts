// Backend configuration
export const BACKEND_CANISTER_ID = import.meta.env.VITE_BACKEND_CANISTER_ID;
export const TOKEN_STORAGE_CANISTER_ID = import.meta.env
  .VITE_TOKEN_STORAGE_CANISTER_ID;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_LOCAL_IDENTITY_PROVIDER:
    import.meta.env.VITE_FEATURE_FLAGS_ENABLE_LOCAL_IDENTITY_PROVIDER ===
    "true",
} as const;

// Network configuration
export const IC_HOST = import.meta.env.VITE_IC_HOST || "https://ic0.app";
export const IC_INTERNET_IDENTITY_PROVIDER =
  import.meta.env.VITE_IC_INTERNET_IDENTITY_PROVIDER ||
  "https://identity.ic0.app";

// Timeout configuration
export const TIMEOUT_NANO_SEC = BigInt(24 * 60 * 60 * 1000 * 1000 * 1000); // 24 hours in nanoseconds

// Derived constants
export const TARGETS = [BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];
