import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import { LinkStep } from "$modules/links/types/linkStep";
import type { ActionType as SharedActionType } from "$shared";

// State when the link ended
export class LinkEndedStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.ENDED;

  async createAction(
    actionType: SharedActionType,
  ): Promise<CreateActionResponseV3> {
    throw new Error(
      `Creating ${actionType} action is not supported in Ended state`,
    );
  }

  async processAction(): Promise<ProcessActionResponseV3> {
    throw new Error("Link has ended; no further actions can be processed.");
  }
}
