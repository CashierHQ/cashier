import { isTransactionOutgoing } from "$modules/wallet/utils/transaction-display-type";
import type { TokenWithPriceAndBalance } from "./tokenMetadata";
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
  /** UI amount (100000000 => 1 e8s) */
  amount: number;
  timestamp: number;
};

/**
 * Mapper for DisplayTransaction
 */
export class DisplayTransactionMapper {
  /**
   * Map TokenTransaction to DisplayTransaction
   * Extracts kind, direction, formats amount, and preserves timestamp
   * @param tx - Token transaction
   * @param userPrincipal - User's principal string
   * @param tokenDetails - Token info (to check if ICP)
   * @returns DisplayTransaction array
   */
  static fromTokenTransaction(
    txs: TokenTransaction[],
    userPrincipal?: string,
    tokenDetails?: TokenWithPriceAndBalance,
  ): DisplayTransaction[] {
    if (!tokenDetails) return [];

    if (!userPrincipal) return [];

    return txs.map((tx) => {
      const outgoingResult = isTransactionOutgoing(
        tx,
        tokenDetails,
        userPrincipal,
      );
      if (outgoingResult.isErr()) {
        console.warn(
          "Could not determine if transaction is outgoing or incoming:",
          tx,
        );
      }

      const parsedNumber = Number(tx.amount) / 10 ** tokenDetails.decimals;

      return {
        kind: tx.kind,
        isOutgoing: outgoingResult.unwrapOr(false),
        amount: parsedNumber,
        timestamp: tx.timestampMs,
      };
    });
  }
}
