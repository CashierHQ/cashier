import type { DisplayTransaction } from "./displayTransaction";

/**
 * Group of transactions for a single date
 */
export type TransactionGroup = {
  date: string;
  transactions: DisplayTransaction[];
};
