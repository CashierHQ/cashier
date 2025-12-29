import type { TokenTransaction } from "./tokenTransaction";
import type { TransactionKindValue } from "./transactionKind";

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
 * Context required for mapping TokenTransaction to DisplayTransaction
 */
export type DisplayTransactionMapperContext = {
  decimals: number;
  /** Result of isTransactionOutgoing check */
  isOutgoing: boolean;
};

/**
 * Mapper for DisplayTransaction
 */
export class DisplayTransactionMapper {
  /**
   * Map TokenTransaction to DisplayTransaction
   * Extracts kind, direction, formats amount, and preserves timestamp
   */
  static fromTokenTransaction(
    tx: TokenTransaction,
    ctx: DisplayTransactionMapperContext,
  ): DisplayTransaction {
    return {
      kind: tx.kind,
      isOutgoing: ctx.isOutgoing,
      amount: Number(tx.amount) / Math.pow(10, ctx.decimals),
      timestamp: tx.timestampMs,
    };
  }
}
