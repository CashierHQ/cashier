import * as icrcLedger from "$lib/generated/icrc_ledger/icrc_ledger.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import type { TokenMetadata } from "../types";
import { parseIcrcTransferResultError } from "../utils/parser";

/**
 * Service for interacting with Icrc Ledger canisters for a specific token
 */
export class IcrcLedgerService {
  #canisterId: string;
  #fee: bigint;

  constructor(token: TokenMetadata) {
    this.#canisterId = token.address;
    this.#fee = token.fee;
  }

  /**
   * Get the authenticated Icrc Ledger actor for the current user.
   * @returns Authenticated Icrc Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icrcLedger._SERVICE {
    if (authState.pnp && authState.pnp.isAuthenticated()) {
      return authState.pnp.getActor({
        canisterId: this.#canisterId,
        idl: icrcLedger.idlFactory,
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
  #getAccount(): icrcLedger.Account {
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
    const actor: icrcLedger._SERVICE = this.#getActor();
    const account: icrcLedger.Account = this.#getAccount();
    return await actor.icrc1_balance_of(account);
  }

  /**
   * Transfer tokens to another user by their principal ID.
   * @param to The principal ID of the recipient.
   * @param amount The amount of tokens to transfer.
   * @returns The result of the transfer operation.
   */
  public async transferToPrincipal(
    to: Principal,
    amount: bigint,
  ): Promise<bigint> {
    const toAccount: icrcLedger.Account = {
      owner: to,
      subaccount: [],
    };

    const actor: icrcLedger._SERVICE = this.#getActor();
    const result = await actor.icrc1_transfer({
      to: toAccount,
      amount,
      fee: [this.#fee],
      memo: [],
      created_at_time: [],
      from_subaccount: [],
    });
    console.log("Transfer result:", result);

    if ("Err" in result) {
      throw parseIcrcTransferResultError(result.Err);
    }

    return result.Ok;
  }
}
