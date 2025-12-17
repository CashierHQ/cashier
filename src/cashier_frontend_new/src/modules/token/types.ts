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
};

/**
 * Type definition for a token with additional price and balance information
 */
export type TokenWithPriceAndBalance = TokenMetadata & {
  balance: bigint;
  priceUSD: number;
};

// =============================================================================
// Transaction History Types (ICRC Index Canister)
// =============================================================================

/**
 * Transaction types from ICRC Index Canister
 */
export type TransactionKind = "mint" | "transfer" | "burn" | "approve";

/**
 * ICRC Account (owner principal + optional subaccount)
 */
export type IcrcAccount = {
  owner: string;
  subaccount?: Uint8Array;
};

/**
 * Transaction record from index canister
 */
export type TokenTransaction = {
  id: bigint;
  kind: TransactionKind;
  timestamp: bigint;
  from?: IcrcAccount;
  to?: IcrcAccount;
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  spender?: IcrcAccount;
};

/**
 * Params for getTransactions query
 */
export type GetTransactionsParams = {
  account: IcrcAccount;
  maxResults?: bigint;
  start?: bigint;
};

/**
 * Result from getTransactions
 */
export type GetTransactionsResult = {
  transactions: TokenTransaction[];
  oldestTxId?: bigint;
  balance: bigint;
};
