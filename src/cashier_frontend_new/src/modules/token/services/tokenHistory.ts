import { authState } from "$modules/auth/state/auth.svelte";
import {
  IndexCanister,
  AccountIdentifier,
  SubAccount,
} from "@dfinity/ledger-icp";
import { IcrcIndexNgCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { fromNullable } from "@dfinity/utils";
import { ICP_INDEX_CANISTER_ID } from "../constants";

// Polyfill for Buffer (required by AccountIdentifier)
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}
import {
  TxOperationMapper,
  type GetTransactionsParams,
  type GetTransactionsResult,
} from "../types";

/**
 * Service for querying transaction history from Index Canisters
 * - Uses IcpIndexCanister for ICP ledger (nat64 types)
 * - Uses IcrcIndexNgCanister for ICRC tokens (nat types)
 */
class TokenHistoryService {
  /**
   * Get transaction history for account from index canister
   * @param indexCanisterId Index canister principal string
   * @param params Query parameters (account, pagination)
   * @returns Paginated transaction list with balance
   */
  async getTransactions(
    indexCanisterId: string,
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    if (!indexCanisterId) {
      return { transactions: [], balance: BigInt(0) };
    }

    if (indexCanisterId === ICP_INDEX_CANISTER_ID) {
      return this.#getIcpTransactions(indexCanisterId, params);
    }

    return this.#getIcrcTransactions(indexCanisterId, params);
  }

  /**
   * Get transactions from ICP Index Canister (uses nat64 types)
   */
  async #getIcpTransactions(
    indexCanisterId: string,
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    const agent = authState.buildAnonymousAgent();
    const indexCanister = IndexCanister.create({
      agent,
      canisterId: Principal.fromText(indexCanisterId),
    });

    try {
      // ICP index uses AccountIdentifier, not ICRC account
      // Convert Uint8Array to SubAccount if provided
      const subAccount = params.account.subaccount
        ? SubAccount.fromBytes(params.account.subaccount)
        : undefined;

      const accountIdentifier = AccountIdentifier.fromPrincipal({
        principal: Principal.fromText(params.account.owner),
        subAccount: subAccount instanceof Error ? undefined : subAccount,
      });

      const response = await indexCanister.getTransactions({
        accountIdentifier: accountIdentifier.toHex(),
        maxResults: params.maxResults ?? BigInt(100),
        start: params.start,
      });

      console.log("ICP Index Canister response:", response);

      return {
        transactions: response.transactions.map(
          TxOperationMapper.mapIcpTransaction,
        ),
        oldestTxId: response.oldest_tx_id?.[0],
        balance: response.balance,
      };
    } catch (e) {
      console.error("Error fetching transactions from ICP Index Canister:", e);
      throw e;
    }
  }

  /**
   * Get transactions from ICRC Index Canister (uses nat types)
   */
  async #getIcrcTransactions(
    indexCanisterId: string,
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    const agent = authState.buildAnonymousAgent();
    const indexCanister = IcrcIndexNgCanister.create({
      agent,
      canisterId: Principal.fromText(indexCanisterId),
    });

    try {
      const response = await indexCanister.getTransactions({
        account: {
          owner: Principal.fromText(params.account.owner),
          subaccount: params.account.subaccount
            ? Array.from(params.account.subaccount)
            : undefined,
        },
        max_results: params.maxResults ?? BigInt(100),
        start: params.start,
      });

      console.log("ICRC Index Canister response:", response);

      return {
        transactions: response.transactions.map(
          TxOperationMapper.mapTransaction,
        ),
        oldestTxId: fromNullable(response.oldest_tx_id),
        balance: response.balance,
      };
    } catch (e) {
      console.error("Error fetching transactions from ICRC Index Canister:", e);
      throw e;
    }
  }
}

/** Singleton instance for token history queries */
export const tokenHistoryService = new TokenHistoryService();
