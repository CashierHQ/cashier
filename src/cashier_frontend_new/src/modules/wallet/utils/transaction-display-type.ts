import { assertUnreachable } from "$lib/rsMatch";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import {
  TransactionKind,
  type TokenTransaction,
  type TokenWithPriceAndBalance,
  type TransactionKindValue,
} from "$modules/token/types";
import { Err, Ok, type Result } from "ts-results-es";
import { deriveAccountId } from "./deriveAccountId";

/**
 * Check if address matches user (handles both principal and accountId formats)
 * Automatically derives accountId from principal for ICP token support
 */
function isUserAddress(
  address: string | undefined,
  userPrincipal: string | undefined,
  userAccountId: string | undefined,
): boolean {
  if (!address) return false;
  // Compare against principal (ICRC tokens) or accountId (ICP)
  return address === userPrincipal || address === userAccountId;
}

/**
 * Determine if transaction is outgoing (debit, shows "-") based on kind and direction.
 * - APPROVE/BURN: always outgoing
 * - MINT: always incoming
 * - transfer: outgoing if from == user
 *
 * Handles both ICRC (principal) and ICP (accountId) address formats automatically.
 *
 * @param tx - Token transaction
 * @param userPrincipal - User's principal string
 */
export function isTransactionOutgoing(
  tx: TokenTransaction,
  token: TokenWithPriceAndBalance,
  userPrincipal: string,
): Result<boolean, Error> {
  let userAccountId: string | undefined;
  if (token.address === ICP_LEDGER_CANISTER_ID) {
    const res = deriveAccountId(userPrincipal);
    if (res.isErr()) {
      return Err(
        new Error(
          "Failed to derive accountId for ICP transaction direction check",
        ),
      );
    } else {
      userAccountId = res.unwrap();
    }
  }

  switch (tx.kind) {
    case TransactionKind.APPROVE:
    case TransactionKind.BURN:
      return Ok(true);
    case TransactionKind.MINT:
      return Ok(false);
    case TransactionKind.TRANSFER:
      // Check from first: if user is sender, it's outgoing (handles self-transfer correctly)
      if (isUserAddress(tx.from, userPrincipal, userAccountId)) {
        return Ok(true);
      } else if (isUserAddress(tx.to, userPrincipal, userAccountId)) {
        return Ok(false);
      } else {
        return Err(new Error("Transaction does not involve user"));
      }
    default:
      assertUnreachable(tx.kind);
  }
}

/** Map kind + isOutgoing to i18n key suffix */
const LABEL_KEY_MAP: Record<
  TransactionKindValue,
  { outgoing: string; incoming: string }
> = {
  [TransactionKind.TRANSFER]: { outgoing: "sent", incoming: "received" },
  [TransactionKind.APPROVE]: { outgoing: "approve", incoming: "approve" },
  [TransactionKind.MINT]: { outgoing: "mint", incoming: "mint" },
  [TransactionKind.BURN]: { outgoing: "burn", incoming: "burn" },
};

/**
 * Get i18n key for transaction label based on kind + direction
 * @returns key like "wallet.tokenInfo.sent"
 */
export function getTransactionLabelKey(
  kind: TransactionKindValue,
  isOutgoing: boolean,
): string {
  const labels = LABEL_KEY_MAP[kind];
  return `wallet.tokenInfo.${isOutgoing ? labels.outgoing : labels.incoming}`;
}
