/**
 * Type definitions for token metadata
 */
export type TokenMetadata = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  enabled: boolean;
  fee: bigint;
  is_default: boolean;
  indexId?: string;
};

/**
 * Type definition for a token with additional price and balance information
 */
export type TokenWithPriceAndBalance = TokenMetadata & {
  balance: bigint;
  priceUSD: number;
};

// =============================================================================
// Transaction History Types
// =============================================================================

/**
 * Transaction kind enum-like class (similar to ActionState pattern)
 */
export class TransactionKind {
  private constructor() {}
  static readonly TRANSFER = "transfer";
  static readonly MINT = "mint";
  static readonly BURN = "burn";
  static readonly APPROVE = "approve";
}

export type TransactionKindValue =
  | typeof TransactionKind.TRANSFER
  | typeof TransactionKind.MINT
  | typeof TransactionKind.BURN
  | typeof TransactionKind.APPROVE;

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

/**
 * Display-friendly transaction for UI rendering
 * Uses kind + isOutgoing directly (KISS principle)
 */
export type DisplayTransaction = {
  kind: TransactionKindValue;
  /** True if outgoing (debit, shows "-"), false if incoming (credit, shows "+") */
  isOutgoing: boolean;
  amount: number;
  timestamp: number;
};

/**
 * Group of transactions for a single date
 */
export type TransactionGroup = {
  date: string;
  transactions: DisplayTransaction[];
};
