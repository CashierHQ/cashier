import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import type Action from "$modules/links/types/action/action";
import {
  ProcessActionResultMapper,
  type ProcessActionResult,
} from "$modules/links/types/action/action";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { LinkActiveState } from "./active";

// State when the link has been successfully created
export class LinkCreatedState implements LinkDetailState {
  readonly step = LinkStep.CREATED;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // Creating action is not supported in created state
  async createAction(): Promise<Action> {
    throw new Error("Created state does not support creating actions.");
  }

  // Process the action to activate the link
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
    this.#linkDetailStore.state = new LinkActiveState(this.#linkDetailStore);
    return ProcessActionResultMapper.fromBackendType(result.unwrap());
  }
}
