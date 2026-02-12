import { IDL, type JsonValue } from "@dfinity/candid";

/**
 * All known error variant names across ICRC-1/2/7/37 standards.
 * Used as discriminator for typed error handling.
 */
export type IcrcErrorVariant =
  // ICRC-1/2: Fee & balance errors
  | "BadFee"
  | "BadBurn"
  | "InsufficientFunds"
  | "InsufficientAllowance"
  | "AllowanceChanged"
  // ICRC-1/2/7/37: Timestamp & dedup errors
  | "TooOld"
  | "CreatedInFuture"
  | "Duplicate"
  | "TemporarilyUnavailable"
  | "Expired"
  // ICRC-1/2/7/37: Generic errors
  | "GenericError"
  | "GenericBatchError"
  // ICRC-7/37: NFT-specific errors
  | "NonExistingTokenId"
  | "InvalidRecipient"
  | "Unauthorized"
  | "InvalidSpender"
  | "ApprovalDoesNotExist";

/** Parsed ICRC error — variant name + inner fields only */
export type IcrcError = {
  variant: IcrcErrorVariant;
  details: JsonValue;
}

/** JSON-RPC error.data schema for code 1003 responses */
export type IcrcErrorData = {
  method: string;
  canisterId: string;
  icrcError: IcrcError | string;
}

// --- Shared IDL record definitions (reused by per-standard parsers) ---

export const IdlFee = IDL.Record({ expected_fee: IDL.Nat });
export const IdlBurn = IDL.Record({ min_burn_amount: IDL.Nat });
export const IdlBalance = IDL.Record({ balance: IDL.Nat });
export const IdlAllowance = IDL.Record({ allowance: IDL.Nat });
export const IdlAllowanceChanged = IDL.Record({
  current_allowance: IDL.Nat,
});
export const IdlLedgerTime = IDL.Record({ ledger_time: IDL.Nat64 });
export const IdlDuplicate = IDL.Record({ duplicate_of: IDL.Nat });
export const IdlGenericError = IDL.Record({
  error_code: IDL.Nat,
  message: IDL.Text,
});

/**
 * Shared helper: decode candid buffer with an Err-wrapping IDL type,
 * extract variant name + details. Returns IcrcError | null.
 * All per-standard parsers delegate to this to avoid repetition (DRY).
 */
export function decodeErrVariant(
  idlType: IDL.Type,
  buf: ArrayBuffer,
): IcrcError | null {
  try {
    const [decoded] = IDL.decode([idlType], buf);
    if (decoded && typeof decoded === "object" && "Err" in decoded) {
      const errObj = (decoded as { Err: Record<string, unknown> }).Err;
      const variant = Object.keys(errObj)[0];
      if (!variant) return null;
      const inner = errObj[variant];
      const details =
        inner !== null && inner !== undefined
          ?  (inner as JsonValue)
          : "Unknown";
      return { variant: variant as IcrcErrorVariant, details };
    }
  } catch {
    // IDL.decode throws on type mismatch — not an error of this standard
  }
  return null;
}
