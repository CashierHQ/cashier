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

  /**
   * Queries recent tickets for an account and optional receiver/token filters.
   * @param sender The account sending the transaction (optional)
   * @param receiver The account receiving the transaction (optional)
   * @param tokenId The token ID involved in the transaction (optional)
   * @param timeRange The time range to filter transactions by (start and end timestamps)
   * @param start The starting index for pagination (optional, default is 0)
   * @param limit The maximum number of results to return (optional, default is 100)
   * @returns Matching Omnity tickets on success, or an error message on failure
   */
  public async getTxsWithAccount(args: {
    sender: string;
    receiver: string;
    tokenId: string;
    timeRange: [bigint, bigint];
    start?: bigint;
    limit?: bigint;
  }): Promise<Result<omnityHub.Ticket[], string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.get_txs_with_account(
        [args.sender],
        [args.receiver],
        [args.tokenId],
        [[args.timeRange[0], args.timeRange[1]]],
        args.start ?? 0n,
        args.limit ?? 100n,
      );

      if ("Ok" in result) {
        return Ok(result.Ok);
      }

      return Err(
        `Error querying Omnity Hub tickets: ${JSON.stringify(result.Err)}`,
      );
    } catch (error) {
      return Err(`Error querying Omnity Hub tickets: ${error}`);
    }
  }
}

export const omnityHubService = new OmnityHubService();
