// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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

    // Add more feature flags here as needed
};
