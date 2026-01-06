import type { TransactionKindValue } from "./transactionKind";

/**
 * Unified transaction type for both ICP and ICRC tokens
 * We store as milliseconds for UI convenience
 */
export type TokenTransaction = {
  id: bigint;
  kind: TransactionKindValue;
  amount: bigint;
  fee?: bigint;
  timestampMs: number;
  from?: string;
  to?: string;
  spender?: string; // For transferFrom: the spender who initiated the transfer
  memo?: Uint8Array;
};

/**
 * Parameters for getTransactions calls
 */
export type GetTransactionsParams = {
  account: {
    owner: string;
    subaccount?: Uint8Array;
  };
  start?: bigint;
  maxResults?: bigint;
};

/**
 * Result from getTransactions
 */
export type GetTransactionsResult = {
  transactions: TokenTransaction[];
  balance: bigint;
  oldestTxId?: bigint;
};
