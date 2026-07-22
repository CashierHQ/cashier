import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { collectionService } from "$modules/wallet/services/collectionService";
import { COLLECTION_PAGE_SIZE } from "$modules/wallet/constants";
import type { CollectionSummary } from "$modules/wallet/types/nft";
import { Principal } from "@icp-sdk/core/principal";

/**
 * Store managing the NFT collection registry and the current user's enabled collections.
 * Replaces the client-only enable/disable stopgap previously kept in walletNftStore.
 */
class CollectionStore {
  #registryQuery;
  enabledCollectionIds = $state<Set<string>>(new Set());

  constructor() {
    this.#registryQuery = managedState<CollectionSummary[]>({
      queryFn: async () => {
        const collections: CollectionSummary[] = [];
        let start = 0;

        // The registry is paginated server-side; fetch every page up front since
        // Manage Collections is a flat searchable list, not an infinite-scroll grid.
        while (true) {
          const page = await collectionService.listCollections(
            start,
            COLLECTION_PAGE_SIZE,
          );
          collections.push(...page);
          if (page.length < COLLECTION_PAGE_SIZE) break;
          start += COLLECTION_PAGE_SIZE;
        }

        return collections;
      },
      refetchInterval: 60_000,
      persistedKey: ["collectionRegistryQuery"],
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
        this.#registryQuery.refresh();
        this.#refreshEnabledCollectionIds();
      });
    });
  }

  get query() {
    return this.#registryQuery;
  }

  /**
   * Check whether a collection is enabled for the current user.
   * @param collectionId collection canister id
   */
  public isCollectionEnabled(collectionId: string): boolean {
    return this.enabledCollectionIds.has(collectionId);
  }

  /**
   * Enable or disable a collection for the current user, persisted on the canister.
   * @param collectionId collection canister id
   * @param isEnabled the new enabled state
   */
  public async toggleCollection(
    collectionId: string,
    isEnabled: boolean,
  ): Promise<void> {
    await collectionService.setCollectionEnabled(
      Principal.fromText(collectionId),
      isEnabled,
    );
    await this.#refreshEnabledCollectionIds();
  }

  /**
   * Reset the store to its initial (logged-out) state.
   */
  public reset(): void {
    this.enabledCollectionIds = new Set();
    this.#registryQuery.reset();
  }

  async #refreshEnabledCollectionIds(): Promise<void> {
    try {
      this.enabledCollectionIds =
        await collectionService.getEnabledCollectionIds();
    } catch (error) {
      console.warn("Failed to fetch enabled collections:", error);
    }
  }
}

export const collectionStore = new CollectionStore();
