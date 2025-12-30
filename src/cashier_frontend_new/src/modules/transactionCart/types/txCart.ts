import { assertUnreachable } from "$lib/rsMatch";
import IntentState, {
  type IntentStateValue,
} from "$modules/links/types/action/intentState";

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
 * @property isOutgoing - true if user is sender (debit), false if receiver (credit)
 */
export interface AssetItem {
  state: AssetProcessState;
  /** true if outgoing (user sends), false if incoming (user receives) */
  isOutgoing: boolean;
  label: string;
  symbol: string;
  address: string;
  amount: bigint;
  /** in formmated string */
  amountFormattedStr: string;
  /** in formmated string */
  usdValueStr?: string;
}
