import {
  DisplayTransactionType,
  TransactionKind,
  type DisplayTransactionTypeValue,
} from "$modules/token/types";

/**
 * Determine display type from transaction kind, direction, and spender.
 * Used to show user-friendly transaction labels (Sent, Received, etc.)
 */
export function getDisplayType(
  kind: string,
  from: string | undefined,
  to: string | undefined,
  spender: string | undefined,
  userPrincipal: string | undefined,
): DisplayTransactionTypeValue {
  if (kind === TransactionKind.APPROVE) return DisplayTransactionType.APPROVE;
  if (kind === TransactionKind.MINT) return DisplayTransactionType.MINT;
  if (kind === TransactionKind.BURN) return DisplayTransactionType.BURN;

  // For transfers, check direction based on `to` field (more reliable for ICRC)
  const isIncoming = to === userPrincipal;
  const isOutgoing = from === userPrincipal;

  // TransferFrom: tokens sent from current user's account by a spender
  if (isOutgoing && spender) return DisplayTransactionType.TRANSFER_FROM;
  // If user is recipient, it's received
  if (isIncoming) return DisplayTransactionType.RECEIVED;
  // If user is sender (or neither matched - fallback), it's sent
  return DisplayTransactionType.SENT;
}

/** Map of display type to i18n key suffix */
const LABEL_KEY_MAP: Record<DisplayTransactionTypeValue, string> = {
  [DisplayTransactionType.SENT]: "sent",
  [DisplayTransactionType.RECEIVED]: "received",
  [DisplayTransactionType.TRANSFER_FROM]: "transferFrom",
  [DisplayTransactionType.APPROVE]: "approve",
  [DisplayTransactionType.MINT]: "mint",
  [DisplayTransactionType.BURN]: "burn",
};

/**
 * Get i18n key for transaction type label
 * @returns key like "wallet.tokenInfo.sent"
 */
export function getTransactionLabelKey(type: DisplayTransactionTypeValue): string {
  return `wallet.tokenInfo.${LABEL_KEY_MAP[type]}`;
}

/** Types that represent outgoing/debit transactions (show "-" sign) */
const OUTGOING_TYPES: Set<DisplayTransactionTypeValue> = new Set([
  DisplayTransactionType.SENT,
  DisplayTransactionType.TRANSFER_FROM,
  DisplayTransactionType.BURN,
]);

/**
 * Check if transaction type is outgoing (debit)
 * Used to determine +/- sign prefix
 */
export function isOutgoingTransaction(type: DisplayTransactionTypeValue): boolean {
  return OUTGOING_TYPES.has(type);
}
