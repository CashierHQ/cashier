import type { ProcessActionResult } from "$modules/links/types/action/action";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkCreationStore.svelte";

// State when the link has been successfully active
export class LinkActiveState implements LinkCreationState {
  readonly step = LinkStep.ACTIVE;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    throw new Error(
      "Cannot go next on LinkCreationState use LinkDetailState instead: " +
        this.#link.id,
    );
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }

  async processAction(actionId: string): Promise<ProcessActionResult> {
    throw new Error("Active state does not support processing actions.");
  }
}
