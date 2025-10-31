import { rsMatch } from "$lib/rsMatch";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

// Frontend representation of the state of an Action (string-based like LinkState)
export class ActionState {
  private constructor() {}
  static readonly CREATED = "CREATED";
  static readonly PROCESSING = "PROCESSING";
  static readonly SUCCESS = "SUCCESS";
  static readonly FAIL = "FAIL";
}

export type ActionStateValue =
  | typeof ActionState.CREATED
  | typeof ActionState.PROCESSING
  | typeof ActionState.SUCCESS
  | typeof ActionState.FAIL;

export class ActionStateMapper {
  /**
   * @param b BackendIntentState from backend
   * @returns ActionStateValue corresponding to the backend state
   */
  static fromBackendType(b: BackendIntentState): ActionStateValue {
    return rsMatch(b, {
      Created: () => ActionState.CREATED,
      Processing: () => ActionState.PROCESSING,
      Success: () => ActionState.SUCCESS,
      Fail: () => ActionState.FAIL,
    });
  }
}
