import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkStore.svelte";

// State when the link has been successfully active
export class LinkActiveState implements LinkCreationState {
  readonly step = LinkStep.ACTIVE;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    console.log(
      "Cannot go next on LinkCreationState use LinkDetailState instead",
      this.#link,
    );
    throw new Error(
      "Cannot go next on LinkCreationState use LinkDetailState instead",
    );
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
