// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export const BACKEND_CANISTER_ID = import.meta.env.VITE_BACKEND_CANISTER_ID;
export const TOKEN_STORAGE_CANISTER_ID = import.meta.env.VITE_TOKEN_STORAGE_CANISTER_ID;
const IC_EXPLORER_BASE_URL = import.meta.env.VITE_IC_EXPLORER_BASE_URL;
export const IC_EXPLORER_IMAGES_PATH =
    import.meta.env.VITE_IC_EXPLORER_IMAGES_PATH || "https://api.icexplorer.io/images/";
export const IC_HOST = import.meta.env.VITE_IC_HOST || "https://icp0.io";
export const IC_INTERNET_IDENTITY_PROVIDER =
    import.meta.env.VITE_IC_INTERNET_IDENTITY_PROVIDER || "https://identity.ic0.app";
export const ICP_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const ICP_LOGO = "./icpLogo.png";

// Token balance caching constants
export const BALANCE_CACHE_LAST_CACHE_TIME_KEY = "lastTokenBalanceCacheTime";
export const BALANCE_CACHE_LAST_CACHED_BALANCES_KEY = "lastCachedTokenBalances";
export const BALANCE_CACHE_THRESHOLD_MS = 1 * 30 * 1000; // 30 seconds in milliseconds

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
    ENABLE_SWAP: import.meta.env.VITE_FEATURE_FLAGS_ENABLE_SWAP === "true" || false,

    ENABLE_LOCAL_IDENTITY_PROVIDER:
        import.meta.env.VITE_FEATURE_FLAGS_ENABLE_LOCAL_IDENTITY_PROVIDER === "true" || false,
};
