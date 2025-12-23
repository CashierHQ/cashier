import { SvelteMap } from "svelte/reactivity";
import type {
  DisplayTransaction,
  TransactionGroup,
} from "$modules/token/types";

/**
 * Formats a timestamp into a readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024") or "Unknown" for invalid timestamps
 */
export function formatDate(timestamp: number): string {
  // Handle invalid/missing timestamps (0 = Unix epoch = Jan 1, 1970)
  if (!timestamp || timestamp < 1000000000000) {
    // Less than year 2001 in ms - likely invalid
    return "Unknown";
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Generates a unique date key for grouping transactions
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date key in format "YYYY-M-D" or "unknown" for invalid timestamps
 */
export function getDateKey(timestamp: number): string {
  if (!timestamp || timestamp < 1000000000000) {
    return "unknown";
  }
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
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
