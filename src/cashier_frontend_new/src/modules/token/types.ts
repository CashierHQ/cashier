import type { Principal } from "@dfinity/principal";
import type { IcrcIndexNgTransactionWithId } from "@dfinity/ledger-icrc";
import { fromNullable } from "@dfinity/utils";

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

/**
 * Raw transaction operation data from index canister response
 * Used internally for mapping ICRC transactions
 */
export type TxOperation = {
  from?: { owner: Principal; subaccount: [] | [Uint8Array | number[]] };
  to?: { owner: Principal; subaccount: [] | [Uint8Array | number[]] };
  amount: bigint;
  fee?: [] | [bigint];
  memo?: [] | [Uint8Array | number[]];
  spender?: { owner: Principal; subaccount: [] | [Uint8Array | number[]] };
};

// =============================================================================
// Transaction Mapper
// =============================================================================

/**
 * Mapper for converting ICRC index canister transactions to TokenTransaction
 */
export class TxOperationMapper {
  /**
   * Map index canister transaction to TokenTransaction
   */
  static mapTransaction(tx: IcrcIndexNgTransactionWithId): TokenTransaction {
    const { id, transaction } = tx;
    const kind = transaction.kind as TokenTransaction["kind"];

    // Extract operation data using fromNullable for cleaner nullable handling
    const op = (fromNullable(transaction.transfer) ??
      fromNullable(transaction.mint) ??
      fromNullable(transaction.burn) ??
      fromNullable(transaction.approve)) as TxOperation | undefined;

    return {
      id,
      kind,
      timestamp: transaction.timestamp,
      amount: op?.amount ?? BigInt(0),
      from: op?.from ? TxOperationMapper.mapAccount(op.from) : undefined,
      to: op?.to ? TxOperationMapper.mapAccount(op.to) : undefined,
      spender: op?.spender ? TxOperationMapper.mapAccount(op.spender) : undefined,
      fee: op?.fee ? fromNullable(op.fee) : undefined,
      memo: op?.memo ? TxOperationMapper.toUint8Array(fromNullable(op.memo)) : undefined,
    };
  }

  /**
   * Map raw account to IcrcAccount
   */
  static mapAccount(acc: {
    owner: Principal;
    subaccount: [] | [Uint8Array | number[]];
  }): IcrcAccount {
    return {
      owner: acc.owner.toText(),
      subaccount: TxOperationMapper.toUint8Array(fromNullable(acc.subaccount)),
    };
  }

  /**
   * Convert number[] or Uint8Array to Uint8Array
   */
  static toUint8Array(
    data: Uint8Array | number[] | undefined,
  ): Uint8Array | undefined {
    if (!data) return undefined;
    return data instanceof Uint8Array ? data : new Uint8Array(data);
  }
}
