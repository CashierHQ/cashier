import * as icrc7Ledger from "$lib/generated/icrc7_ledger/icrc7_ledger.did";
import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";

/**
 * NFT type representing a ICRC7 non-fungible token
 */
export type NFT = {
  readonly collectionId: string;
  readonly tokenId: bigint;
};

/**
 * NFT metadata type, including name, description, and image URL
 */
export type NFTMetadata = {
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
};

/**
 * ICRC7 collection metadata type, including name, description, and symbol
 */
export type CollectionMetadata = {
  readonly collectionName: string;
  readonly collectionDescription: string;
  readonly collectionSymbol: string;
};

/**
 * Enriched NFT type combining NFT data with its metadata and collection metadata
 */
export type EnrichedNFT = NFT & {
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly collectionName: string;
};

/**
 * Mapper class to convert token storage NFT data to local NFT types
 */
export class NFTMapper {
  /**
   * Map token storage NFT to local NFT type
   * @param nft token storage NFT data
   * @returns Local NFT type
   */
  public static fromTokenStorageNft(nft: tokenStorage.Nft): NFT {
    return {
      tokenId: nft.token_id,
      collectionId: nft.collection_id.toText(),
    };
  }
}

/**
 * Mapper class to convert ICRC7 ledger metadata to local NFTMetadata type
 */
export class NFTMetadataMapper {
  /**
   * Map ICRC7 ledger token metadata to local NFTMetadata type
   * @param metadata ICRC7 ledger token metadata
   * @returns local NFTMetadata type
   */
  public static fromIcrc7LedgerTokenMetadata(
    metadata: [] | [[string, icrc7Ledger.ICRC3Value][]],
  ): NFTMetadata {
    let name = "";
    let description = "";
    let imageUrl = "";

    if (metadata.length === 0) {
      return {
        name,
        description,
        imageUrl,
      };
    }

    for (const [key, value] of metadata[0]) {
      switch (key) {
        case "name":
          if ("Text" in value) {
            name = value.Text;
          }
          break;
        case "description":
          if ("Text" in value) {
            description = value.Text;
          }
          break;
        case "image":
          if ("Text" in value) {
            imageUrl = value.Text;
          }
          break;
      }
    }

    return {
      name,
      description,
      imageUrl,
    };
  }
}

/**
 * Mapper class to convert ICRC7 ledger collection metadata to local CollectionMetadata type
 */
export class CollectionMetadataMapper {
  /**
   * Map ICRC7 ledger collection metadata to local CollectionMetadata type
   * @param metadata ICRC7 ledger collection metadata
   * @returns local CollectionMetadata type
   */
  public static fromIcrc7LedgerCollectionMetadata(
    metadata: [string, icrc7Ledger.ICRC3Value][],
  ): CollectionMetadata {
    let collectionName = "";
    let collectionDescription = "";
    let collectionSymbol = "";

    for (const [key, value] of metadata) {
      switch (key) {
        case "icrc7:name":
          if ("Text" in value) {
            collectionName = value.Text;
          }
          break;
        case "icrc7:description":
          if ("Text" in value) {
            collectionDescription = value.Text;
          }
          break;
        case "icrc7:symbol":
          if ("Text" in value) {
            collectionSymbol = value.Text;
          }
          break;
      }
    }
    return {
      collectionName,
      collectionDescription,
      collectionSymbol,
    };
  }
}
