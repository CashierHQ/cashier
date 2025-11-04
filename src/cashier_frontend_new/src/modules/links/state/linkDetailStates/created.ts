import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionMapper } from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import { LinkMapper } from "$modules/links/types/link/link";
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
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }
    if (!(this.#linkDetailStore.action && this.#linkDetailStore.action.id)) {
      throw new Error("Action ID is missing");
    }
    if (this.#linkDetailStore.action.type != ActionType.CREATE_LINK) {
      throw new Error("Invalid action type for Created state");
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
    this.#linkDetailStore.state = new LinkActiveState(this.#linkDetailStore);
  }
}
