import * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
import {
  type MinterInfo,
  type WithdrawalFee,
} from "$modules/bitcoin/types/ckbtc_minter";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service to interact with the ckBTC Minter canister.
 */
export class CkBTCMinterService {
  #canisterId: string;

  constructor() {
    this.#canisterId = CKBTC_MINTER_CANISTER_ID;
  }

  /**
   * Create and return the ckBTC Minter actor for the current user.
   * @returns
   */
  #getActor(): ckBTCMinter._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: ckBTCMinter.idlFactory,
    });
  }

  /**
   * Fetch the deposit fee from the ckBTC Minter canister.
   * @returns fee as bigint
   */
  async getDepositFee(): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    return actor.get_deposit_fee();
  }

  /**
   * Fetch the withdrawal fee for a given amount from the ckBTC Minter canister.
   * @param amount
   * @returns WithdrawalFee
   */
  async getWithdrawalFee(amount: bigint): Promise<WithdrawalFee> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const withdrawalFee = await actor.estimate_withdrawal_fee({
      amount: [amount],
    });
    return withdrawalFee;
  }

  /**
   * Fetch minter info from the ckBTC Minter canister.
   * @returns MinterInfo
   */
  async getMinterInfo(): Promise<MinterInfo> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    return actor.get_minter_info();
  }

  /**
   * Update the balance in the ckBTC Minter canister for the current user.
   * @returns Result with the number of updated balances or an error message.
   */
  async updateBalance(): Promise<Result<number, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    try {
      const result = await actor.update_balance({ owner: [], subaccount: [] });

      if ("Ok" in result) {
        return Ok(result.Ok.length);
      } else {
        return Err("Failed to update balance: " + JSON.stringify(result.Err));
      }
    } catch (error) {
      return Err("Error updating balance: " + (error as Error).message);
    }
  }
}

export const ckBTCMinterService = new CkBTCMinterService();
