import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { responseToResult } from "$lib/result";
import { authState } from "$modules/auth/state/auth.svelte";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Err, type Result } from "ts-results-es";

/**
 * Service for interacting with the Cashier Backend canister.
 */
class CanisterBackendService {
  /**
   * Get the authenticated cashierBackend actor for the current user.
   *
   * @throws Error if the user is not authenticated
   */
  #getActor(): cashierBackend._SERVICE | null {
      return authState.buildActor({
        canisterId: CASHIER_BACKEND_CANISTER_ID,
        idlFactory: cashierBackend.idlFactory,
      });
  }

  /**
   * Returns a list of links for the current user.
   */
  async getLinks(): Promise<Result<cashierBackend.LinkDto[], Error>> {
    let actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }
    const response = await actor.get_links([
      {
        offset: BigInt(0),
        limit: BigInt(100),
      },
    ]);

    return responseToResult(response).map((res) => res.data);
  }

}

export const cashierBackendService = new CanisterBackendService();