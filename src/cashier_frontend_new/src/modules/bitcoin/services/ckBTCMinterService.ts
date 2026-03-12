import * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
import {
  type MinterInfo,
  type RetrieveBtcStatus,
  type WithdrawalFee,
} from "$modules/bitcoin/types/ckbtc_minter";
import { mapRetrieveBtcStatus } from "$modules/bitcoin/utils";
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

  /**
   * Request a ckBTC withdrawal using the user's ledger approval.
   * @param address the destination btc address
   * @param amount the withdrawl amount
   * @returns Result with the block index of the withdrawal request or an error message.
   */
  async retrieveBtcWithApproval(
    address: string,
    amount: bigint,
  ): Promise<Result<bigint, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    try {
      const result = await actor.retrieve_btc_with_approval({
        address,
        amount,
        from_subaccount: [],
      });

      if ("Ok" in result) {
        return Ok(result.Ok.block_index);
      }

      return Err(
        "Failed to retrieve BTC with approval: " + JSON.stringify(result.Err),
      );
    } catch (error) {
      return Err(
        "Error retrieving BTC with approval: " + (error as Error).message,
      );
    }
  }

  /**
   * Retrieve the status of a BTC withdrawal request by block index.
   * @param blockIndex
   * @returns Result with the retrieve BTC status or an error message.
   */
  async retrieveBtcStatusV2(
    blockIndex: bigint,
  ): Promise<Result<RetrieveBtcStatus, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    try {
      const result = await actor.retrieve_btc_status_v2({
        block_index: blockIndex,
      });
      return Ok(mapRetrieveBtcStatus(result));
    } catch (error) {
      return Err("Error retrieving BTC status: " + (error as Error).message);
    }
  }
}

export const ckBTCMinterService = new CkBTCMinterService();
