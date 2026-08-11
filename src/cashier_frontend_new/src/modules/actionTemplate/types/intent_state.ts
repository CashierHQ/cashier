import { type IntentState as BackendSharedIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { IntentState as SharedIntentState } from "$shared";

export type SharedIntentStateValue =
  | typeof SharedIntentState.Created
  | typeof SharedIntentState.Processing
  | typeof SharedIntentState.Success
  | typeof SharedIntentState.Fail;

/**
 * Mapper for converting between frontend SharedIntentState and backend IntentState
 */
export class SharedIntentStateMapper {
  /**
   * Convert frontend SharedIntentState to corresponding backend IntentState
   * @param intentState
   * @returns
   */
  static toBackendType(
    intentState: SharedIntentStateValue,
  ): BackendSharedIntentState {
    switch (intentState) {
      case SharedIntentState.Created:
        return { Created: null };
      case SharedIntentState.Processing:
        return { Processing: null };
      case SharedIntentState.Success:
        return { Success: null };
      case SharedIntentState.Fail:
        return { Fail: null };
      default:
        return assertUnreachable(intentState);
    }
  }

  /**
   * Convert backend IntentState to corresponding frontend SharedIntentState
   * @param intentState
   * @returns
   */
  static toLocalType(intentState: BackendSharedIntentState): SharedIntentState {
    return rsMatch(intentState, {
      Created: () => SharedIntentState.Created,
      Processing: () => SharedIntentState.Processing,
      Success: () => SharedIntentState.Success,
      Fail: () => SharedIntentState.Fail,
    });
  }
}
