import { type BridgeTransactionWithUsdValue } from "$modules/bitcoin/types/bridge_transaction";

/**
 * Group bridge transactions by their creation date.
 * @param bridgeTransactions
 * @returns
 */
export const groupBridgeTransactionsByDate = (
  bridgeTransactions: BridgeTransactionWithUsdValue[],
): Record<string, BridgeTransactionWithUsdValue[]> => {
  return bridgeTransactions.reduce(
    (acc, tx) => {
      const date = new Date(Number(tx.created_at_ts) * 1000).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        },
      );

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(tx);
      return acc;
    },
    {} as Record<string, BridgeTransactionWithUsdValue[]>,
  );
};
