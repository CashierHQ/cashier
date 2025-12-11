import * as omnityExecution from "$lib/generated/omnity_execution/omnity_execution.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_EXECUTION_CANISTER_ID } from "$modules/bitcoin/constants";

/**
 * Service for interacting with the Omnity Hub canister.
 */
class OmnityExecutionService {
  readonly #targetChainId = "Bitcoin";

  /**
   * Get the authenticated omnityHub actor for the current user.
   *
   * @throws Error if the user is not authenticated
   */
  #getActor({
    anonymous = false,
  }: {
    anonymous?: boolean;
  }): omnityExecution._SERVICE | null {
    return authState.buildActor({
      canisterId: OMNITY_EXECUTION_CANISTER_ID,
      idlFactory: omnityExecution.idlFactory,
      options: {
        anonymous,
      },
    });
  }

  async generateTicketV2(
    receiver: string,
    runeId: string,
    amount: bigint,
  ): Promise<string> {
    const actor = this.#getActor({ anonymous: false });
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const ticketArgs: omnityExecution.GenerateTicketReq = {
      target_chain_id: this.#targetChainId,
      receiver,
      token_id: runeId,
      amount,
      action: { Redeem: null },
      from_subaccount: [],
    };

    const result = await actor.generate_ticket_v2(ticketArgs);
    console.log("generateTicketV2 result:", result);

    if ("Err" in result) {
      throw new Error(
        `Failed to generate ticket: ${JSON.stringify(result.Err)}`,
      );
    }

    return result.Ok.ticket_id;
  }
}

export const omnityExecutionService = new OmnityExecutionService();
