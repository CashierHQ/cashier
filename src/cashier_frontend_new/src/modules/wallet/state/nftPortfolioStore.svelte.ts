import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { nftPortfolioService } from "$modules/wallet/services/nftPortfolioService";
import type { OwnedTokenRecord } from "$modules/wallet/types/nft";

/**
 * Store managing the current user's NFT portfolio, sourced from nftGeek. This is
 * additive to `walletNftStore` (the manually-added-NFT mechanism) — it discovers
 * ownership across nftGeek-indexed collections without requiring a manual "Add NFT".
 */
class NftPortfolioStore {
  #portfolioQuery;

  constructor() {
    this.#portfolioQuery = managedState<Record<string, OwnedTokenRecord[]>>({
      queryFn: () => {
        const principal = authState.account?.owner;
        if (!principal) {
          return Promise.resolve({});
        }
        return nftPortfolioService.getPortfolio(principal);
      },
      refetchInterval: 60_000,
      persistedKey: ["nftPortfolioQuery"],
      storageType: "localStorage",
    });

    $effect.root(() => {
      $effect(() => {
        // Reset when the user logs out
        if (authState.account == null) {
          this.reset();
          return;
        }
        // Refresh when the user logs in
        this.#portfolioQuery.refresh();
      });
    });
  }

  get query() {
    return this.#portfolioQuery;
  }

  /**
   * Get the tokens owned by the current user within a specific collection.
   * @param collectionId collection canister id
   */
  public getTokensForCollection(collectionId: string): OwnedTokenRecord[] {
    return this.#portfolioQuery.data?.[collectionId] ?? [];
  }

  /**
   * Reset the store to its initial (logged-out) state.
   */
  public reset(): void {
    this.#portfolioQuery.reset();
  }
}

export const nftPortfolioStore = new NftPortfolioStore();
