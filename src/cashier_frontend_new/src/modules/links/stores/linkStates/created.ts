import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkState } from ".";
import type { LinkStore } from "../linkStore.svelte";

// State when the link has been successfully created
export class LinkCreatedState implements LinkState {
  readonly step = LinkStep.CREATED;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  // No next state from the created state
  async goNext(): Promise<void> {
    console.log("No next state from Created", this.#link);
    throw new Error("No next state from Created");
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
