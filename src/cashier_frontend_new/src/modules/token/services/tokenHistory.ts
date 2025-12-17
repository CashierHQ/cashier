import { authState } from "$modules/auth/state/auth.svelte";
import { IcrcIndexNgCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { fromNullable } from "@dfinity/utils";
import {
  TxOperationMapper,
  type GetTransactionsParams,
  type GetTransactionsResult,
} from "../types";

/**
 * Service for querying transaction history from ICRC Index Canisters
 * Uses IcrcIndexNgCanister (next-gen) for ICRC-1/ICRC-3 compatible index canisters
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

    const agent = authState.buildAnonymousAgent();
    const indexCanister = IcrcIndexNgCanister.create({
      agent,
      canisterId: Principal.fromText(indexCanisterId),
    });

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

    return {
      transactions: response.transactions.map(TxOperationMapper.mapTransaction),
      oldestTxId: fromNullable(response.oldest_tx_id),
      balance: response.balance,
    };
  }
}

/** Singleton instance for token history queries */
export const tokenHistoryService = new TokenHistoryService();
