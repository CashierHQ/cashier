import { rsMatch } from "$lib/rsMatch";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

export class ActionState {
  private constructor(public readonly id: string) {}
  static readonly Created = new ActionState("CREATED");
  static readonly Processing = new ActionState("PROCESSING");
  static readonly Success = new ActionState("SUCCESS");
  static readonly Fail = new ActionState("FAIL");

  static fromBackendType(b: BackendIntentState): ActionState {
    return rsMatch(b, {
      Created: () => ActionState.Created,
      Processing: () => ActionState.Processing,
      Success: () => ActionState.Success,
      Fail: () => ActionState.Fail,
    });
  }
}
