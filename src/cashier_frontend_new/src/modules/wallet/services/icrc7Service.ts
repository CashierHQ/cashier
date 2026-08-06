import * as icrc7Ledger from "$lib/generated/icrc7_ledger/icrc7_ledger.did";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  CollectionMetadataMapper,
  NFTMetadataMapper,
  type CollectionMetadata,
  type NFTMetadata,
} from "$modules/wallet/types/nft";
import type { Principal } from "@icp-sdk/core/principal";
import { Err, Ok, type Result } from "ts-results-es";

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

  /**
   * Transfer a single NFT to another principal.
   * @param tokenId token id to transfer
   * @param to recipient principal
   * @returns block index on success or readable error
   */
  public async transfer(
    tokenId: bigint,
    to: Principal,
  ): Promise<Result<bigint, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    const [entry] = await actor.icrc7_transfer([
      {
        to: { owner: to, subaccount: [] },
        token_id: tokenId,
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      },
    ]);

    if (!entry || entry.length === 0) {
      return Err("No response from ledger");
    }

    const [result] = entry;
    if ("Ok" in result) {
      return Ok(result.Ok);
    }
    if ("Duplicate" in result.Err) {
      return Ok(result.Err.Duplicate.duplicate_of);
    }

    return Err(mapIcrc7TransferError(result.Err));
  }
}

function mapIcrc7TransferError(error: icrc7Ledger.TransferError): string {
  if ("GenericError" in error) {
    return `${error.GenericError.message} (code: ${error.GenericError.error_code})`;
  }
  if ("NonExistingTokenId" in error) {
    return "Token does not exist";
  }
  if ("Unauthorized" in error) {
    return "Unauthorized transfer";
  }
  if ("CreatedInFuture" in error) {
    return `Created in future: ${error.CreatedInFuture.ledger_time}`;
  }
  if ("InvalidRecipient" in error) {
    return "Invalid recipient";
  }
  if ("GenericBatchError" in error) {
    return `${error.GenericBatchError.message} (code: ${error.GenericBatchError.error_code})`;
  }
  return "Transaction is too old";
}
