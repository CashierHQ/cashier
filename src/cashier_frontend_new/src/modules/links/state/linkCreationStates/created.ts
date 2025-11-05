import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import { linkListStore } from "../linkListStore.svelte";
import type { LinkCreationStore } from "../linkCreationStore.svelte";
import { LinkActiveState } from "./active";

// State when the link has been successfully created
export class LinkCreatedState implements LinkCreationState {
  readonly step = LinkStep.CREATED;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (!this.#link.id) {
      throw new Error("Link ID is missing");
    }
    if (!(this.#link.action && this.#link.action.id)) {
      throw new Error("Action ID is missing");
    }
    const result = await cashierBackendService.processActionV2(
      this.#link.action.id,
    );
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();

    this.#link.state = new LinkActiveState();
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
