import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionType } from "$modules/links/types/action/actionType";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { LinkDetailStep } from "./linkStep";
import { linkListStore } from "../linkListStore.svelte";
import { ActionMapper } from "$modules/links/types/action/action";

// State when the link inactive
export class LinkInactiveState implements LinkDetailState {
  readonly step = LinkDetailStep.INACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // inactive only create withdraw action
  async createAction(): Promise<void> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }
    const actionRes = await cashierBackendService.createActionV2({
      linkId: this.#linkDetailStore.link.id,
      actionType: ActionType.WITHDRAW,
    });
    if (actionRes.isErr()) {
      throw actionRes.error;
    }
    this.#linkDetailStore.action = ActionMapper.fromBackendType(
      actionRes.value,
    );
    // Refresh link detail to get the new action
    this.#linkDetailStore.query.refresh();
  }

  // process withdraw action
  async processAction(): Promise<void> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }
    if (!(this.#linkDetailStore.action && this.#linkDetailStore.action.id)) {
      throw new Error("Action ID is missing");
    }
    const result = await cashierBackendService.processActionV2(
      this.#linkDetailStore.action.id,
    );
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();
  }
}
