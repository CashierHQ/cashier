import * as icrc7Ledger from "$lib/generated/icrc7_ledger/icrc7_ledger.did";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  CollectionMetadataMapper,
  NFTMetadataMapper,
  type CollectionMetadata,
  type NFTMetadata,
} from "$modules/wallet/types/nft";

/**
 * Service for interacting with a specific Icrc7 Ledger
 */
export class Icrc7Service {
  #canisterId: string;

  constructor(collectionId: string) {
    this.#canisterId = collectionId;
  }

  /**
   * Get the authenticated Icrc Ledger actor for the current user.
   * @returns Authenticated Icrc Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icrc7Ledger._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: icrc7Ledger.idlFactory,
    });
  }

  /**
   * Look up the metadata for a specific token ID.
   * @param tokenId
   * @returns NFTMetadata
   */
  public async getTokenMetadata(tokenId: bigint): Promise<NFTMetadata> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.icrc7_token_metadata([tokenId]);
    return NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(res[0]);
  }

  /**
   * Look up the collection metadata.
   * @returns CollectionMetadata
   */
  public async getCollectionMetadata(): Promise<CollectionMetadata> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.icrc7_collection_metadata();
    return CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(res);
  }
}
