import * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
import { type WithdrawalFee } from "$modules/bitcoin/types/ckbtc_minter";

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
}

export const ckBTCMinterService = new CkBTCMinterService();
