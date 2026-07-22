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
  #optimisticRemovedTokenIds = $state<Set<string>>(new Set());

  constructor() {
    this.#portfolioQuery = managedState<Record<string, OwnedTokenRecord[]>>({
      queryFn: () => {
        const principal = authState.account?.owner;
        if (!principal) {
          return Promise.resolve({});
        }
        return nftPortfolioService
          .getPortfolio(principal)
          .then((portfolio) => this.#applyOptimisticRemovals(portfolio));
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
    return (this.#portfolioQuery.data?.[collectionId] ?? []).filter(
      (record) =>
        !this.#optimisticRemovedTokenIds.has(
          this.#buildTokenKey(collectionId, record.tokenId),
        ),
    );
  }

  /**
   * Hide a just-sent NFT from nftGeek-sourced ownership until nftGeek catches up.
   */
  public removeToken(collectionId: string, tokenId: bigint): void {
    this.#optimisticRemovedTokenIds = new Set([
      ...this.#optimisticRemovedTokenIds,
      this.#buildTokenKey(collectionId, tokenId),
    ]);

    const currentPortfolio = this.#portfolioQuery.data;
    if (!currentPortfolio) {
      return;
    }

    this.#portfolioQuery.setData({
      ...currentPortfolio,
      [collectionId]: (currentPortfolio[collectionId] ?? []).filter(
        (record) => record.tokenId !== tokenId,
      ),
    });
  }

  /**
   * Reset the store to its initial (logged-out) state.
   */
  public reset(): void {
    this.#optimisticRemovedTokenIds = new Set();
    this.#portfolioQuery.reset();
  }

  #buildTokenKey(collectionId: string, tokenId: bigint): string {
    return `${collectionId}:${tokenId.toString()}`;
  }

  #applyOptimisticRemovals(
    portfolio: Record<string, OwnedTokenRecord[]>,
  ): Record<string, OwnedTokenRecord[]> {
    this.#reconcileOptimisticRemovals(portfolio);

    if (this.#optimisticRemovedTokenIds.size === 0) {
      return portfolio;
    }

    return Object.fromEntries(
      Object.entries(portfolio).map(([collectionId, records]) => [
        collectionId,
        records.filter(
          (record) =>
            !this.#optimisticRemovedTokenIds.has(
              this.#buildTokenKey(collectionId, record.tokenId),
            ),
        ),
      ]),
    );
  }

  #reconcileOptimisticRemovals(
    portfolio: Record<string, OwnedTokenRecord[]>,
  ): void {
    if (this.#optimisticRemovedTokenIds.size === 0) {
      return;
    }

    const reportedTokenIds = new Set(
      Object.entries(portfolio).flatMap(([collectionId, records]) =>
        records.map((record) =>
          this.#buildTokenKey(collectionId, record.tokenId),
        ),
      ),
    );
    this.#optimisticRemovedTokenIds = new Set(
      [...this.#optimisticRemovedTokenIds].filter((key) =>
        reportedTokenIds.has(key),
      ),
    );
  }
}

export const nftPortfolioStore = new NftPortfolioStore();
