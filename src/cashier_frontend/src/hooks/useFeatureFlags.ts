// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FEATURE_FLAGS } from "@/const";

/**
 * Hook to access feature flags throughout the application
 *
 * Using this hook provides a consistent way to access feature flags
 * and makes it easier to update the implementation in the future.
 */
export const useFeatureFlags = () => {
  return {
    /**
     * Whether the Swap functionality is enabled
     */
    isSwapEnabled: FEATURE_FLAGS.ENABLE_SWAP,

    // Add getter methods for other feature flags here
  };
};
