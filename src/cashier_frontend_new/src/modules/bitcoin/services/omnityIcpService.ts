import * as omnityIcp from "$lib/generated/omnity_icp/omnity_icp.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_ICP_CANISTER_ID } from "$modules/bitcoin/constants";
import { Err, Ok, type Result } from "ts-results-es";

class OmnityIcpService {
  #getActor(): omnityIcp._SERVICE | null {
    return authState.buildActor({
      canisterId: OMNITY_ICP_CANISTER_ID,
      idlFactory: omnityIcp.idlFactory,
    });
  }

  /**
   * Get the redeem fee for export ticket
   * @param chainId The chain ID for which to get the redeem fee
   * @returns The redeem fee if successful, or an error message if the query fails
   */
  public async getRedeemFee(chainId: string): Promise<Result<bigint, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.get_redeem_fee(chainId);
      if (result.length === 0) {
        return Err("Redeem fee is not configured.");
      }

      return Ok(result[0]);
    } catch (error) {
      return Err(`Error fetching Omnity redeem fee: ${error}`);
    }
  }

  /**
   * Create a new export ticket on Omnity
   * @param args The arguments for generating the ticket
   * @returns The ticket ID if successful, or an error message if the creation fails
   */
  public async generateTicketV2(
    args: omnityIcp.GenerateTicketReq,
  ): Promise<Result<string, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const result = await actor.generate_ticket_v2(args);
      if ("Ok" in result) {
        return Ok(result.Ok.ticket_id);
      }

      return Err(
        `Error generating Omnity ICP ticket: ${JSON.stringify(result.Err)}`,
      );
    } catch (error) {
      return Err(`Error generating Omnity ICP ticket: ${error}`);
    }
  }
}

export const omnityIcpService = new OmnityIcpService();
