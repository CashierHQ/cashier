import * as omnityHub from "$lib/generated/omnity_hub/omnity_hub.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_HUB_CANISTER_ID } from "$modules/bitcoin/constants";
import { Err, Ok, type Result } from "ts-results-es";

class OmnityHubService {
  #getActor(): omnityHub._SERVICE | null {
    return authState.buildActor({
      canisterId: OMNITY_HUB_CANISTER_ID,
      idlFactory: omnityHub.idlFactory,
    });
  }

  /**
   * Queries the Bitcoin txid for a given ticket ID
   * @param ticketId The ticket ID to query the tx hash for
   * @returns Bitcoin txid if successful, or an error message if the query fails
   */
  public async queryTxHash(ticketId: string): Promise<Result<string, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.query_tx_hash(ticketId);
      if ("Ok" in result) {
        return Ok(result.Ok);
      }

      return Err(
        `Error querying Omnity Hub tx hash: ${JSON.stringify(result.Err)}`,
      );
    } catch (error) {
      return Err(`Error querying Omnity Hub tx hash: ${error}`);
    }
  }
}

export const omnityHubService = new OmnityHubService();
