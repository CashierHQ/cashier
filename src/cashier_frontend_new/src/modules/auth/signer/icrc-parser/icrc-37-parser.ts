import { IDL } from "@dfinity/candid";
import type { IcrcError } from "./common-types";
import {
  IdlLedgerTime,
  IdlDuplicate,
  IdlGenericError,
  decodeErrVariant,
} from "./common-types";

// --- ICRC-37 IDL error types (NFT approve/revoke/transfer_from) ---

const Icrc37ApproveTokenErrType = IDL.Variant({
  Err: IDL.Variant({
    NonExistingTokenId: IDL.Null,
    InvalidSpender: IDL.Null,
    Unauthorized: IDL.Null,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    GenericError: IdlGenericError,
    GenericBatchError: IdlGenericError,
  }),
});

const Icrc37ApproveCollectionErrType = IDL.Variant({
  Err: IDL.Variant({
    InvalidSpender: IDL.Null,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    GenericError: IdlGenericError,
    GenericBatchError: IdlGenericError,
  }),
});

const Icrc37RevokeTokenApprovalErrType = IDL.Variant({
  Err: IDL.Variant({
    ApprovalDoesNotExist: IDL.Null,
    Unauthorized: IDL.Null,
    NonExistingTokenId: IDL.Null,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    GenericError: IdlGenericError,
    GenericBatchError: IdlGenericError,
  }),
});

const Icrc37RevokeCollectionApprovalErrType = IDL.Variant({
  Err: IDL.Variant({
    ApprovalDoesNotExist: IDL.Null,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    GenericError: IdlGenericError,
    GenericBatchError: IdlGenericError,
  }),
});

const Icrc37TransferFromErrType = IDL.Variant({
  Err: IDL.Variant({
    InvalidRecipient: IDL.Null,
    Unauthorized: IDL.Null,
    NonExistingTokenId: IDL.Null,
    TooOld: IDL.Null,
    CreatedInFuture: IdlLedgerTime,
    Duplicate: IdlDuplicate,
    GenericError: IdlGenericError,
    GenericBatchError: IdlGenericError,
  }),
});

// --- Parser functions ---

export function parseIcrc37ApproveTokenError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc37ApproveTokenErrType, buf);
}

export function parseIcrc37ApproveCollectionError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc37ApproveCollectionErrType, buf);
}

export function parseIcrc37RevokeTokenApprovalError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc37RevokeTokenApprovalErrType, buf);
}

export function parseIcrc37RevokeCollectionApprovalError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc37RevokeCollectionApprovalErrType, buf);
}

export function parseIcrc37TransferFromError(
  buf: ArrayBuffer,
): IcrcError | null {
  return decodeErrVariant(Icrc37TransferFromErrType, buf);
}
