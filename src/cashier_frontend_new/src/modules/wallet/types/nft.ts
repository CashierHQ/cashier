import * as icrc7Ledger from "$lib/generated/icrc7_ledger/icrc7_ledger.did";
import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";

export type NFT = {
  readonly tokenId: bigint;
  readonly collectionId: string;
};

export type NFTMetadata = {
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
};

export type CollectionMetadata = {
  readonly collectionName: string;
  readonly collectionDescription: string;
  readonly collectionSymbol: string;
};

export type EnrichedNFT = NFT & {
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly collectionName: string;
};

export class NFTMapper {
  public static fromTokenStorageNft(nft: tokenStorage.Nft): NFT {
    return {
      tokenId: nft.token_id,
      collectionId: nft.collection_id.toText(),
    };
  }
}

export class NFTMetadataMapper {
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

export class CollectionMetadataMapper {
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
