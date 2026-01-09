import type {
  DisplayTransaction,
  TransactionGroup,
} from "$modules/token/types";
import { SvelteMap } from "svelte/reactivity";

/**
 * Formats a timestamp into a readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Generates a unique date key for grouping transactions
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date key in format "YYYY-M-D"
 */
export function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

/**
 * Groups transactions by date and sorts them
 * @param transactions - Array of transactions to group
 * @returns Array of transaction groups sorted by date (newest first)
 */
export function groupTransactionsByDate(
  transactions: DisplayTransaction[],
): TransactionGroup[] {
  const grouped = new SvelteMap<string, DisplayTransaction[]>();
  const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((tx) => {
    const dateKey = getDateKey(tx.timestamp);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(tx);
  });

  return Array.from(grouped.entries()).map(([, txs]) => ({
    date: formatDate(txs[0].timestamp),
    transactions: txs,
  }));
}
