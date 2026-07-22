import type { BridgeTransaction } from "$modules/bitcoin/types/bridge_transaction";
import type { ProcessActionResult } from "$modules/detailLink/types/genericDetailStoreVM";
import type Action from "$modules/links/types/action/action";
import type { TokenMetadata } from "$modules/token/types";
import type { ReceiveAddressType } from "$modules/wallet/types";
import type { EnrichedNFT } from "$modules/wallet/types/nft";
import type { Principal } from "@icp-sdk/core/principal";
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
  /** When set to TIP_SHARED_TEST, cart uses shared-package fee logic for consistency with preview */
  linkType?: string;
  /** Max use for the link; required when linkType is TIP_SHARED_TEST for fee calculation */
  maxUse?: number;
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

/**
 * NFT wallet transaction source (direct EXT/ICRC-7 transfer)
 */
export type NftSource = {
  nft: EnrichedNFT;
  collectionStandard?: string | null;
  /* recipient address - principal or EXT account identifier (string) */
  to: Principal | string;
  receiveType: ReceiveAddressType;
  onSuccess?: (blockIndex: bigint) => void;
};

export type BridgeSource = {
  bridge: BridgeTransaction;
};
