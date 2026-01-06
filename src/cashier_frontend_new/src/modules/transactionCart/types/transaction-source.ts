import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { TokenMetadata } from "$modules/token/types";
import type { ReceiveAddressType } from "$modules/wallet/types";
import type { Principal } from "@dfinity/principal";

/**
 * Action-based transaction source (ICRC-112 batch execution)
 */
export type ActionSource = {
  type: "action";
  action: Action;
  handleProcessAction: () => Promise<ProcessActionResult>;
};

/**
 * Wallet-based transaction source (direct ICRC/ICP transfer)
 */
export type WalletSource = {
  type: "wallet";
  token: TokenMetadata;
  to: Principal;
  toAccountId?: string; // For ICP account transfers
  amount: bigint;
  receiveType: ReceiveAddressType;
};

/**
 * Discriminated union of all transaction source types
 */
export type TransactionSource = ActionSource | WalletSource;

/**
 * Conditional return type - infers execute result based on source type
 */
export type ExecuteResult<T extends TransactionSource> = T extends ActionSource
  ? ProcessActionResult
  : T extends WalletSource
    ? bigint
    : never;

/**
 * Type guard for ActionSource
 */
export function isActionSource(
  source: TransactionSource,
): source is ActionSource {
  return source.type === "action";
}

/**
 * Type guard for WalletSource
 */
export function isWalletSource(
  source: TransactionSource,
): source is WalletSource {
  return source.type === "wallet";
}
