import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { LinkDetailStep } from "./linkStep";

// State when the link ended
export class LinkEndedState implements LinkDetailState {
  readonly step = LinkDetailStep.INACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  async createAction(): Promise<void> {
    console.log("Link ID:", this.#linkDetailStore);
    throw new Error("Link has ended; no further actions can be created.");
  }

  async processAction(): Promise<void> {
    throw new Error("Link has ended; no further actions can be processed.");
  }
}
