import { managedState } from "$lib/managedState";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { Icrc7Service } from "$modules/wallet/services/icrc7Service";
import type {
  CollectionMetadata,
  EnrichedNFT,
  NFT,
} from "$modules/wallet/types/nft";
import type { Principal } from "@dfinity/principal";

class WalletNftStore {
  #walletNftQuery;
  collectionMetadataCache: Map<string, CollectionMetadata> = new Map();

  constructor() {
    this.#walletNftQuery = managedState<EnrichedNFT[]>({
      queryFn: async () => {
        const nfts: NFT[] = await tokenStorageService.getNfts(0, 10);

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

        console.log("Enriched NFTs:", enrichedNfts);

        return enrichedNfts;
      },
      refetchInterval: 15_000, // Refresh every 15 seconds to keep NFTs up-to-date
      persistedKey: ["walletNftQuery"],
      storageType: "localStorage",
    });
  }

  get query() {
    return this.#walletNftQuery;
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
    await tokenStorageService.addNft(collectionAddress, tokenId);
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
