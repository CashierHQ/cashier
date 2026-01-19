import { authState } from "$modules/auth/state/auth.svelte";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { PersistedState } from "runed";

class WalletBridgeStore {
  #btcAddress: PersistedState<string | null> = new PersistedState(
    "btcAddress",
    null,
  );

  constructor() {
    $effect.root(() => {
      $effect(() => {
        if (authState.account == null) {
          this.#btcAddress.current = null;
        } else {
          this.fetchBtcAddress().then((address) => {
            this.#btcAddress.current = address;
          });
        }
      });
    });
  }

  /**
   * Fetch the BTC address associated with the user's wallet.
   * @returns string | null - The BTC address or null if not available.
   */
  async fetchBtcAddress(): Promise<string | null> {
    try {
      const result = await tokenStorageService.getBtcAddress();
      if (result.isErr()) {
        throw new Error(result.unwrapErr());
      }
      return result.unwrap();
    } catch (error) {
      console.error("Failed to fetch BTC address:", error);
      return null;
    }
  }

  get btcAddress() {
    return this.#btcAddress.current;
  }
}

export const walletBridgeStore = new WalletBridgeStore();
