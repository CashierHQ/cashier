import * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import {
  type BridgeTransaction,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import {
  RetrieveBtcStatusKind,
  type RetrieveBtcStatus,
} from "$modules/bitcoin/types/ckbtc_minter";

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

/**
 * Map the RetrieveBtcStatusV2 returned by the ckBTC Minter canister to the RetrieveBtcStatus used in the frontend.
 * @param status
 * @returns
 */
export const mapRetrieveBtcStatus = (
  status: ckBTCMinter.RetrieveBtcStatusV2,
): RetrieveBtcStatus => {
  if ("Signing" in status) {
    return { kind: RetrieveBtcStatusKind.Signing, txid: null };
  }
  if ("Sending" in status) {
    return {
      kind: RetrieveBtcStatusKind.Sending,
      txid: txidToHex(status.Sending.txid),
    };
  }
  if ("Submitted" in status) {
    return {
      kind: RetrieveBtcStatusKind.Submitted,
      txid: txidToHex(status.Submitted.txid),
    };
  }
  if ("Confirmed" in status) {
    return {
      kind: RetrieveBtcStatusKind.Confirmed,
      txid: txidToHex(status.Confirmed.txid),
    };
  }
  if ("Pending" in status) {
    return { kind: RetrieveBtcStatusKind.Pending, txid: null };
  }
  if ("Unknown" in status) {
    return { kind: RetrieveBtcStatusKind.Unknown, txid: null };
  }
  if ("AmountTooLow" in status) {
    return { kind: RetrieveBtcStatusKind.AmountTooLow, txid: null };
  }
  if ("WillReimburse" in status) {
    return { kind: RetrieveBtcStatusKind.WillReimburse, txid: null };
  }
  if ("Reimbursed" in status) {
    return { kind: RetrieveBtcStatusKind.Reimbursed, txid: null };
  }

  throw new Error("Unknown retrieve BTC status");
};

/**
 * Convert a txid represented as a Uint8Array or number array to a hexadecimal string.
 * @param txid
 * @returns
 */
export const txidToHex = (txid: Uint8Array | number[]): string => {
  const bytes = Array.from(txid);
  return bytes
    .slice()
    .reverse()
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
