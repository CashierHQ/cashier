import * as omnityBitcoin from "$lib/generated/omnity_bitcoin/omnity_bitcoin.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_BITCOIN_CANISTER_ID } from "$modules/bitcoin/constants";
import { Err, Ok, type Result } from "ts-results-es";

class OmnityBitcoinService {
  #getActor(): omnityBitcoin._SERVICE | null {
    return authState.buildActor({
      canisterId: OMNITY_BITCOIN_CANISTER_ID,
      idlFactory: omnityBitcoin.idlFactory,
    });
  }

  /**
   * Generate new Omnity ticket
   * @param args Generate ticket arguments
   * @returns Result with void on success or error message on failure
   */
  public async generateTicket(
    args: omnityBitcoin.GenerateTicketArgs,
  ): Promise<Result<void, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.generate_ticket(args);
      if ("Ok" in result) {
        return Ok(undefined);
      }

      return Err(
        `Error generating Omnity ticket: ${JSON.stringify(result.Err)}`,
      );
    } catch (error) {
      return Err(`Error generating Omnity ticket: ${error}`);
    }
  }

  /**
   * Lookup Omnity ticket status by txid
   * @param txid Transaction ID of the Bitcoin transaction associated with the ticket
   * @returns Result with ticket status on success or error message on failure
   */
  public async generateTicketStatus(
    txid: string,
  ): Promise<Result<omnityBitcoin.GenTicketStatus, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.generate_ticket_status(txid);
      return Ok(result);
    } catch (error) {
      return Err(`Error fetching Omnity ticket status: ${error}`);
    }
  }
}

export const omnityBitcoinService = new OmnityBitcoinService();
