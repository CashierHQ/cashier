import { cashierBackendService } from "$modules/links/services/cashierBackend";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { LinkDetailStep } from "./linkStep";
import { linkListStore } from "../linkListStore.svelte";

// State when the link active and ready for use
export class LinkActiveState implements LinkDetailState {
  readonly step = LinkDetailStep.ACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // create action for using link
  async createAction(actionType: ActionTypeValue): Promise<void> {
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
  }

  // process the action for use link
  async processAction(actionId: string): Promise<void> {
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
  }
}
