import * as omnityHub from "$lib/generated/omnity_hub/omnity_hub.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_HUB_BITCOIN_CANISTER_ID } from "$modules/bitcoin/constants";

/**
 * Service for interacting with the Omnity Hub canister.
 */
class OmnityHubService {
  /**
   * Get the authenticated omnityHub actor for the current user.
   *
   * @throws Error if the user is not authenticated
   */
  #getActor({
    anonymous = false,
  }: {
    anonymous?: boolean;
  }): omnityHub._SERVICE | null {
    return authState.buildActor({
      canisterId: OMNITY_HUB_BITCOIN_CANISTER_ID,
      idlFactory: omnityHub.idlFactory,
      options: {
        anonymous,
      },
    });
  }
}

export const omnityHubService = new OmnityHubService();
