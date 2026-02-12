import { IDL } from "@dfinity/candid";
import type { IcrcError } from "./common-types";
import {
  IdlLedgerTime,
  IdlDuplicate,
  IdlGenericError,
  decodeErrVariant,
} from "./common-types";

/** ICRC-7 icrc7_transfer error: variant { Ok: nat; Err: TransferError } */
const Icrc7TransferErrType = IDL.Variant({
  Err: IDL.Variant({
    NonExistingTokenId: IDL.Null,
    InvalidRecipient: IDL.Null,
    Unauthorized: IDL.Null,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    Duplicate: IdlDuplicate,
    GenericError: IdlGenericError,
    GenericBatchError: IdlGenericError,
  }),
});

/** Parse ICRC-7 TransferError from candid-encoded ArrayBuffer */
export function parseIcrc7TransferError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc7TransferErrType, buf);
}
