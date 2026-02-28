import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { LinkStep } from "$modules/links/types/linkStep";
import { ActionType as SharedActionType } from "$shared";

// State when the link active and ready for use
export class LinkActiveStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.ACTIVE;

  async createAction(
    _actionType: SharedActionType,
  ): Promise<CreateActionResultV3> {
    throw new Error("Create action is not supported in Active state");
  }

  // process the action for use link
  async processAction(): Promise<ProcessActionResultV3> {
    throw new Error("Process action is not supported in Active state");
  }
}
