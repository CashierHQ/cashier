import { authState } from "../state/auth.svelte";
import { CONNECT_WALLET_ID_KEY } from "../constants";

// Centralized storage event handler for cross-tab auth synchronization.
// This handler watches CONNECT_WALLET_ID_KEY and delegates actions to authState.
export const handleStorageChange = async (event: StorageEvent) => {
  try {
    if (event.key === CONNECT_WALLET_ID_KEY) {
      // If key removed in another tab, ensure we logout locally.
      if (event.newValue === null || event.newValue === "") {
        console.log("Detected logout in another tab, logging out locally.");
        // Call authState.logout() to clear local state and redirect.
        await authState.logout();
      } else {
        // If key was set/changed in another tab, update local state and try reconnect.
        try {
            console.log("Detected login in another tab, attempting to reconnect locally.");
          await authState.reconnect();
        } catch (err) {
          console.error("Reconnection after storage change failed:", err);
        }
      }
    }
  } catch (e) {
    console.error("handleStorageChange error:", e);
  }
};
