import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import {
  validateIndexCanister,
  validateLedgerCanister,
  ValidationError,
  type ValidationErrorType,
} from "$modules/token/services/canisterValidation";
import type { TokenMetadata } from "$modules/token/types";
import { parseListTokens } from "$modules/token/utils/parser";
import type { NFT } from "$modules/wallet/types/nft";
import { NFTMapper } from "$modules/wallet/types/nft";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service for interacting with the Token Storage canister
 * This service facilitates querying the list of user tokens.
 */
class TokenStorageService {
  /**
   * Get the authenticated Token Storage actor for the current user.
   * @returns The authenticated Token Storage actor.
   * @throws Error if the user is not authenticated
   */
  #getActor(): tokenStorage._SERVICE | null {
    return authState.buildActor({
      canisterId: TOKEN_STORAGE_CANISTER_ID,
      idlFactory: tokenStorage.idlFactory,
    });
  }

  /**
   * Get the list of user tokens from the Token Storage canister.
   * @returns List of user tokens.
   * @throws Error if fetching fails.
   */
  public async listTokens(): Promise<TokenMetadata[]> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res: tokenStorage.Result_5 = await actor.list_tokens();
    return parseListTokens(res);
  }

  /**
   * Toggle the enabled state of a token.
   * @param address The principal address of the token to toggle.
   * @param is_enabled The new enabled state of the token.
   */
  public async toggleToken(
    address: Principal,
    is_enabled: boolean,
  ): Promise<void> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_update_token_enable({
      token_id: { IC: { ledger_id: address } },
      is_enabled,
    });
    if ("Err" in res) {
      throw new Error(`Error updating token: ${res.Err}`);
    }
  }

  /**
   * Add a new token to the user wallet with validation
   * @param address The principal address of the token to add.
   * @param indexId Optional index canister ID for the token.
   * @param existingTokens List of existing token addresses for duplicate check.
   * @returns Result with void on success or ValidationError on failure.
   */
  public async addToken(
    address: Principal,
    indexId?: string,
    existingTokens?: string[],
  ): Promise<Result<void, ValidationErrorType>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(ValidationError.BACKEND_ERROR);
    }

    const addressStr = address.toText();

    // 1. Check if token already exists
    if (existingTokens?.includes(addressStr)) {
      return Err(ValidationError.TOKEN_EXISTS);
    }

    // 2. Validate ledger canister
    const ledgerResult = await validateLedgerCanister(addressStr);
    if (ledgerResult.isErr()) {
      return Err(ValidationError.INVALID_LEDGER);
    }

    // 3. Validate index canister if provided - must match ledger
    if (indexId) {
      const indexResult = await validateIndexCanister(indexId, addressStr);
      if (indexResult.isErr()) {
        return Err(indexResult.error);
      }
    }

    // 4. Call backend
    try {
      const res = await actor.user_add_token({
        token_id: { IC: { ledger_id: address } },
        index_id: indexId ? [indexId] : [],
      });

      if ("Err" in res) {
        return Err(ValidationError.BACKEND_ERROR);
      }

      return Ok(undefined);
    } catch {
      return Err(ValidationError.BACKEND_ERROR);
    }
  }

  /**
   * Get the NFTs owned by the user with pagination
   * @param start the starting index
   * @param limit the maximum number of NFTs to retrieve
   * @returns List of NFTs owned by the user
   */
  public async getNfts(start: number, limit: number): Promise<NFT[]> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_get_nfts({
      start: [start],
      limit: [limit],
    });

    return res.map((nft) => NFTMapper.fromTokenStorageNft(nft));
  }

  /**
   * Add a new NFT to the user's collection
   * @param collectionAddress the canister Id of the NFT collection
   * @param tokenId the token ID of the NFT
   * @returns Result with void on success or error message on failure
   */
  public async addNft(
    collectionAddress: Principal,
    tokenId: bigint,
  ): Promise<Result<void, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      await actor.user_add_nft({
        nft: {
          collection_id: collectionAddress,
          token_id: tokenId,
        },
      });
      return Ok(undefined);
    } catch (err) {
      return Err(`Error adding NFT: ${err}`);
    }
  }
}

export const tokenStorageService = new TokenStorageService();
