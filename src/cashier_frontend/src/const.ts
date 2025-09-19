// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export const BACKEND_CANISTER_ID: string = import.meta.env
  .VITE_BACKEND_CANISTER_ID;
export const TOKEN_STORAGE_CANISTER_ID = import.meta.env
  .VITE_TOKEN_STORAGE_CANISTER_ID;
export const IC_EXPLORER_BASE_URL = import.meta.env.VITE_IC_EXPLORER_BASE_URL;
export const IC_EXPLORER_IMAGES_PATH =
  import.meta.env.VITE_IC_EXPLORER_IMAGES_PATH ||
  "https://api.icexplorer.io/images/";
export const IC_HOST = import.meta.env.VITE_IC_HOST || "https://icp0.io";
export const IC_INTERNET_IDENTITY_PROVIDER =
  import.meta.env.VITE_IC_INTERNET_IDENTITY_PROVIDER || "https://id.ai";
export const ICP_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const ICP_LOGO = "./icpLogo.png";

// Token balance caching constants
export const BALANCE_CACHE_LAST_CACHE_TIME_KEY = "lastTokenBalanceCacheTime";
export const BALANCE_CACHE_LAST_CACHED_BALANCES_KEY = "lastCachedTokenBalances";
export const BALANCE_CACHE_THRESHOLD_MS = 1 * 30 * 1000; // 30 seconds in milliseconds

// Timeout for delegation, 1 hour in nanoseconds
export const TIMEOUT_NANO_SEC = 60n * 60n * 1_000_000_000n; // 1 hour

// Timeout for frontend idle, tracking by var stored in local storage
export const IDLE_TIMEOUT_MILLI_SEC = 15 * 60 * 1_000; // 15 minutes

/**
 * Feature flags configuration
 *
 * This file contains all feature flags for the application.
 * Each flag should be read from environment variables with sensible defaults.
 *
 * In Vite, environment variables must be prefixed with VITE_ to be exposed to the client.
 */
export const FEATURE_FLAGS = {
  /**
   * Controls whether the Swap functionality is enabled
   * Set this via VITE_FEATURE_FLAGS_ENABLE_SWAP environment variable
   */
  ENABLE_SWAP:
    import.meta.env.VITE_FEATURE_FLAGS_ENABLE_SWAP === "true" || false,

  ENABLE_LOCAL_IDENTITY_PROVIDER:
    import.meta.env.VITE_FEATURE_FLAGS_ENABLE_LOCAL_IDENTITY_PROVIDER ===
      "true" || false,

  ENABLE_ANONYMOUS_GOOGLE_LOGIN:
    import.meta.env.VITE_FATURE_FLAGS_ENABLE_GOOGLE_LOGIN === "true" || false,

  ENABLE_ANONYMOUS_USE_LINK:
    import.meta.env.VITE_FEATURE_FLAGS_ENABLE_ANONYMOUS_USE_LINK === "true" ||
    false,
};
