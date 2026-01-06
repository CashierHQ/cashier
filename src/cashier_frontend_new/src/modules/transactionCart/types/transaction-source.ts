import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { TokenMetadata } from "$modules/token/types";
import type { ReceiveAddressType } from "$modules/wallet/types";
import type { Principal } from "@dfinity/principal";

/**
 * Transaction source type discriminator enum
 */
export enum TransactionSourceType {
  ACTION = "action",
  WALLET = "wallet",
}

/**
 * Action-based transaction source (ICRC-112 batch execution)
 */
export type ActionSource = {
  type: TransactionSourceType.ACTION;
  action: Action;
  handleProcessAction: () => Promise<ProcessActionResult>;
};

/**
 * Wallet-based transaction source (direct ICRC/ICP transfer)
 */
export type WalletSource = {
  type: TransactionSourceType.WALLET;
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
  return source.type === TransactionSourceType.ACTION;
}

/**
 * Type guard for WalletSource
 */
export function isWalletSource(
  source: TransactionSource,
): source is WalletSource {
  return source.type === TransactionSourceType.WALLET;
}
