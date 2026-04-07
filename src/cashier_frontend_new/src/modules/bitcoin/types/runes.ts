import * as omnityRunesIndexer from "$lib/generated/omnity_runes_indexer/omnity_runes_indexer.did";

/**
 * Types definition for Rune Balance
 */
export type RuneBalance = {
  confirmations: number;
  divisibility: number;
  amount: bigint;
  rune_id: string;
  symbol: [] | [string];
};

export class RuneBalanceMapper {
  /**
   * Convert omnityRunesIndexer.RuneBalance to RuneBalance type
   * @param runeBalance
   * @returns
   */
  public static fromOmnityRuneBalance(
    runeBalance: omnityRunesIndexer.RuneBalance,
  ): RuneBalance {
    return {
      confirmations: runeBalance.confirmations,
      divisibility: runeBalance.divisibility,
      amount: runeBalance.amount,
      rune_id: runeBalance.rune_id,
      symbol: runeBalance.symbol,
    };
  }
}
