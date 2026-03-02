import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import { LinkStep } from "$modules/links/types/linkStep";
import { ActionType as SharedActionType } from "$shared";

// State when the link active and ready for use
export class LinkActiveStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.ACTIVE;

  async createAction(
    actionType: SharedActionType,
  ): Promise<CreateActionResponseV3> {
    throw new Error("Create action is not supported in Active state");
  }

  // process the action for use link
  async processAction(): Promise<ProcessActionResponseV3> {
    throw new Error("Process action is not supported in Active state");
  }
}
