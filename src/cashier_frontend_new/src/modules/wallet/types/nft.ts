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
  readonly owner?: string;
  readonly mintedAt?: string;
  readonly lastTransferAt?: string;
  readonly collectionName: string;
  readonly collectionDescription?: string;
  readonly collectionImageUrl?: string;
  readonly collectionSymbol?: string;
  readonly rarity?: string;
  readonly supply?: string;
  readonly floor?: string;
  readonly type?: string;
  readonly standard?: string;
  readonly symbol?: string;
  readonly attributes?: NftAttribute[];
};

/**
 * A token the current user owns according to nftGeek's portfolio lookup. nftGeek only
 * reports ownership (no image/name/attributes), so this is deliberately minimal.
 */
export type OwnedTokenRecord = {
  readonly tokenId: bigint;
  readonly lastUpdatedAt?: string;
};

/**
 * NFT trait display model used by detail cards.
 */
export type NftAttribute = {
  readonly traitType: string;
  readonly value: string;
  readonly rarity?: string;
};

/**
 * NFT collection display model used by collection grid and manage screens.
 */
export type NftCollectionSummary = {
  readonly collectionId: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly itemCount: number;
  readonly supply?: string;
  readonly floor?: string;
  readonly type?: string;
  readonly standard?: string;
  readonly symbol?: string;
};

/**
 * Registry collection display model, sourced from the token_storage collection registry
 * (not derived from owned NFTs). `itemCount` here is the collection's total supply, not
 * how many the current user owns — real ownership counts are a later ("User portfolio") phase.
 */
export type CollectionSummary = {
  readonly collectionId: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly itemCount: number;
  readonly floorPrice?: bigint;
  readonly standard: string;
  readonly isCashier: boolean;
  readonly isDefault: boolean;
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
 * Mapper class to convert token storage CollectionDto data to the local display type
 */
export class CollectionMapper {
  /**
   * Map a token storage CollectionDto to a local CollectionSummary
   * @param dto token storage collection registry entry
   * @returns Local CollectionSummary type
   */
  public static fromCollectionDto(
    dto: tokenStorage.CollectionDto,
  ): CollectionSummary {
    return {
      collectionId: dto.collection_id.toText(),
      name: dto.name,
      description: dto.description,
      imageUrl: dto.image,
      itemCount: Number(dto.total_items),
      floorPrice: dto.floor_price[0],
      standard: dto.standard,
      isCashier: dto.is_cashier,
      isDefault: dto.is_default,
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

/**
 * Unique identifier type for NFTs in the nftGeek system
 */
export type NftGeekUniqueIdentifier = {
  uniqueIdentifierType: string;
  id: string;
};

/**
 * Token type for NFTs in the nftGeek system, including token ID, timestamp, and unique identifier
 */
export type NftGeekToken = {
  tokenId: number;
  timeMillis: number;
  uniqueIdentifier: NftGeekUniqueIdentifier;
};

/**
 * Response type for the nftGeek registry API, mapping collection IDs to their owned tokens
 */
export type NftGeekRegistryResponse = {
  registry: Record<string, { tokens: NftGeekToken[] }>;
};
