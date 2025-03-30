import { useCreateLinkStore } from "./createLinkStore";
import { useButtonStateStore } from "./buttonStateStore";
import { useSendAssetStore } from "./sendAssetStore";

/**
 * Reset all Zustand stores in the application to their initial state
 */
export const resetAllStores = () => {
    // Reset each store by calling its clearStore method
    useCreateLinkStore.getState().clearStore();
    useButtonStateStore.getState().clearStore();

    useSendAssetStore.getState().resetSendAsset();

    // Add any future stores here when they are created
};
