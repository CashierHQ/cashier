import IntentState from "$modules/links/types/action/intentState";

/**
 * Enumeration of asset processing states
 */
export enum AssetProcessState {
  CREATED = "CREATED",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCEED = "SUCCEED",
  FAILED = "FAILED",
}

export class AccessProcessStateMapper {
  static fromIntentState(state: IntentState): AssetProcessState {
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
        return AssetProcessState.PENDING;
    }
  }
}

/**
 * Asset item representation
 */
export interface AssetItem {
  state: AssetProcessState;
  label: string;
  symbol: string;
  address: string;
  /** in formmated string */
  amount: string;
  /** in formmated string */
  usdValueStr?: string;
}
