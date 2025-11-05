import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkStore.svelte";
import { LinkInactiveState } from "./inactive";

// State when the link has been successfully active
export class LinkActiveState implements LinkCreationState {
  readonly step = LinkStep.ACTIVE;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (!this.#link.id) {
      throw new Error("Link ID is missing");
    }

    const result = await cashierBackendService.disableLinkV2(this.#link.id);

    if (result.isErr()) {
      throw new Error(`Failed to active link: ${result.error}`);
    }

    this.#link.state = new LinkInactiveState(this.#link);
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
