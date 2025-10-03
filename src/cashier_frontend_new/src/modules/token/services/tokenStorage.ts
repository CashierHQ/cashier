import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import type { TokenMetadata } from "$modules/token/types";
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
}

export const tokenStorageService = new TokenStorageService();
