import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import type { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import type { TokenMetadata } from "../types";
import {
  parseIcrc1TransferResultError,
  parseTransferResultError,
} from "../utils/parser";

/**
 * Service for interacting with ICP Ledger canister for a specific token
 * This service facilitates querying account balances and token metadata.
 */
export class IcpLedgerService {
  #canisterId: string;
  #fee: bigint;

  constructor(token: TokenMetadata) {
    this.#canisterId = token.address;
    this.#fee = token.fee;
  }

  /**
   * Get the authenticated ICP Ledger actor for the current user.
   * @returns Authenticated ICP Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icpLedger._SERVICE {
    if (authState.pnp && authState.pnp.isAuthenticated()) {
      return authState.pnp.getActor({
        canisterId: this.#canisterId,
        idl: icpLedger.idlFactory,
      });
    } else {
      throw new Error("User is not authenticated");
    }
  }

  /**
   * Get the ledger account for the current authenticated user.
   * @returns The ledger account for the current authenticated user.
   * @throws Error if the user is not authenticated or no account is available.
   */
  #getAccount(): Account {
    if (
      authState.pnp &&
      authState.pnp.isAuthenticated() &&
      accountState.account
    ) {
      return {
        owner: Principal.fromText(accountState.account.owner),
        subaccount: [],
      };
    } else {
      throw new Error("User is not authenticated");
    }
  }

  /**
   * Get the account balance for the current user.
   * @returns The balance of the current account.
   * @throws Error if the user is not authenticated or balance retrieval fails.
   */
  public async getBalance(): Promise<bigint> {
    const actor: icpLedger._SERVICE = this.#getActor();
    const account: Account = this.#getAccount();
    return await actor.icrc1_balance_of(account);
  }

  /**
   * Transfer tokens to another user by their principal ID.
   * @param to The principal ID of the recipient.
   * @param amount The amount of tokens to transfer.
   * @returns The result of the transfer operation.
   */
  public async transferByPrincipal(
    to: Principal,
    amount: bigint,
  ): Promise<bigint> {
    const actor: icpLedger._SERVICE = this.#getActor();
    const toAccount: icpLedger.Account = {
      owner: to,
      subaccount: [],
    };

    const result = await actor.icrc1_transfer({
      to: toAccount,
      amount,
      memo: [],
      created_at_time: [],
      fee: [],
      from_subaccount: [],
    });
    console.log("Transfer result:", result);

    if ("Err" in result) {
      throw parseIcrc1TransferResultError(result.Err);
    }

    return result.Ok;
  }

  /**
   * Transfer tokens to another user by their ledger account.
   * @param to The account identifier of the recipient.
   * @param amount The amount of tokens to transfer.
   * @returns The result of the transfer operation.
   */
  public async transferByAccount(
    to: AccountIdentifier,
    amount: bigint,
  ): Promise<bigint> {
    const actor: icpLedger._SERVICE = this.#getActor();
    const ledgerTo = to.toUint8Array();

    const result = await actor.transfer({
      to: ledgerTo,
      amount: { e8s: amount },
      fee: { e8s: this.#fee },
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: [],
    });
    console.log("Transfer result:", result);

    if ("Err" in result) {
      throw parseTransferResultError(result.Err);
    }

    return result.Ok;
  }
}
