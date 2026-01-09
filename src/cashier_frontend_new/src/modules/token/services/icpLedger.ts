import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { decodeAccountID } from "$modules/shared/utils/icp-account-id";
import { Principal } from "@dfinity/principal";
import { ICP_LEDGER_CANISTER_ID, ICP_LEDGER_FEE } from "../constants";
import { toNullable } from "@dfinity/utils";
import { rsMatch } from "$lib/rsMatch";

/**
 * Service for interacting with ICP Ledger canister for a specific token
 */
export class IcpLedgerService {
  #canisterId: string;
  #fee: bigint;

  constructor() {
    this.#canisterId = ICP_LEDGER_CANISTER_ID;
    this.#fee = ICP_LEDGER_FEE;
  }

  /**
   * Get the authenticated ICP Ledger actor for the current user.
   * @returns Authenticated ICP Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icpLedger._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: icpLedger.idlFactory,
    });
  }

  /**
   * Get the ledger account for the current authenticated user.
   * @returns The ledger account for the current authenticated user.
   * @throws Error if the user is not authenticated or no account is available.
   */
  #getAccount(): Account {
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
    const account: Account = this.#getAccount();
    return await actor.icrc1_balance_of(account);
  }

  /**
   * Transfer tokens to another user by their accountID.
   * @param to The account ID of the recipient.
   * @param amount The amount of tokens to transfer.
   * @returns The result of the transfer operation.
   */
  public async transferToAccount(to: string, amount: bigint): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const accountID = decodeAccountID(to);
    const result = await actor.transfer({
      to: accountID,
      amount: { e8s: amount },
      fee: { e8s: this.#fee },
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: [],
    });

    if ("Err" in result) {
      return rsMatch(result.Err, {
        TxTooOld: (e) => {
          throw new Error(`Transaction too old: ${e}`);
        },
        BadFee: (e) => {
          throw new Error(`Bad fee: ${e}`);
        },
        TxDuplicate: (e) => {
          throw new Error(`Duplicate transaction: ${e}`);
        },
        InsufficientFunds: () => {
          throw new Error(`Insufficient funds`);
        },
        TxCreatedInFuture: () => {
          throw new Error(`Transaction created in future`);
        },
      });
    }

    return result.Ok;
  }

  public async transferToPrincipal(
    to: Principal,
    amount: bigint,
  ): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    const result = await actor.icrc1_transfer({
      to: { owner: to, subaccount: [] },
      amount,
      fee: toNullable(this.#fee),
      memo: [],
      from_subaccount: [],
      created_at_time: [],
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
        TooOld: (e) => {
          throw new Error(`Transaction is too old: ${e}`);
        },
        CreatedInFuture: (e) => {
          throw new Error(`Created in future: ${e}`);
        },
        InsufficientFunds: () => {
          throw new Error(`Insufficient funds`);
        },
      });
    }

    return result.Ok;
  }
}

export const icpLedgerService = new IcpLedgerService();
