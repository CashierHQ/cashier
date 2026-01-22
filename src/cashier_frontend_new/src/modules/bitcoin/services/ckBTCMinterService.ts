import * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
import {
  type MinterInfo,
  type WithdrawalFee,
} from "$modules/bitcoin/types/ckbtc_minter";
import { Err, Ok, type Result } from "ts-results-es";

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

  async getDepositFee(): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    return actor.get_deposit_fee();
  }

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

  async getMinterInfo(): Promise<MinterInfo> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    return actor.get_minter_info();
  }

  async updateBalance(): Promise<Result<number, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const result = await actor.update_balance({ owner: [], subaccount: [] });
    console.log("ckBTC Minter - update balance result:", result);

    if ("Ok" in result) {
      return Ok(result.Ok.length);
    } else {
      return Err("Failed to update balance: " + result.Err);
    }
  }
}

export const ckBTCMinterService = new CkBTCMinterService();
