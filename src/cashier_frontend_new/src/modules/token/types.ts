import { Principal } from "@dfinity/principal";
import type { IcrcIndexNgTransactionWithId } from "@dfinity/ledger-icrc";
import type { TransactionWithId } from "@dfinity/ledger-icp";
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
  indexId?: Principal; // Optional index canister ID for transaction history
};

/**
 * Type definition for a token with additional price and balance information
 * balance is optional - only fetched for enabled tokens
 */
export type TokenWithPriceAndBalance = TokenMetadata & {
  balance?: bigint;
  priceUSD: number;
};

/**
 * Serialized form of TokenWithPriceAndBalance for localStorage
 * Converts bigint to string and Principal to string
 */
export type SerializedTokenWithPriceAndBalance = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  enabled: boolean;
  fee: string; // bigint as string
  is_default: boolean;
  indexId?: string; // Principal as string
  balance?: string; // bigint as string, optional for disabled tokens
  priceUSD: number;
};

/**
 * Type guard to check if value is TokenWithPriceAndBalance
 * balance is optional for disabled tokens
 */
function isTokenWithPriceAndBalance(
  value: unknown,
): value is TokenWithPriceAndBalance {
  if (!value || typeof value !== "object") return false;
  const token = value as Record<string, unknown>;
  return (
    typeof token.address === "string" &&
    typeof token.name === "string" &&
    typeof token.symbol === "string" &&
    typeof token.decimals === "number" &&
    typeof token.enabled === "boolean" &&
    typeof token.fee === "bigint" &&
    (token.balance === undefined || typeof token.balance === "bigint") &&
    typeof token.priceUSD === "number"
  );
}

/**
 * Serde for TokenWithPriceAndBalance[] to handle bigint and Principal in localStorage
 * Uses devalue's reducer pattern: return false to skip, truthy to handle
 */
export const TokenWithPriceAndBalanceSerde = {
  serialize: {
    TokenWithPriceAndBalance: (
      value: unknown,
    ): SerializedTokenWithPriceAndBalance | false => {
      if (!isTokenWithPriceAndBalance(value)) return false;
      // indexId may be Principal or already string depending on source
      const indexIdStr =
        typeof value.indexId === "string"
          ? value.indexId
          : (value.indexId?.toText?.() ?? undefined);
      return {
        name: value.name,
        symbol: value.symbol,
        address: value.address,
        decimals: value.decimals,
        enabled: value.enabled,
        fee: value.fee.toString(),
        is_default: value.is_default,
        indexId: indexIdStr,
        balance: value.balance?.toString(),
        priceUSD: value.priceUSD,
      };
    },
  },
  deserialize: {
    TokenWithPriceAndBalance: (obj: unknown): TokenWithPriceAndBalance => {
      const s = obj as SerializedTokenWithPriceAndBalance;
      return {
        name: s.name,
        symbol: s.symbol,
        address: s.address,
        decimals: s.decimals,
        enabled: s.enabled,
        fee: BigInt(s.fee),
        is_default: s.is_default,
        indexId: s.indexId ? Principal.fromText(s.indexId) : undefined,
        balance: s.balance !== undefined ? BigInt(s.balance) : undefined,
        priceUSD: s.priceUSD,
      };
    },
  },
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
 * Mapper for converting index canister transactions to TokenTransaction
 * Handles both ICRC (nat types) and ICP (nat64 types) index canisters
 */
export class TxOperationMapper {
  /**
   * Map ICRC index canister transaction to TokenTransaction
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
      spender: op?.spender
        ? TxOperationMapper.mapAccount(op.spender)
        : undefined,
      fee: op?.fee ? fromNullable(op.fee) : undefined,
      memo: op?.memo
        ? TxOperationMapper.toUint8Array(fromNullable(op.memo))
        : undefined,
    };
  }

  /**
   * Map ICP index canister transaction to TokenTransaction
   * ICP uses AccountIdentifier (hex strings) instead of Principal+subaccount
   */
  static mapIcpTransaction(tx: TransactionWithId): TokenTransaction {
    const { id, transaction } = tx;

    // Determine transaction kind and extract operation data
    const transfer = "Transfer" in transaction.operation ? transaction.operation.Transfer : undefined;
    const mint = "Mint" in transaction.operation ? transaction.operation.Mint : undefined;
    const burn = "Burn" in transaction.operation ? transaction.operation.Burn : undefined;
    const approve = "Approve" in transaction.operation ? transaction.operation.Approve : undefined;

    let kind: TransactionKind;
    let amount = BigInt(0);
    let from: IcrcAccount | undefined;
    let to: IcrcAccount | undefined;
    let fee: bigint | undefined;
    let spender: IcrcAccount | undefined;

    if (transfer) {
      kind = "transfer";
      amount = transfer.amount.e8s;
      from = { owner: transfer.from };
      to = { owner: transfer.to };
      fee = transfer.fee.e8s;
    } else if (mint) {
      kind = "mint";
      amount = mint.amount.e8s;
      to = { owner: mint.to };
    } else if (burn) {
      kind = "burn";
      amount = burn.amount.e8s;
      from = burn.from ? { owner: burn.from } : undefined;
      spender = burn.spender?.[0] ? { owner: burn.spender[0] } : undefined;
    } else if (approve) {
      kind = "approve";
      amount = approve.allowance.e8s;
      from = { owner: approve.from };
      spender = { owner: approve.spender };
      fee = approve.fee.e8s;
    } else {
      kind = "transfer"; // fallback
    }

    // Convert timestamp: ICP uses nanoseconds
    // Try created_at_time first, fallback to block timestamp
    const timestamp =
      transaction.created_at_time?.[0]?.timestamp_nanos ??
      transaction.timestamp?.[0]?.timestamp_nanos ??
      BigInt(0);

    return {
      id,
      kind,
      timestamp,
      amount,
      from,
      to,
      spender,
      fee,
      memo: transaction.memo
        ? TxOperationMapper.toUint8Array(
            new Uint8Array(new BigUint64Array([transaction.memo]).buffer),
          )
        : undefined,
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
