import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";

export class CompletedState implements UserLinkState {
  readonly step = UserLinkStep.COMPLETED;

  async goNext(): Promise<void> {
    throw new Error("Completed is final state, cannot go next");
  }

  async goBack(): Promise<void> {
    throw new Error("Completed is final state, cannot go back");
  }

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error(
      `Action type ${actionType} cannot be created in Completed state`,
    );
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Completed is final state, cannot process action");
  }
}
