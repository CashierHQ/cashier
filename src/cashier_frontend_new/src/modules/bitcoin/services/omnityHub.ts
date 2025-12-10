import * as omnityHub from "$lib/generated/omnity_hub/omnity_hub.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { OMNITY_HUB_BITCOIN_CANISTER_ID } from "$modules/bitcoin/constants";
import { Ok, type Result } from "ts-results-es";
import type { OmnityRuneToken } from "../types";

/**
 * Service for interacting with the Omnity Hub canister.
 */
class OmnityHubService {
  readonly #targetChainId = "eICP";

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

  /**
   * Query the Omnity Hub canister for the list of supported Rune tokens.
   * @returns list of OmnityRuneToken
   * @throws Error if the user is not authenticated or the query fails
   */
  async getTokenList(): Promise<OmnityRuneToken[]> {
    const actor = this.#getActor({ anonymous: true });
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const response = await actor.get_token_list();
    const result: OmnityRuneToken[] = [];
    for (const token of response) {
      result.push({
        token_id: token.token_id,
        symbol: token.symbol,
        decimals: token.decimals,
        rune_id: token.rune_id,
      });
    }

    return result;
  }

  async getBitcoinAddress(principalId: string): Promise<string> {
    const actor = this.#getActor({ anonymous: true });
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const response = await actor.get_btc_address({
      target_chain_id: this.#targetChainId,
      receiver: principalId,
    });
    return response;
  }

  async generateTicket(
    txid: string,
    principalId: string,
    amount: bigint,
    runeId: string,
  ): Promise<Result<string, string>> {
    const actor = this.#getActor({ anonymous: false });
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const ticketArgs = {
      txid,
      target_chain_id: this.#targetChainId,
      amount,
      receiver: principalId,
      rune_id: runeId,
    };

    const result = await actor.generate_ticket(ticketArgs);
    console.log("Generated ticket result:", result);

    return Ok("Ticket generated successfully");
  }
}

export const omnityHubService = new OmnityHubService();
