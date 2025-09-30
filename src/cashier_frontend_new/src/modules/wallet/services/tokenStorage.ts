import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import { accountState } from "$modules/shared/state/auth.svelte";

class TokenStorageService {
  #getActor(): tokenStorage._SERVICE {
    console.log("account state", accountState.account);
    console.log("auth state pnp", authState.pnp?.isAuthenticated());
    if (authState.pnp) {
      console.log("is authenticated", authState.pnp);
      return authState.pnp.getActor({
        canisterId: TOKEN_STORAGE_CANISTER_ID,
        idl: tokenStorage.idlFactory,
      });
    } else {
      throw new Error("User is not authenticated");
    }
  }

  public async listTokens(): Promise<any> {
    try {
      let actor = this.#getActor();
      console.log("Actor created:", actor);
      let res = await actor.list_tokens();
      console.log("Listed tokens:", res);
      return res;
    } catch (error) {
      console.error("Error listing tokens:", error);
      throw error;
    }
  }
}

export const tokenStorageService = new TokenStorageService();
