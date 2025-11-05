import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkStore.svelte";

// State when the link has been successfully inactive
export class LinkEndedState implements LinkCreationState {
  readonly step = LinkStep.ENDED;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  // No next state from the Ended state
  async goNext(): Promise<void> {
    console.log("No next state from Ended", this.#link);
    throw new Error("No next state from Ended");
  }

  // No previous state from the Ended state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Ended");
  }
}
