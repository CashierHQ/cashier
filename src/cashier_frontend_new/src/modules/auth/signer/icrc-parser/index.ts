import { parseIcrc1TransferError } from "./icrc-1-parser";
import {
  parseIcrc2ApproveError,
  parseIcrc2TransferFromError,
} from "./icrc-2-parser";
import { parseIcrc7TransferError } from "./icrc-7-parser";
import {
  parseIcrc37ApproveTokenError,
  parseIcrc37ApproveCollectionError,
  parseIcrc37RevokeTokenApprovalError,
  parseIcrc37RevokeCollectionApprovalError,
  parseIcrc37TransferFromError,
} from "./icrc-37-parser";
import type { IcrcError } from "./common-types";

// Re-exports
export type {
  IcrcError,
  IcrcErrorVariant,
  IcrcErrorData,
} from "./common-types";
export { formatIcrcError } from "./common-formatter";

type IcrcParser = (buf: ArrayBuffer) => IcrcError | null;

/** Method name → parser lookup */
const parsers: Record<string, IcrcParser> = {
  icrc1_transfer: parseIcrc1TransferError,
  icrc2_approve: parseIcrc2ApproveError,
  icrc2_transfer_from: parseIcrc2TransferFromError,
  icrc7_transfer: parseIcrc7TransferError,
  icrc37_approve_tokens: parseIcrc37ApproveTokenError,
  icrc37_approve_collection: parseIcrc37ApproveCollectionError,
  icrc37_revoke_token_approvals: parseIcrc37RevokeTokenApprovalError,
  icrc37_revoke_collection_approvals: parseIcrc37RevokeCollectionApprovalError,
  icrc37_transfer_from: parseIcrc37TransferFromError,
};

/**
 * Parse ICRC error by method name from candid-encoded ArrayBuffer.
 * Returns typed IcrcError or null if method unknown or buf is not an Err.
 */
export function parseIcrcError(
  method: string,
  buf: ArrayBuffer,
): IcrcError | null {
  const parser = parsers[method];
  return parser ? parser(buf) : null;
}
