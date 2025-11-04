import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionTypeMapper } from "$modules/links/types/action/actionType";
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
  async createAction(): Promise<void> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }
    // derive action type from link type
    const actionType = ActionTypeMapper.fromLinkType(link.link_type);
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
