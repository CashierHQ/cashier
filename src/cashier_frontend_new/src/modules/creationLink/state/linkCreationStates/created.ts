import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkCreationStore.svelte";

// State when the link has been successfully created
export class LinkCreatedState implements LinkCreationState {
  readonly step = LinkStep.CREATED;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    throw new Error("No next state from Created");
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
