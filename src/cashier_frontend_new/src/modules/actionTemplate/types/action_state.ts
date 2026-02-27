import { type IntentState_1 as BackendSharedActionState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { ActionState as SharedActionState } from "$shared";

export type SharedActionStateValue =
  | typeof SharedActionState.Created
  | typeof SharedActionState.Processing
  | typeof SharedActionState.Success
  | typeof SharedActionState.Fail;

/**
 * Mapper for converting between frontend SharedActionState and backend ActionState
 */
export class SharedActionStateMapper {
  /**
   * Convert frontend SharedActionState to corresponding backend ActionState
   * @param actionState
   * @returns
   */
  static toBackendType(
    actionState: SharedActionStateValue,
  ): BackendSharedActionState {
    switch (actionState) {
      case SharedActionState.Created:
        return { Created: null };
      case SharedActionState.Processing:
        return { Processing: null };
      case SharedActionState.Success:
        return { Success: null };
      case SharedActionState.Fail:
        return { Fail: null };
      default:
        return assertUnreachable(actionState);
    }
  }

  /**
   * Convert backend ActionState to corresponding frontend SharedActionState
   * @param actionState
   * @returns
   */
  static toLocalType(actionState: BackendSharedActionState): SharedActionState {
    return rsMatch(actionState, {
      Created: () => SharedActionState.Created,
      Processing: () => SharedActionState.Processing,
      Success: () => SharedActionState.Success,
      Fail: () => SharedActionState.Fail,
    });
  }
}
