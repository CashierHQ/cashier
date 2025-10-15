import { rsMatch } from "$lib/rsMatch";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

// Frontend representation of the state of an Intent
export class IntentState {
  private constructor(public readonly id: string) {}
  static readonly Created = new IntentState("Created");
  static readonly Processing = new IntentState("Processing");
  static readonly Success = new IntentState("Success");
  static readonly Fail = new IntentState("Fail");

  /**
   * @param b BackendIntentState from backend
   * @returns Intent state corresponding to the backend state
   */
  static fromBackendType(b: BackendIntentState): IntentState {
    return rsMatch(b, {
      Created: () => IntentState.Created,
      Processing: () => IntentState.Processing,
      Success: () => IntentState.Success,
      Fail: () => IntentState.Fail,
    });
  }
}

export default IntentState;
