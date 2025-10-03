import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { ICP_LEDGER_CANISTER_ID, ICP_LEDGER_FEE } from "../constants";
import { parseICPTransferResultError } from "../utils/parser";

// TODO: add Buffer polyfill to support AccountIdentifier in browser
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

/**
 * Service for interacting with ICP Ledger canister for a specific token
 */
class IcpLedgerService {
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
   * Transfer tokens to another user by their accountID.
   * @param to The account ID of the recipient.
   * @param amount The amount of tokens to transfer.
   * @returns The result of the transfer operation.
   */
  public async transferToAccount(to: string, amount: bigint): Promise<bigint> {
    const actor: icpLedger._SERVICE = this.#getActor();
    const ledgerTo = AccountIdentifier.fromHex(to).toUint8Array();

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
      throw parseICPTransferResultError(result.Err);
    }

    return result.Ok;
  }
}

/**
 * Encode an ICP account identifier from a principal.
 * @param principal The principal to encode
 * @returns The encoded account identifier or null if encoding fails
 */
export function encodeAccountID(principal: Principal): string | null {
  try {
    const identifier = AccountIdentifier.fromPrincipal({ principal });
    return identifier.toHex();
  } catch (error) {
    console.error("Error generating ledger account:", error);
    return null;
  }
}

export const icpLedgerService = new IcpLedgerService();
