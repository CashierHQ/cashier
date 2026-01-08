import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";

/**
 * NFT Type Definitions
 */
export type NFT = {
  readonly id: bigint;
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly collectionName: string;
  readonly collectionAddress: string;
};

export class NFTMapper {
  public static fromTokenStorageNft(nft: tokenStorage.Nft): NFT {
    return {
      id: nft.token_id,
      name: "",
      description: "",
      image: "",
      collectionName: "",
      collectionAddress: nft.collection_id.toText(),
    };
  }
}
