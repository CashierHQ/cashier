import type { TokenTransaction } from "../types";

/**
 * UI-friendly transaction format for display
 */
export type UITransaction = {
  type: "sent" | "received";
  amount: number;
  address: string;
  timestamp: number;
  id: string;
};

/**
 * Check if an address matches the user's identifier
 * Handles both Principal strings and AccountIdentifier hex strings
 * @param address Address to check (could be Principal or AccountIdentifier hex)
 * @param userOwner User's principal string
 * @param userAccountId Optional user's AccountIdentifier hex (for ICP transactions)
 */
function isUserAddress(
  address: string | undefined,
  userOwner: string,
  userAccountId?: string,
): boolean {
  if (!address) return false;
  // Check if matches principal
  if (address === userOwner) return true;
  // Check if matches account identifier (for ICP transactions)
  if (userAccountId && address.toLowerCase() === userAccountId.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Map TokenTransaction to UI-friendly format
 * @param tx Raw transaction from index canister
 * @param userOwner Current user's principal
 * @param decimals Token decimals for amount conversion
 * @param userAccountId Optional user's AccountIdentifier hex (for ICP transactions)
 */
export function mapTransactionToUI(
  tx: TokenTransaction,
  userOwner: string,
  decimals: number,
  userAccountId?: string,
): UITransaction {
  // Determine transaction type and counterparty
  let type: "sent" | "received" = "received";
  let counterpartyAddress = "";

  if (tx.kind === "mint") {
    type = "received";
    counterpartyAddress = tx.to?.owner ?? "mint";
  } else if (tx.kind === "burn") {
    type = "sent";
    counterpartyAddress = tx.from?.owner ?? "burn";
  } else if (tx.kind === "transfer") {
    // Check if user is sender or receiver
    // Handle both Principal strings (ICRC) and AccountIdentifier hex (ICP)
    if (isUserAddress(tx.from?.owner, userOwner, userAccountId)) {
      type = "sent";
      counterpartyAddress = tx.to?.owner ?? "";
    } else {
      type = "received";
      counterpartyAddress = tx.from?.owner ?? "";
    }
  } else if (tx.kind === "approve") {
    type = "sent";
    counterpartyAddress = tx.spender?.owner ?? "";
  }

  // Convert bigint amount to number with decimals
  // Note: Safe for amounts up to Number.MAX_SAFE_INTEGER (2^53-1)
  // which covers most practical token amounts (e.g., up to ~90M tokens with 8 decimals)
  const amount = Number(tx.amount) / 10 ** decimals;

  // Convert timestamp from nanoseconds to milliseconds
  // Note: Safe for timestamps until year 2255
  const timestamp = Number(tx.timestamp / BigInt(1_000_000));

  return {
    type,
    amount,
    address: counterpartyAddress,
    timestamp,
    id: tx.id.toString(),
  };
}

/**
 * Group transactions by date for display
 */
export function groupTransactionsByDate(
  transactions: UITransaction[],
): { date: string; transactions: UITransaction[] }[] {
  if (transactions.length === 0) return [];

  const grouped = new Map<string, UITransaction[]>();
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

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
