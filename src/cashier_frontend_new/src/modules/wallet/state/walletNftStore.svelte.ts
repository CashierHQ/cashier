import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { NFT_PAGE_SIZE } from "$modules/wallet/constants";
import { Icrc7Service } from "$modules/wallet/services/icrc7Service";
import {
  getDemoDisabledCollectionIds,
  getDemoNfts,
} from "$modules/wallet/services/nftDemoData";
import type {
  CollectionMetadata,
  EnrichedNFT,
  NFT,
} from "$modules/wallet/types/nft";
import type { Principal } from "@icp-sdk/core/principal";
import { SvelteSet } from "svelte/reactivity";

/**
 * Store managing the user's wallet NFTs
 */
class WalletNftStore {
  #walletNftQuery;
  collectionMetadataCache: Map<string, CollectionMetadata> = new Map();
  #currentPage: number = 0;
  #allNfts: EnrichedNFT[] = [];
  #disabledCollectionIds = new SvelteSet<string>(
    getDemoDisabledCollectionIds(),
  );
  hasMore = $state<boolean>(true);

  constructor() {
    this.#walletNftQuery = managedState<EnrichedNFT[]>({
      queryFn: async () => {
        const start = this.#currentPage * NFT_PAGE_SIZE;
        let nfts: NFT[] = [];

        try {
          nfts = await tokenStorageService.getNfts(start, NFT_PAGE_SIZE);
        } catch (error) {
          if (import.meta.env.DEV) {
            this.hasMore = false;
            this.#allNfts = getDemoNfts();
            return this.#allNfts;
          }

          throw error;
        }

        if (import.meta.env.DEV && nfts.length === 0) {
          this.hasMore = false;
          this.#allNfts = getDemoNfts();
          return this.#allNfts;
        }

        if (nfts.length < NFT_PAGE_SIZE) {
          this.hasMore = false;
        }

        // collect metadata for each NFT
        const metadataRequests = nfts.map((nft) => {
          const icrc7Service = new Icrc7Service(nft.collectionId);
          return icrc7Service.getTokenMetadata(nft.tokenId);
        });

        const metadatas = await Promise.all(metadataRequests);

        // collect collection metadata for each NFT (using cache to avoid duplicate calls)
        const collectionMetadataRequests = nfts.map((nft) =>
          this.getCollectionMetadata(nft.collectionId),
        );
        const collectionMetadatas = await Promise.all(
          collectionMetadataRequests,
        );

        // enrich NFTs with metadata and collection metadata
        const enrichedNfts: EnrichedNFT[] = nfts.map((nft, index) => ({
          ...nft,
          ...metadatas[index],
          ...collectionMetadatas[index],
        }));

        // append fetched NFTs to the existing list
        if (this.#currentPage === 0) {
          this.#allNfts = enrichedNfts;
        } else {
          const previousNfts = this.#allNfts.slice(0, start);
          this.#allNfts = [...previousNfts, ...enrichedNfts];
        }

        return this.#allNfts;
      },
      refetchInterval: 15_000, // Refresh every 15 seconds to keep NFTs up-to-date
      persistedKey: ["walletNftQuery"],
      storageType: "localStorage",
    });

    $effect.root(() => {
      $effect(() => {
        // Reset the wallet tokens data when user logs out
        if (authState.account == null) {
          this.reset();
          return;
        }
        // Refresh the wallet tokens data when user logs in
        this.#walletNftQuery.refresh();
      });
    });
  }

  get query() {
    return this.#walletNftQuery;
  }

  /**
   * Load more NFTs for pagination
   * @returns
   */
  public loadMore() {
    if (!this.hasMore) {
      return;
    }
    this.#currentPage += 1;
    this.#walletNftQuery.refresh();
  }

  /**
   * Reset the NFT store to initial state
   */
  public reset() {
    this.#currentPage = 0;
    this.#allNfts = [];
    this.resetCollectionVisibility();
    this.hasMore = true;
    this.#walletNftQuery.reset();
  }

  /**
   * Check whether a collection should be visible in the wallet NFT list.
   * @param collectionId collection canister id
   * @returns true when the collection is not hidden locally
   */
  public isCollectionEnabled(collectionId: string): boolean {
    return !this.#disabledCollectionIds.has(collectionId);
  }

  /**
   * Toggle local collection visibility until backend persistence exists.
   * @param collectionId collection canister id
   * @param enabled whether the collection should be shown in the NFT list
   */
  public setCollectionEnabled(collectionId: string, enabled: boolean): void {
    if (enabled) {
      this.#disabledCollectionIds.delete(collectionId);
      return;
    }

    this.#disabledCollectionIds.add(collectionId);
  }

  /**
   * Reset local collection visibility to the local demo defaults.
   */
  private resetCollectionVisibility(): void {
    this.#disabledCollectionIds.clear();

    for (const collectionId of getDemoDisabledCollectionIds()) {
      this.#disabledCollectionIds.add(collectionId);
    }
  }

  /**
   * Add a new NFT to the user's collection
   * @param collectionAddress
   * @param tokenId
   */
  public async addNft(
    collectionAddress: Principal,
    tokenId: bigint,
  ): Promise<void> {
    const result = await tokenStorageService.addNft(collectionAddress, tokenId);
    if (result.isErr()) {
      throw new Error(result.unwrapErr());
    }
    // Refresh the NFT list after adding a new NFT
    this.#walletNftQuery.refresh();
  }

  /**
   * Look up the collection metadata, using cache to minimize calls
   * @param collectionId
   * @returns The metadata of the collection
   */
  public async getCollectionMetadata(
    collectionId: string,
  ): Promise<CollectionMetadata> {
    if (this.collectionMetadataCache.has(collectionId)) {
      return this.collectionMetadataCache.get(collectionId)!;
    }

    const icrc7Service = new Icrc7Service(collectionId);
    const collectionMetadata = await icrc7Service.getCollectionMetadata();
    this.collectionMetadataCache.set(collectionId, collectionMetadata);

    return collectionMetadata;
  }
}

export const walletNftStore = new WalletNftStore();
