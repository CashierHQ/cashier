import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from ".";

// State when the link ended
export class LinkEndedState implements LinkDetailState {
  readonly step = LinkStep.INACTIVE;

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error(
      `Creating ${actionType} action is not supported in Ended state`,
    );
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Link has ended; no further actions can be processed.");
  }
}
