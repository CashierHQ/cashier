import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Actor, HttpAgent } from "@dfinity/agent";

class UserTokenService {
  #anonymousActor: tokenStorage._SERVICE;

  constructor() {
    const agent = HttpAgent.createSync({
      host: "http://localhost:8000",
      shouldFetchRootKey: true,
    });
    this.#anonymousActor = Actor.createActor(tokenStorage.idlFactory, {
      agent,
      canisterId: TOKEN_STORAGE_CANISTER_ID,
    });
  }

  #getActor(): tokenStorage._SERVICE {
    if (accountState.account && authState.pnp) {
      return authState.pnp.getActor({
        canisterId: TOKEN_STORAGE_CANISTER_ID,
        idl: tokenStorage.idlFactory,
      }) as tokenStorage._SERVICE;
    }
    return this.#anonymousActor;
  }

  public async listTokens(): Promise<any> {
    try {
      let res = await this.#getActor().list_tokens();
      console.log("Listed tokens:", res);
      return res;
    } catch (error) {
      console.error("Error listing tokens:", error);
      throw error;
    }
  }
}

export const userTokenService = new UserTokenService();
