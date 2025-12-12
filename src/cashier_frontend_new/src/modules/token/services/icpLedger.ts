import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { ICP_LEDGER_CANISTER_ID, ICP_LEDGER_FEE } from "../constants";

// Polyfill for Buffer in browser environment
// The @dfinity/ledger-icp package depends on Buffer, which is not available in browsers by default.
// In order to use the AccountIdentifier class from the package, we need to polyfill Buffer.
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !window.Buffer) {
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
    console.error("Error encoding ICP account:", error);
    return null;
  }
}

/**
 * Decode an ICP account identifier from a hex string.
 * @param account The ICP account ID in hex format string
 * @returns The decoded account identifier as Uint8Array or null if decoding fails
 */
function decodeAccountID(account: string): Uint8Array | number[] {
  try {
    return AccountIdentifier.fromHex(account).toUint8Array();
  } catch (error) {
    console.error("Error decoding ICP account:", error);
    return [];
  }
}

/**
 * Parse the error from the ICP Ledger transfer operation (legacy).
 * @param result Error result from ICP Ledger transfer operation (legacy)
 * @returns Parsed error
 */
export function parseICPTransferResultError(
  result: icpLedger.TransferError,
): Error {
  if ("InsufficientFunds" in result) {
    return new Error(`Transfer failed: Insufficient funds`);
  }

  return new Error("Transfer failed: Unknown error");
}

export const icpLedgerService = new IcpLedgerService();
