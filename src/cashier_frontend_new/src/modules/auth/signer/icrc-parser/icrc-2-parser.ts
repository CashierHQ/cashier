import { IDL } from "@dfinity/candid";
import type { IcrcError } from "./common-types";
import {
  IdlFee,
  IdlBurn,
  IdlBalance,
  IdlAllowance,
  IdlAllowanceChanged,
  IdlLedgerTime,
  IdlDuplicate,
  IdlGenericError,
  decodeErrVariant,
} from "./common-types";

/** ICRC-2 icrc2_approve error: variant { Ok: nat; Err: ApproveError } */
const Icrc2ApproveErrType = IDL.Variant({
  Err: IDL.Variant({
    BadFee: IdlFee,
    InsufficientFunds: IdlBalance,
    AllowanceChanged: IdlAllowanceChanged,
    Expired: IdlLedgerTime,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    Duplicate: IdlDuplicate,
    TemporarilyUnavailable: IDL.Null,
    GenericError: IdlGenericError,
  }),
});

/** ICRC-2 icrc2_transfer_from error: variant { Ok: nat; Err: TransferFromError } */
const Icrc2TransferFromErrType = IDL.Variant({
  Err: IDL.Variant({
    BadFee: IdlFee,
    BadBurn: IdlBurn,
    InsufficientFunds: IdlBalance,
    InsufficientAllowance: IdlAllowance,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    Duplicate: IdlDuplicate,
    TemporarilyUnavailable: IDL.Null,
    GenericError: IdlGenericError,
  }),
});

/** Parse ICRC-2 ApproveError from candid-encoded ArrayBuffer */
export function parseIcrc2ApproveError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc2ApproveErrType, buf);
}

/** Parse ICRC-2 TransferFromError from candid-encoded ArrayBuffer */
export function parseIcrc2TransferFromError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc2TransferFromErrType, buf);
}
