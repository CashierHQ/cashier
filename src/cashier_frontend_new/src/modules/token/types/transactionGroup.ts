import type { DisplayTransaction } from "$modules/token/types/displayTransaction";

/**
 * Group of transactions for a single date
 */
export type TransactionGroup = {
  date: string;
  transactions: DisplayTransaction[];
};
