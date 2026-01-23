import {
  type BridgeTransaction,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";

/**
 * Group bridge transactions by their creation date.
 * @param bridgeTransactions
 * @returns Record with date strings as keys and arrays of BridgeTransactionWithUsdValue as values
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

/**
 * Enrich bridge transactions with their USD value based on the provided BTC price.
 * @param bridgeTransactions
 * @param btcPriceUSD
 * @returns Array of BridgeTransactionWithUsdValue
 */
export const enrichBridgeTransactionWithUsdValue = (
  bridgeTransactions: BridgeTransaction[],
  btcPriceUSD: number | null,
): BridgeTransactionWithUsdValue[] => {
  return bridgeTransactions.map((tx: BridgeTransaction) => {
    let total_amount_usd = 0;
    if (btcPriceUSD && tx.total_amount) {
      const amountInBtc = Number(tx.total_amount) / 100_000_000;
      total_amount_usd = amountInBtc * btcPriceUSD;
    }
    return {
      ...tx,
      total_amount_usd: total_amount_usd,
    };
  });
};
