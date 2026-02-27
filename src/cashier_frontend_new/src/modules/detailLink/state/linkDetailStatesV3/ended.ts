import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { LinkStep } from "$modules/links/types/linkStep";
import type { Action as SharedAction } from "$shared";

// State when the link ended
export class LinkEndedStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.INACTIVE;
  #linkDetailStore: LinkDetailStoreV3;

  constructor(link: LinkDetailStoreV3) {
    this.#linkDetailStore = link;
  }

  async createAction(action: SharedAction): Promise<CreateActionResultV3> {
    throw new Error(
      `Creating ${action.action_type} action is not supported in Ended state`,
    );
  }

  async processAction(): Promise<ProcessActionResultV3> {
    throw new Error("Link has ended; no further actions can be processed.");
  }
}
