import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import type { TokenMetadata } from "$modules/token/types";
import { Principal } from "@dfinity/principal";
import { parseListTokens } from "../utils/parser";

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
   * Add a new token to the user wallet
   * @param address The principal address of the token to add.
   * @param indexId Optional index canister ID for the token.
   */
  public async addToken(address: Principal, indexId?: string): Promise<void> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_add_token({
      token_id: { IC: { ledger_id: address } },
      index_id: indexId ? [indexId] : [],
    });
    if ("Err" in res) {
      throw new Error(`Error adding token: ${res.Err}`);
    }
  }
}

export const tokenStorageService = new TokenStorageService();
