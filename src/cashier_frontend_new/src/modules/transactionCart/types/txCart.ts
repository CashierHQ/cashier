import { assertUnreachable } from "$lib/rsMatch";
import IntentState, {
  type IntentStateValue,
} from "$modules/links/types/action/intentState";
import type { FlowDirection } from "./transaction-source";

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
}

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
}
