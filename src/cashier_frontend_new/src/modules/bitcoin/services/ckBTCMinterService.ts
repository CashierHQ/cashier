import * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
import {
  type MintedUtxoInfo,
  type MinterInfo,
  type RetrieveBtcStatus,
  type RetrieveBtcStatusByAccountItem,
  type WithdrawalFee,
} from "$modules/bitcoin/types/ckbtc_minter";
import { mapRetrieveBtcStatus } from "$modules/bitcoin/utils";
import { Principal } from "@icp-sdk/core/principal";
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
  #getActor({
    anonymous = false,
  }: { anonymous?: boolean } = {}): ckBTCMinter._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: ckBTCMinter.idlFactory,
      options: { anonymous },
    });
  }

  async getDepositFee(): Promise<bigint> {
    return this.#getActor({ anonymous: true })!.get_deposit_fee();
  }

  async getWithdrawalFee(amount: bigint): Promise<WithdrawalFee> {
    return this.#getActor({ anonymous: true })!.estimate_withdrawal_fee({
      amount: [amount],
    });
  }

  async getMinterInfo(): Promise<MinterInfo> {
    return this.#getActor({ anonymous: true })!.get_minter_info();
  }

  /**
   * Call update_balance and return info about all successfully minted UTXOs.
   * Used by the manual refresh flow to detect confirmed incoming BTC.
   * Returns an empty array (Ok([])) when no UTXOs were minted.
   * @returns Result with array of MintedUtxoInfo or an error message.
   */
  async updateBalanceWithMintedInfo(): Promise<
    Result<MintedUtxoInfo[], string>
  > {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    try {
      const result = await actor.update_balance({ owner: [], subaccount: [] });
      if ("Err" in result) {
        // NoNewUtxos is not a real error — treat it as an empty minted list
        if ("NoNewUtxos" in result.Err) {
          return Ok([]);
        }
        return Err("Failed to update balance: " + JSON.stringify(result.Err));
      }
      const mintedInfos: MintedUtxoInfo[] = result.Ok.filter(
        (status) => "Minted" in status,
      ).map((status) => {
        const minted = (
          status as {
            Minted: {
              block_index: bigint;
              minted_amount: bigint;
              utxo: {
                height: number;
                outpoint: { txid: Uint8Array | number[] };
              };
            };
          }
        ).Minted;
        // ckBTC minter returns outpoint.txid in little-endian (internal Bitcoin)
        // byte order; reverse to get the display txid used by block explorers
        // and the mempool API.
        const txidBytes = Array.from(minted.utxo.outpoint.txid).reverse();
        const btcTxid = txidBytes
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return {
          blockIndex: minted.block_index,
          mintedAmount: minted.minted_amount,
          btcTxid,
          btcHeight: minted.utxo.height,
        };
      });
      return Ok(mintedInfos);
    } catch (error) {
      return Err("Error updating balance: " + (error as Error).message);
    }
  }

  /**
   * Request a ckBTC withdrawal using the user's ledger approval.
   * @param address the destination btc address
   * @param amount the withdrawal amount
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

  /**
   * Retrieve recent BTC withdrawal requests associated with an account.
   * Defaults to the current authenticated account.
   * @returns Result with an array of RetrieveBtcStatusByAccountItem or an error message.
   */
  async retrieveBtcStatusV2ByAccount(): Promise<
    Result<RetrieveBtcStatusByAccountItem[], string>
  > {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const account: [] | [ckBTCMinter.Account] = authState.account
      ? [
          {
            owner: Principal.fromText(authState.account.owner),
            subaccount: [],
          },
        ]
      : [];

    try {
      const result = await actor.retrieve_btc_status_v2_by_account(account);
      return Ok(
        result.map((item) => ({
          block_index: item.block_index,
          status_v2:
            item.status_v2.length === 1
              ? mapRetrieveBtcStatus(item.status_v2[0])
              : null,
        })),
      );
    } catch (error) {
      return Err(
        "Error retrieving BTC status by account: " + (error as Error).message,
      );
    }
  }
}

export const ckBTCMinterService = new CkBTCMinterService();
