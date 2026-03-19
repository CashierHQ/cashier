import * as icrcLedger from "$lib/generated/icrc_ledger/icrc_ledger.did";
import { rsMatch } from "$lib/rsMatch";
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
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
   * Get the spender account for a given owner.
   * @param owner The principal ID of the spender.
   * @returns The ledger account for the spender.
   */
  #getSpender(owner: Principal): icrcLedger.Account {
    return {
      owner,
      subaccount: [],
    };
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
      return rsMatch(result.Err, {
        GenericError: (e) => {
          throw new Error(`${e.message} (code: ${e.error_code})`);
        },
        TemporarilyUnavailable: () => {
          throw new Error("Ledger is temporarily unavailable");
        },
        BadBurn: (e) => {
          throw new Error(`Bad burn amount: ${e}`);
        },
        Duplicate: (e) => {
          throw new Error(`Duplicate transaction: ${e}`);
        },
        BadFee: (e) => {
          throw new Error(`Bad fee: ${e}`);
        },
        TooOld: () => {
          throw new Error("Transaction is too old");
        },
        CreatedInFuture: (e) => {
          throw new Error(`Created in future: ${e}`);
        },
        InsufficientFunds: () => {
          throw new Error("Insufficient funds");
        },
      });
    }

    return result.Ok;
  }

  /**
   * Approve the ckBTC minter to spend ckBTC for BTC withdrawal.
   * @param amount The amount of ckBTC to approve.
   * @param memo The memo for the approval transaction.
   * @param createdAtTime The creation time of the approval transaction.
   * @returns The approval block index on success.
   */
  public async approveCkBtcWithdrawal(
    amount: bigint,
    memo: Uint8Array | number[],
    createdAtTime: bigint,
  ): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const result = await actor.icrc2_approve({
      spender: this.#getSpender(Principal.fromText(CKBTC_MINTER_CANISTER_ID)),
      amount,
      fee: [this.#fee],
      memo: [memo],
      created_at_time: [createdAtTime],
      expected_allowance: [],
      expires_at: [],
      from_subaccount: [],
    });

    if ("Err" in result) {
      return rsMatch(result.Err, {
        GenericError: (e) => {
          throw new Error(`${e.message} (code: ${e.error_code})`);
        },
        TemporarilyUnavailable: () => {
          throw new Error("Ledger is temporarily unavailable");
        },
        Duplicate: (e) => {
          throw new Error(`Duplicate approval: ${e.duplicate_of}`);
        },
        BadFee: (e) => {
          throw new Error(`Bad fee: ${e.expected_fee}`);
        },
        AllowanceChanged: (e) => {
          throw new Error(`Allowance changed: ${e.current_allowance}`);
        },
        Expired: (e) => {
          throw new Error(`Approval expired at: ${e.ledger_time}`);
        },
        TooOld: () => {
          throw new Error("Approval is too old");
        },
        CreatedInFuture: (e) => {
          throw new Error(`Created in future: ${e.ledger_time}`);
        },
        InsufficientFunds: (e) => {
          throw new Error(`Insufficient funds: ${e.balance}`);
        },
      });
    }

    return result.Ok;
  }

  /**
   * Get the allowance granted to the ckBTC minter for the current account.
   * @returns The allowance amount for the ckBTC minter.
   */
  public async getAllowanceForCkBtcMinter(): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const result = await actor.icrc2_allowance({
      account: this.#getAccount(),
      spender: this.#getSpender(Principal.fromText(CKBTC_MINTER_CANISTER_ID)),
    });

    return result.allowance;
  }
}
