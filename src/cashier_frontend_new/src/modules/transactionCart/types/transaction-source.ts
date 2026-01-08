import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { TokenMetadata } from "$modules/token/types";
import type { ReceiveAddressType } from "$modules/wallet/types";
import type { Principal } from "@dfinity/principal";
import type { Result } from "ts-results-es";

/**
 * Flow direction discriminator
 */
export class FlowDirection {
  private constructor() {}
  static readonly INCOMING = "INCOMING";
  static readonly OUTGOING = "OUTGOING";
}

export type FlowDirectionValue =
  | typeof FlowDirection.INCOMING
  | typeof FlowDirection.OUTGOING;

/**
 * Error types for flow direction computation
 */
export class FlowDirectionError {
  private constructor() {}
  static readonly NOT_AUTHENTICATED = "NOT_AUTHENTICATED";
  static readonly NO_INTENT = "NO_INTENT";
}

export type FlowDirectionErrorValue =
  | typeof FlowDirectionError.NOT_AUTHENTICATED
  | typeof FlowDirectionError.NO_INTENT;

/**
 * Result type for flow direction computation
 */
export type FlowDirectionResult = Result<FlowDirectionValue, FlowDirectionErrorValue>;

/**
 * Transaction source type discriminator
 */
export class TransactionSourceType {
  private constructor() {}
  static readonly ACTION = "ACTION";
  static readonly WALLET = "WALLET";
}

export type TransactionSourceTypeValue =
  | typeof TransactionSourceType.ACTION
  | typeof TransactionSourceType.WALLET;

/**
 * Action-based transaction source (ICRC-112 batch execution)
 */
export type ActionSource = {
  type: typeof TransactionSourceType.ACTION;
  action: Action;
  handleProcessAction: () => Promise<ProcessActionResult>;
};

/**
 * Wallet-based transaction source (direct ICRC/ICP transfer)
 */
export type WalletSource = {
  type: typeof TransactionSourceType.WALLET;
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
