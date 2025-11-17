import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import type Action from "$modules/links/types/action/action";
import {
  ActionMapper,
  ProcessActionResultMapper,
  type ProcessActionResult,
} from "$modules/links/types/action/action";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";

// State when the link active and ready for use
export class LinkActiveState implements LinkDetailState {
  readonly step = LinkStep.ACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // create action for using link
  async createAction(actionType: ActionTypeValue): Promise<Action> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    if (actionType !== ActionType.RECEIVE && actionType !== ActionType.SEND) {
      throw new Error("Invalid action type for Active state");
    }

    const actionRes = await cashierBackendService.createActionV2({
      linkId: link.id,
      actionType,
    });
    if (actionRes.isErr()) {
      throw actionRes.error;
    }
    // Refresh link detail to get the new action
    this.#linkDetailStore.query.refresh();
    return ActionMapper.fromBackendType(actionRes.unwrap());
  }

  // process the action for use link
  async processAction(actionId: string): Promise<ProcessActionResult> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    const result = await cashierBackendService.processActionV2(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();

    return ProcessActionResultMapper.fromBackendType(result.unwrap());
  }
}
