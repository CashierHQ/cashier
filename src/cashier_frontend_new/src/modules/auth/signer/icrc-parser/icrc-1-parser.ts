import { IDL } from "@dfinity/candid";
import type { IcrcError } from "./common-types";
import {
  IdlFee,
  IdlBurn,
  IdlBalance,
  IdlLedgerTime,
  IdlDuplicate,
  IdlGenericError,
  decodeErrVariant,
} from "./common-types";

/** ICRC-1 icrc1_transfer error: variant { Ok: nat; Err: TransferError } */
const Icrc1TransferErrType = IDL.Variant({
  Err: IDL.Variant({
    BadFee: IdlFee,
    BadBurn: IdlBurn,
    InsufficientFunds: IdlBalance,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    Duplicate: IdlDuplicate,
    TemporarilyUnavailable: IDL.Null,
    GenericError: IdlGenericError,
  }),
});

/** Parse ICRC-1 TransferError from candid-encoded ArrayBuffer */
export function parseIcrc1TransferError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc1TransferErrType, buf);
}
