import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import type { TokenMetadata } from "$modules/token/types";
import { parseListTokens } from "../utils/parser";

class TokenStorageService {
  #getActor(): tokenStorage._SERVICE {
    if (authState.pnp && authState.pnp.isAuthenticated()) {
      return authState.pnp.getActor({
        canisterId: TOKEN_STORAGE_CANISTER_ID,
        idl: tokenStorage.idlFactory,
      });
    } else {
      throw new Error("User is not authenticated");
    }
  }

  public async listTokens(): Promise<TokenMetadata[]> {
    try {
      let actor = this.#getActor();
      console.log("Actor created:", actor);
      let res = await actor.list_tokens();
      console.log("Listed tokens:", res);

      return parseListTokens(res);
    } catch (error) {
      console.error("Error listing tokens:", error);
      throw error;
    }
  }
}

export const tokenStorageService = new TokenStorageService();
