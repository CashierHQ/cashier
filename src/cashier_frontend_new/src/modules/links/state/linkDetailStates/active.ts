import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionTypeMapper } from "$modules/links/types/action/actionType";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { LinkDetailStep } from "./linkStep";
import { linkListStore } from "../linkListStore.svelte";
import { ActionMapper } from "$modules/links/types/action/action";
import { LinkMapper } from "$modules/links/types/link/link";

// State when the link active and ready for use
export class LinkActiveState implements LinkDetailState {
  readonly step = LinkDetailStep.ACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // create action for using link
  async createAction(): Promise<void> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }

    const link = this.#linkDetailStore.link;
    // derive action type from link type
    const actionType = ActionTypeMapper.fromLinkType(link.link_type);
    const actionRes = await cashierBackendService.createActionV2({
      linkId: link.id,
      actionType,
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

  // process the action for use link
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
    this.#linkDetailStore.link = LinkMapper.fromBackendType(result.value.link);
    this.#linkDetailStore.action = ActionMapper.fromBackendType(
      result.value.action,
    );
    linkListStore.refresh();
  }
}
