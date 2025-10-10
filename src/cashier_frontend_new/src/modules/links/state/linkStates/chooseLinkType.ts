import { LinkStep } from "$modules/links/types/linkStep";
import { LinkType } from "$modules/links/types/linkType";
import type { LinkState } from ".";
import type { LinkStore } from "../linkStore.svelte";
import { AddAssetState } from "./addAsset";

// State when the user is choosing the type of link to create
export class ChooseLinkTypeState implements LinkState {
  readonly step = LinkStep.CHOOSE_TYPE;
  #link: LinkStore;

  // Initialize with the link store
  constructor(link: LinkStore) {
    this.#link = link;
  }

  // Validate the title and link type, then move to the next state
  async goNext(): Promise<void> {
    if (this.#link.title.trim() === "") {
      throw new Error("Title is required to proceed");
    }

    if (this.#link.linkType !== LinkType.TIP) {
      throw new Error("Only Tip link type is supported currently");
    }

    this.#link.state = new AddAssetState(this.#link);
  }

  // No previous state from the initial state
  async goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }
}
