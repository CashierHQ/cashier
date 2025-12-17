import { authState } from "$modules/auth/state/auth.svelte";
import {
  IcrcIndexNgCanister,
  type IcrcIndexNgTransactionWithId,
} from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import type {
  GetTransactionsParams,
  GetTransactionsResult,
  TokenTransaction,
  IcrcAccount,
} from "../types";

/**
 * Service for querying transaction history from ICRC Index Canisters
 * Uses IcrcIndexNgCanister (next-gen) for ICRC-1/ICRC-3 compatible index canisters
 */
export class TokenHistoryService {
  #indexCanisterId: string;

  constructor(indexCanisterId: string) {
    this.#indexCanisterId = indexCanisterId;
  }

  /**
   * Check if service has valid index canister configured
   */
  get hasIndex(): boolean {
    return Boolean(this.#indexCanisterId);
  }

  /**
   * Get transaction history for account from index canister
   * @param params Query parameters (account, pagination)
   * @returns Paginated transaction list with balance
   */
  async getTransactions(
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    if (!this.#indexCanisterId) {
      return { transactions: [], balance: BigInt(0) };
    }

    const agent = authState.buildAnonymousAgent();
    const indexCanister = IcrcIndexNgCanister.create({
      agent,
      canisterId: Principal.fromText(this.#indexCanisterId),
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
      transactions: response.transactions.map(mapIndexTransaction),
      oldestTxId: response.oldest_tx_id?.[0],
      balance: response.balance,
    };
  }
}

/**
 * Factory: Create TokenHistoryService from token's index_id
 * @param indexId Optional index canister principal string
 * @returns Service instance or null if no index
 */
export function createTokenHistoryService(
  indexId?: string,
): TokenHistoryService | null {
  if (!indexId) return null;
  return new TokenHistoryService(indexId);
}

// --- Mapping utilities ---

type TxOperation = { from?: unknown; to?: unknown; amount: bigint; fee?: [bigint]; memo?: [Uint8Array | number[]]; spender?: unknown };

function mapIndexTransaction(tx: IcrcIndexNgTransactionWithId): TokenTransaction {
  const { id, transaction } = tx;
  const kind = transaction.kind as TokenTransaction["kind"];

  // Extract operation data based on kind
  const op = (transaction.transfer?.[0] ?? transaction.mint?.[0] ??
              transaction.burn?.[0] ?? transaction.approve?.[0]) as TxOperation | undefined;

  return {
    id,
    kind,
    timestamp: transaction.timestamp,
    amount: op?.amount ?? BigInt(0),
    from: op?.from ? mapAccount(op.from as { owner: Principal; subaccount: [] | [Uint8Array | number[]] }) : undefined,
    to: op?.to ? mapAccount(op.to as { owner: Principal; subaccount: [] | [Uint8Array | number[]] }) : undefined,
    spender: op?.spender ? mapAccount(op.spender as { owner: Principal; subaccount: [] | [Uint8Array | number[]] }) : undefined,
    fee: op?.fee?.[0],
    memo: toUint8Array(op?.memo?.[0]),
  };
}

function mapAccount(acc: {
  owner: Principal;
  subaccount: [] | [Uint8Array | number[]];
}): IcrcAccount {
  return {
    owner: acc.owner.toText(),
    subaccount: toUint8Array(acc.subaccount?.[0]),
  };
}

function toUint8Array(
  data: Uint8Array | number[] | undefined,
): Uint8Array | undefined {
  if (!data) return undefined;
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}
