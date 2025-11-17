import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";

// Frontend representation of the state of an Intent (string-based)
class IntentState {
  private constructor() {}
  static readonly CREATED = "CREATED";
  static readonly PROCESSING = "PROCESSING";
  static readonly SUCCESS = "SUCCESS";
  static readonly FAIL = "FAIL";
}

type IntentStateValue =
  | typeof IntentState.CREATED
  | typeof IntentState.PROCESSING
  | typeof IntentState.SUCCESS
  | typeof IntentState.FAIL;

export class IntentStateMapper {
  /**
   * @param b BackendIntentState from backend
   * @returns IntentStateValue corresponding to the backend state
   */
  static fromBackendType(b: BackendIntentState): IntentStateValue {
    return rsMatch(b, {
      Created: () => IntentState.CREATED,
      Processing: () => IntentState.PROCESSING,
      Success: () => IntentState.SUCCESS,
      Fail: () => IntentState.FAIL,
    });
  }
}

export default IntentState;
