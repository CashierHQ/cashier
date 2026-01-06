import * as icrcLedger from "$lib/generated/icrc_ledger/icrc_ledger.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import type { TokenMetadata } from "../types";

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
  #getActor(): icrcLedger._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: icrcLedger.idlFactory,
    });
  }

  /**
   * Get the ledger account for the current authenticated user.
   * @returns The ledger account for the current authenticated user.
   * @throws Error if the user is not authenticated or no account is available.
   */
  #getAccount(): icrcLedger.Account {
    if (authState.account) {
      return {
        owner: Principal.fromText(authState.account.owner),
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
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
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

    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const result = await actor.icrc1_transfer({
      to: toAccount,
      amount,
      fee: [this.#fee],
      memo: [],
      created_at_time: [],
      from_subaccount: [],
    });

    if ("Err" in result) {
      throw parseIcrcTransferResultError(result.Err);
    }

    return result.Ok;
  }
}

/**
 * Parse the error from ICRC Ledger icrc1_transfer operation.
 * @param result Error result from ICRC Ledger icrc1_transfer operation
 * @returns Parsed error
 */
export function parseIcrcTransferResultError(
  result: icrcLedger.TransferError,
): Error {
  if ("GenericError" in result) {
    return new Error(`Transfer failed: ${result.GenericError.message}`);
  } else if ("InsufficientFunds" in result) {
    return new Error(`Transfer failed: Insufficient funds`);
  } else if ("BadFee" in result) {
    return new Error(
      `Transfer failed: Bad fee, expected ${result.BadFee.expected_fee}`,
    );
  }

  return new Error("Transfer failed: Unknown error");
}
