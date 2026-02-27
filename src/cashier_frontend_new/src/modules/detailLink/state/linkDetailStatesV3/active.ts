import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import { ActionType } from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { Action as SharedAction } from "$shared";

// State when the link active and ready for use
export class LinkActiveStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.ACTIVE;
  #linkDetailStore: LinkDetailStoreV3;

  constructor(link: LinkDetailStoreV3) {
    this.#linkDetailStore = link;
  }

  // create action for using link
  async createAction(action: SharedAction): Promise<CreateActionResultV3> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    if (
      action.action_type !== ActionType.RECEIVE &&
      action.action_type !== ActionType.SEND
    ) {
      throw new Error("Invalid action type for Active state");
    }

    const actionRes = await cashierBackendService.createActionV3({
      link_id: link.id,
      action,
    });
    if (actionRes.isErr()) {
      throw new Error(`Failed to create action: ${actionRes.error}`);
    }

    // Refresh link detail to get the new action
    this.#linkDetailStore.query.refresh();
    return actionRes.unwrap();
  }

  // process the action for use link
  async processAction(): Promise<ProcessActionResultV3> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }

    if (!this.#linkDetailStore.action) {
      throw new Error("Action is missing");
    }

    const actionType = this.#linkDetailStore.action.action_type;
    if (actionType !== ActionType.RECEIVE && actionType !== ActionType.SEND) {
      throw new Error("Invalid action type for Active state");
    }

    const actionId = this.#linkDetailStore.action.id;
    const result = await cashierBackendService.processActionV3(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to process action: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
    return result.unwrap();
  }
}
