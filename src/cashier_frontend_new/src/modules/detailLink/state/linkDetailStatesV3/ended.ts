import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { LinkStep } from "$modules/links/types/linkStep";
import type { ActionType as SharedActionType } from "$shared";

// State when the link ended
export class LinkEndedStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.INACTIVE;

  async createAction(
    actionType: SharedActionType,
  ): Promise<CreateActionResultV3> {
    throw new Error(
      `Creating ${actionType} action is not supported in Ended state`,
    );
  }

  async processAction(): Promise<ProcessActionResultV3> {
    throw new Error("Link has ended; no further actions can be processed.");
  }
}
