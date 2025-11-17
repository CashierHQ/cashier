import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";

// State when the link ended
export class LinkEndedState implements LinkDetailState {
  readonly step = LinkStep.INACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  async createAction(): Promise<Action> {
    console.log("Link ID:", this.#linkDetailStore);
    throw new Error("Link has ended; no further actions can be created.");
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Link has ended; no further actions can be processed.");
  }
}
