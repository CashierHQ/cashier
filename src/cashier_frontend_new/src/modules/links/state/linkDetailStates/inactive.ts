import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionType } from "$modules/links/types/action/actionType";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { LinkDetailStep } from "./linkStep";
import { linkListStore } from "../linkListStore.svelte";

// State when the link inactive
export class LinkInactiveState implements LinkDetailState {
  readonly step = LinkDetailStep.INACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // inactive only create withdraw action
  async createAction(): Promise<void> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }
    const actionRes = await cashierBackendService.createActionV2({
      linkId: link.id,
      actionType: ActionType.WITHDRAW,
    });
    if (actionRes.isErr()) {
      throw actionRes.error;
    }

    this.#linkDetailStore.query.refresh();
  }

  // process withdraw action
  async processAction(): Promise<void> {
    const link = this.#linkDetailStore.link;
    const action = this.#linkDetailStore.action;
    if (!link) {
      throw new Error("Link is missing");
    }
    if (!(action && action.id)) {
      throw new Error("Action ID is missing");
    }
    const result = await cashierBackendService.processActionV2(action.id);
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
  }
}
