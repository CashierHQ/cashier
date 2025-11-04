import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionType } from "$modules/links/types/action/actionType";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { linkListStore } from "../linkListStore.svelte";
import { LinkActiveState } from "./active";
import { LinkDetailStep } from "./linkStep";

// State when the link has been successfully created
export class LinkCreatedState implements LinkDetailState {
  readonly step = LinkDetailStep.CREATED;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // Creating action is not supported in created state
  async createAction(): Promise<void> {
    throw new Error("Created state does not support creating actions.");
  }

  // Process the action to activate the link
  async processAction(): Promise<void> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    const action = this.#linkDetailStore.action;
    if (!action || !action.id) {
      throw new Error("Action ID is missing");
    }

    if (action.type != ActionType.CREATE_LINK) {
      throw new Error("Invalid action type for Created state");
    }
    const result = await cashierBackendService.processActionV2(action.id);
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
    this.#linkDetailStore.state = new LinkActiveState(this.#linkDetailStore);
  }
}
