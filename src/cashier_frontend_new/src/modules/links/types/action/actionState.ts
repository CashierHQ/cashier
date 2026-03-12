import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { ActionState as SharedActionState } from "$shared";

// Frontend representation of the state of an Action (string-based like LinkState)
export class ActionState {
  private constructor() {}
  static readonly CREATED = "CREATED";
  static readonly PROCESSING = "PROCESSING";
  static readonly SUCCESS = "SUCCESS";
  static readonly FAIL = "FAIL";
}

type ActionStateValue =
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

  static fromSharedType(s: SharedActionState): ActionStateValue {
    switch (s) {
      case SharedActionState.Created:
        return ActionState.CREATED;
      case SharedActionState.Processing:
        return ActionState.PROCESSING;
      case SharedActionState.Success:
        return ActionState.SUCCESS;
      case SharedActionState.Fail:
        return ActionState.FAIL;
      default:
        return assertUnreachable(s);
    }
  }
}
