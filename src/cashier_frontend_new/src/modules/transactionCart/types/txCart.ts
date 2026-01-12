import { assertUnreachable } from "$lib/rsMatch";
import IntentState, {
  type IntentStateValue,
} from "$modules/links/types/action/intentState";
import type { FlowDirection } from "./transaction-source";

/**
 * Generic asset processing states for UI rendering.
 * Source-agnostic - mapped from source-specific states.
 */
export enum AssetProcessState {
  CREATED = "CREATED",
  PROCESSING = "PROCESSING",
  SUCCEED = "SUCCEED",
  FAILED = "FAILED",
}

/**
 * Wallet transfer lifecycle states.
 * Client-side state for direct ledger transfers.
 */
export enum WalletTransferState {
  CREATED = "CREATED",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

/**
 * Maps source-specific states to generic AssetProcessState for UI rendering.
 */
export class AssetProcessStateMapper {
  /**
   * Map IntentState (backend) to AssetProcessState
   */
  static fromIntentState(state: IntentStateValue): AssetProcessState {
    switch (state) {
      case IntentState.CREATED:
        return AssetProcessState.CREATED;
      case IntentState.PROCESSING:
        return AssetProcessState.PROCESSING;
      case IntentState.SUCCESS:
        return AssetProcessState.SUCCEED;
      case IntentState.FAIL:
        return AssetProcessState.FAILED;
      default:
        assertUnreachable(state);
    }
  }

  /**
   * Map WalletTransferState (client) to AssetProcessState
   */
  static fromWalletTransferState(
    state: WalletTransferState,
  ): AssetProcessState {
    switch (state) {
      case WalletTransferState.CREATED:
        return AssetProcessState.CREATED;
      case WalletTransferState.PROCESSING:
        return AssetProcessState.PROCESSING;
      case WalletTransferState.SUCCESS:
        return AssetProcessState.SUCCEED;
      case WalletTransferState.FAILED:
        return AssetProcessState.FAILED;
      default:
        assertUnreachable(state);
    }
  }
}

/** @deprecated Use AssetProcessStateMapper instead */
export const AccessProcessStateMapper = AssetProcessStateMapper;

/**
 * Asset item representation
 */
export interface AssetItem {
  state: AssetProcessState;
  label: string;
  symbol: string;
  address: string;
  amount: bigint;
  /** in formmated string */
  amountFormattedStr: string;
  /** in formmated string */
  usdValueStr?: string;
  /** direction of the asset based on current user*/
  direction: FlowDirection;
  /** Intent ID for ActionSource - used to match asset to intent for state sync */
  intentId?: string;
}
