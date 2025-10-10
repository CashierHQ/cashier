import { rsMatch } from "$lib/rsMatch";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

export class IntentState {
  private constructor(public readonly id: string) {}
  static readonly Created = new IntentState("Created");
  static readonly Processing = new IntentState("Processing");
  static readonly Success = new IntentState("Success");
  static readonly Fail = new IntentState("Fail");

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
