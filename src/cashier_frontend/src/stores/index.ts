// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useLinkActionStore } from "./linkActionStore";
import { useButtonStateStore } from "./buttonStateStore";
import { useSendAssetStore } from "./sendAssetStore";
import { useLinkCreationFormStore } from "./linkCreationFormStore";

/**
 * Reset all Zustand stores in the application to their initial state
 */
export const resetAllStores = () => {
    // Reset each store by calling its clearStore method
    useLinkActionStore.getState().clearStore();
    useButtonStateStore.getState().clearStore();
    useSendAssetStore.getState().resetSendAsset();
    useLinkCreationFormStore.getState().clearStore();
    // Add any future stores here when they are created
};
