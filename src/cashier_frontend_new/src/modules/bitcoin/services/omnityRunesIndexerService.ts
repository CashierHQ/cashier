import * as omnityRunesIndexer from "$lib/generated/omnity_runes_indexer/omnity_runes_indexer.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_RUNES_INDEXER_CANISTER_ID } from "$modules/bitcoin/constants";
import { Err, Ok, type Result } from "ts-results-es";

class OmnityRunesIndexerService {
  #getActor(): omnityRunesIndexer._SERVICE | null {
    return authState.buildActor({
      canisterId: OMNITY_RUNES_INDEXER_CANISTER_ID,
      idlFactory: omnityRunesIndexer.idlFactory,
    });
  }

  /**
   * Get Rune balances for a list of Bitcoin outputs
   * @param outputs List of Bitcoin outputs (in the format "txid:vout")
   * @returns Result with an array of Rune balances for each output on success or error message on failure
   */
  public async getRuneBalancesForOutputs(
    outputs: string[],
  ): Promise<Result<Array<[] | [omnityRunesIndexer.RuneBalance[]]>, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.get_rune_balances_for_outputs(outputs);
      if ("Ok" in result) {
        return Ok(result.Ok);
      }

      return Err(`Error fetching Rune balances: ${JSON.stringify(result.Err)}`);
    } catch (error) {
      return Err(`Error fetching Rune balances: ${error}`);
    }
  }
}

export const omnityRunesIndexerService = new OmnityRunesIndexerService();
