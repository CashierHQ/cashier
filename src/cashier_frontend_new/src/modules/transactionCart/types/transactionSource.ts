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
  /** User is neither sender nor receiver */
  static readonly UNRELATED = "UNRELATED";
}

export type FlowDirectionErrorValue =
  | typeof FlowDirectionError.NOT_AUTHENTICATED
  | typeof FlowDirectionError.NO_INTENT
  | typeof FlowDirectionError.UNRELATED;

/**
 * Result type for flow direction computation
 */
export type FlowDirectionResult = Result<
  FlowDirectionValue,
  FlowDirectionErrorValue
>;

/**
 * Action-based transaction source (ICRC-112 batch execution)
 */
export type ActionSource = {
  action: Action;
  handleProcessAction: () => Promise<ProcessActionResult>;
  onSuccess?: (result: ProcessActionResult) => void;
};

/**
 * Wallet-based transaction source (direct ICRC/ICP transfer)
 */
export type WalletSource = {
  token: TokenMetadata;
  /* recipient address - principal or account identifier (string) */
  to: Principal | string;
  amount: bigint;
  /* receive type principal or account */
  receiveType: ReceiveAddressType;
  onSuccess?: (blockIndex: bigint) => void;
};
