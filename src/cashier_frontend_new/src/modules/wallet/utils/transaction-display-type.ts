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
