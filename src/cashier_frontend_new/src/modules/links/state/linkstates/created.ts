import { LinkStep } from "$modules/links/types";
import { type LinkState } from ".";
import { LinkStore } from "../linkStore.svelte";

export class LinkCreatedState implements LinkState {
  readonly step = LinkStep.CREATED;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    throw new Error("No next state from Created");
  }

  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
